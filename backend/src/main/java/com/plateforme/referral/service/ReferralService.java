package com.plateforme.referral.service;

import com.plateforme.referral.entity.ReferralReward;
import com.plateforme.referral.repository.ReferralRepository;
import com.plateforme.users.entity.User;
import com.plateforme.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReferralService {

    private final ReferralRepository referralRepository;
    private final UserRepository userRepository;

    // ===== Paliers de récompense =====
    // 1-2 filleuls → Badge Ambassadeur
    // 3-4 filleuls → 1 mois offert au prochain renouvellement
    // 5+  filleuls → 20% de réduction permanente

    public enum RewardTier {
        NONE(0),
        AMBASSADOR(1),       // Badge
        ONE_MONTH_FREE(3),   // 1 mois offert
        DISCOUNT_20(5);      // 20% permanent

        public final int threshold;
        RewardTier(int t) { this.threshold = t; }
    }

    /**
     * Enregistre un parrainage lors de l'inscription d'un nouveau prestataire.
     */
    @Transactional
    public void registerReferral(User newProvider, String referralCode) {
        if (referralCode == null || referralCode.isBlank()) return;

        // Trouver le parrain par son code
        Optional<User> referrerOpt = userRepository.findByReferralCode(referralCode.toUpperCase());
        if (referrerOpt.isEmpty()) {
            log.warn("Code parrainage inconnu : {}", referralCode);
            return;
        }

        User referrer = referrerOpt.get();

        // Eviter l'auto-parrainage
        if (referrer.getId().equals(newProvider.getId())) return;

        // Vérifier que ce filleul n'a pas déjà un parrain
        if (referralRepository.existsByReferredId(newProvider.getId())) return;

        ReferralReward reward = ReferralReward.builder()
                .referrer(referrer)
                .referred(newProvider)
                .status(ReferralReward.Status.PENDING)
                .build();

        referralRepository.save(reward);

        // Lier le filleul au parrain
        newProvider.setReferredById(referrer.getId());
        userRepository.save(newProvider);

        log.info("Parrainage enregistré : referrer={} → referred={}",
                referrer.getId(), newProvider.getId());
    }

    /**
     * Valide un parrainage quand le filleul active son premier abonnement payant.
     * Appelé depuis le webhook PayPal.
     */
    @Transactional
    public void validateReferral(UUID referredUserId) {
        referralRepository.findByReferredId(referredUserId).ifPresent(reward -> {
            if (reward.getStatus() == ReferralReward.Status.PENDING) {
                reward.setStatus(ReferralReward.Status.VALIDATED);
                reward.setValidatedAt(LocalDateTime.now());
                referralRepository.save(reward);

                long validatedCount = referralRepository
                        .countValidatedByReferrerId(reward.getReferrer().getId());

                log.info("Parrainage validé : referrer={}, total filleuls={}",
                        reward.getReferrer().getId(), validatedCount);

                applyReward(reward.getReferrer(), validatedCount);
            }
        });
    }

    /**
     * Applique la récompense au parrain selon le palier atteint.
     */
    private void applyReward(User referrer, long validatedCount) {
        if (validatedCount >= RewardTier.DISCOUNT_20.threshold) {
            log.info("Palier 5+ atteint pour {} → 20% de réduction", referrer.getId());
            // La réduction sera appliquée au moment du renouvellement (vérifiée dans SubscriptionService)
        } else if (validatedCount >= RewardTier.ONE_MONTH_FREE.threshold) {
            log.info("Palier 3+ atteint pour {} → 1 mois offert", referrer.getId());
        } else if (validatedCount >= RewardTier.AMBASSADOR.threshold) {
            log.info("Palier 1+ atteint pour {} → Badge Ambassadeur", referrer.getId());
        }
    }

    /**
     * Retourne le palier actuel d'un prestataire.
     */
    @Transactional(readOnly = true)
    public ReferralStats getStats(UUID userId) {
        List<ReferralReward> rewards = referralRepository
                .findByReferrerIdOrderByCreatedAtDesc(userId);

        long validated = rewards.stream()
                .filter(r -> r.getStatus() == ReferralReward.Status.VALIDATED).count();
        long pending = rewards.stream()
                .filter(r -> r.getStatus() == ReferralReward.Status.PENDING).count();

        RewardTier currentTier = RewardTier.NONE;
        if (validated >= RewardTier.DISCOUNT_20.threshold)  currentTier = RewardTier.DISCOUNT_20;
        else if (validated >= RewardTier.ONE_MONTH_FREE.threshold) currentTier = RewardTier.ONE_MONTH_FREE;
        else if (validated >= RewardTier.AMBASSADOR.threshold) currentTier = RewardTier.AMBASSADOR;

        long nextThreshold = switch (currentTier) {
            case NONE      -> RewardTier.AMBASSADOR.threshold;
            case AMBASSADOR -> RewardTier.ONE_MONTH_FREE.threshold;
            case ONE_MONTH_FREE -> RewardTier.DISCOUNT_20.threshold;
            case DISCOUNT_20 -> -1; // Max atteint
        };

        return ReferralStats.builder()
                .validated(validated)
                .pending(pending)
                .currentTier(currentTier)
                .nextThreshold(nextThreshold)
                .toNextTier(nextThreshold > 0 ? nextThreshold - validated : 0)
                .build();
    }

    @lombok.Data @lombok.Builder
    public static class ReferralStats {
        private long validated;
        private long pending;
        private RewardTier currentTier;
        private long nextThreshold;
        private long toNextTier;
    }
}