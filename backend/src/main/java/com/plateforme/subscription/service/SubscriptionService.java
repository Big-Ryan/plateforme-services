package com.plateforme.subscription.service;

import com.plateforme.catalogue.repository.ServiceOfferRepository;
import com.plateforme.common.exception.BusinessException;
import com.plateforme.common.exception.ResourceNotFoundException;
import com.plateforme.subscription.dto.SubscriptionDtos.*;
import com.plateforme.subscription.entity.ProviderSubscription;
import com.plateforme.subscription.entity.SubscriptionPlan;
import com.plateforme.subscription.repository.ProviderSubscriptionRepository;
import com.plateforme.subscription.repository.SubscriptionPlanRepository;
import com.plateforme.users.entity.User;
import com.plateforme.payment.service.PayPalApiService;
import com.plateforme.referral.service.ReferralService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final ProviderSubscriptionRepository subscriptionRepository;
    private final ServiceOfferRepository serviceOfferRepository;
    private final SubscriptionNotificationService notificationService;
    private final PayPalApiService payPalApiService;
    private final ReferralService referralService;

    // ===== Plans =====

    @Transactional(readOnly = true)
    public List<PlanResponse> getActivePlans() {
        return planRepository.findByIsActiveTrueOrderByPriceAsc()
                .stream()
                .map(PlanResponse::from)
                .collect(Collectors.toList());
    }

    // ===== Abonnement courant =====

    @Transactional(readOnly = true)
    public Optional<SubscriptionResponse> getCurrentSubscription(UUID providerId) {
        return subscriptionRepository.findActiveByProviderId(providerId)
                .map(SubscriptionResponse::from);
    }

    // ===== Souscrire (démarre essai ou redirige vers PayPal) =====

    @Transactional
    public SubscribeResponse subscribe(User provider, UUID planId) {
        // Vérifie pas d'abonnement actif existant
        // Les PENDING de plus de 30 min sont ignorés (paiement abandonné)
        boolean hasActive = subscriptionRepository.existsByProviderIdAndStatusIn(
                provider.getId(),
                List.of(ProviderSubscription.Status.ACTIVE,
                        ProviderSubscription.Status.TRIAL));

        if (hasActive) {
            throw new BusinessException(
                    "Vous avez déjà un abonnement actif.");
        }

        // Annuler les éventuels PENDING expirés
        subscriptionRepository.cancelExpiredPending(
                provider.getId(),
                java.time.LocalDateTime.now().minusMinutes(30));

        SubscriptionPlan plan = planRepository.findById(planId)
                .filter(SubscriptionPlan::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Plan", planId));

        // Vérifier que le plan a un ID PayPal configuré
        if (plan.getPaypalPlanId() == null || plan.getPaypalPlanId().isBlank()) {
            throw new BusinessException(
                    "Ce plan n'est pas encore configuré pour le paiement. Contactez l'administrateur.");
        }

        // Sinon → créer abonnement PENDING et appeler PayPal
        ProviderSubscription pending = ProviderSubscription.builder()
                .provider(provider)
                .plan(plan)
                .status(ProviderSubscription.Status.PENDING)
                .startDate(LocalDate.now())
                .build();

        pending = subscriptionRepository.save(pending);

        // Appel PayPal pour créer l'abonnement
        PayPalApiService.PayPalSubscriptionResult result = payPalApiService
                .createSubscription(plan.getPaypalPlanId(), pending.getId().toString());

        // Stocker l'ID PayPal
        pending.setPaypalSubscriptionId(result.paypalSubscriptionId());
        subscriptionRepository.save(pending);

        log.info("Abonnement PENDING créé pour providerId={}, paypalSubId={}",
                provider.getId(), result.paypalSubscriptionId());

        return SubscribeResponse.builder()
                .subscriptionId(pending.getId())
                .status("PENDING")
                .requiresPayment(true)
                .approvalUrl(result.approvalUrl())
                .message("Redirigez vers PayPal pour finaliser le paiement")
                .build();
    }

    // ===== Exécution après retour PayPal (Subscriptions API) =====

    @Transactional
    public void executeAgreement(String subscriptionId) {
        // Avec l'API Subscriptions, PayPal retourne le subscription_id dans l'URL
        // On cherche l'abonnement PENDING correspondant et on le confirme
        log.info("Confirmation abonnement PayPal subscription_id={}", subscriptionId);

        // Chercher par paypalSubscriptionId ou laisser le webhook activer
        subscriptionRepository.findByPaypalSubscriptionId(subscriptionId)
                .ifPresent(sub -> {
                    if (sub.getStatus() == ProviderSubscription.Status.PENDING) {
                        // Pré-activation en attente de confirmation webhook
                        log.info("Abonnement {} en attente de confirmation webhook", subscriptionId);
                    }
                });
    }

    // ===== Activation via webhook PayPal =====

    @Transactional
    public void activateSubscription(String paypalSubscriptionId) {
        ProviderSubscription sub = subscriptionRepository
                .findByPaypalSubscriptionId(paypalSubscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Abonnement PayPal", paypalSubscriptionId));

        // Si le plan a des jours d'essai ET que c'est le premier abonnement → TRIAL
        // Sinon → ACTIVE directement
        boolean firstSubscription = subscriptionRepository
                .countByProviderId(sub.getProvider().getId()) <= 1;

        if (sub.getPlan().getTrialDays() > 0 && firstSubscription) {
            sub.setStatus(ProviderSubscription.Status.TRIAL);
            sub.setTrialEndDate(LocalDate.now().plusDays(sub.getPlan().getTrialDays()));
            sub.setEndDate(LocalDate.now().plusDays(sub.getPlan().getTrialDays()));
            log.info("Essai démarré après approbation PayPal : paypalId={}", paypalSubscriptionId);
        } else {
            sub.setStatus(ProviderSubscription.Status.ACTIVE);
            if (sub.getEndDate() == null) {
                sub.setEndDate(calculateEndDate(sub.getPlan().getBillingPeriod()));
            }
            log.info("Abonnement activé : paypalId={}, providerId={}",
                    paypalSubscriptionId, sub.getProvider().getId());
        }

        subscriptionRepository.save(sub);

        // Active les services du prestataire
        serviceOfferRepository.publishAllHiddenByProviderId(sub.getProvider().getId());

        // Valider le parrainage si c'est le premier abonnement
        boolean isFirst = subscriptionRepository.countByProviderId(sub.getProvider().getId()) <= 1;
        if (isFirst) {
            referralService.validateReferral(sub.getProvider().getId());
        }

        notificationService.sendSubscriptionActivated(
                sub.getProvider(), sub.getPlan(), sub.getStartDate(), sub.getEndDate());
    }

    @Transactional
    public void renewSubscription(String paypalSubscriptionId) {
        ProviderSubscription sub = subscriptionRepository
                .findByPaypalSubscriptionId(paypalSubscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Abonnement PayPal", paypalSubscriptionId));

        sub.setStatus(ProviderSubscription.Status.ACTIVE);
        sub.setEndDate(calculateEndDate(sub.getPlan().getBillingPeriod()));
        subscriptionRepository.save(sub);
        log.info("Abonnement renouvelé : paypalId={}", paypalSubscriptionId);
    }

    @Transactional
    public void cancelSubscription(String paypalSubscriptionId, String reason) {
        ProviderSubscription sub = subscriptionRepository
                .findByPaypalSubscriptionId(paypalSubscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Abonnement PayPal", paypalSubscriptionId));

        sub.setStatus(ProviderSubscription.Status.CANCELLED);
        sub.setCancelledAt(java.time.LocalDateTime.now());
        sub.setCancellationReason(reason);
        subscriptionRepository.save(sub);

        serviceOfferRepository.hideAllByProviderId(sub.getProvider().getId());
        log.info("Abonnement annulé : paypalId={}", paypalSubscriptionId);
    }

    @Transactional
    public void suspendSubscription(String paypalSubscriptionId) {
        ProviderSubscription sub = subscriptionRepository
                .findByPaypalSubscriptionId(paypalSubscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Abonnement PayPal", paypalSubscriptionId));

        sub.setStatus(ProviderSubscription.Status.SUSPENDED);
        subscriptionRepository.save(sub);
        serviceOfferRepository.hideAllByProviderId(sub.getProvider().getId());
        log.warn("Abonnement suspendu : paypalId={}", paypalSubscriptionId);
    }

    // ===== Checks pour les autres modules =====

    @Transactional(readOnly = true)
    public boolean hasActiveSubscription(UUID providerId) {
        return subscriptionRepository.existsByProviderIdAndStatusIn(
                providerId,
                List.of(ProviderSubscription.Status.ACTIVE, ProviderSubscription.Status.TRIAL));
    }

    @Transactional(readOnly = true)
    public int getMaxServices(UUID providerId) {
        return subscriptionRepository.findActiveByProviderId(providerId)
                .map(s -> s.getPlan().getMaxServices())
                .orElse(0);
    }

    // ===== Tâches planifiées =====

    @Scheduled(cron = "0 0 1 * * *") // Chaque nuit à 1h
    @Transactional
    public void processExpiredSubscriptions() {
        LocalDate today = LocalDate.now();

        // Expirer les abonnements dépassés
        List<ProviderSubscription> expired = subscriptionRepository.findExpiredToProcess(today);
        for (ProviderSubscription sub : expired) {
            sub.setStatus(ProviderSubscription.Status.EXPIRED);
            subscriptionRepository.save(sub);
            serviceOfferRepository.hideAllByProviderId(sub.getProvider().getId());
            notificationService.sendSubscriptionExpired(sub.getProvider(), sub.getPlan());
            log.info("Abonnement expiré traité : id={}", sub.getId());
        }

        // Expirer les essais
        List<ProviderSubscription> expiredTrials = subscriptionRepository.findExpiredTrials(today);
        for (ProviderSubscription trial : expiredTrials) {
            trial.setStatus(ProviderSubscription.Status.EXPIRED);
            subscriptionRepository.save(trial);
            serviceOfferRepository.hideAllByProviderId(trial.getProvider().getId());
            notificationService.sendTrialExpired(trial.getProvider(), trial.getPlan());
            log.info("Essai expiré traité : id={}", trial.getId());
        }

        // Rappels J-3 et J-1
        sendExpiryReminders(today.plusDays(3));
        sendExpiryReminders(today.plusDays(1));
    }

    private void sendExpiryReminders(LocalDate targetDate) {
        subscriptionRepository.findExpiringOn(targetDate).forEach(sub ->
                notificationService.sendExpiryReminder(
                        sub.getProvider(), sub.getPlan(), sub.getEndDate())
        );
    }

    private LocalDate calculateEndDate(SubscriptionPlan.BillingPeriod period) {
        return switch (period) {
            case MONTHLY   -> LocalDate.now().plusMonths(1);
            case QUARTERLY -> LocalDate.now().plusMonths(3);
            case ANNUAL    -> LocalDate.now().plusYears(1);
        };
    }
}