package com.plateforme.admin.controller;

import com.plateforme.admin.dto.AdminDtos.*;
import com.plateforme.catalogue.entity.ServiceOffer;
import com.plateforme.catalogue.repository.ServiceOfferRepository;
import com.plateforme.common.dto.ApiResponse;
import com.plateforme.common.dto.PageResponse;
import com.plateforme.common.exception.ResourceNotFoundException;
import com.plateforme.negotiation.repository.NegotiationRepository;
import com.plateforme.subscription.entity.ProviderSubscription;
import com.plateforme.subscription.repository.ProviderSubscriptionRepository;
import com.plateforme.users.entity.ProviderProfile;
import com.plateforme.users.entity.User;
import com.plateforme.users.repository.ProviderProfileRepository;
import com.plateforme.users.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Administration")
@Slf4j
public class AdminController {

    private final UserRepository userRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final ProviderSubscriptionRepository subscriptionRepository;
    private final ServiceOfferRepository serviceOfferRepository;
    private final NegotiationRepository negotiationRepository;

    // ===== Dashboard =====

    @Operation(summary = "Statistiques globales du back-office")
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardStats>> getDashboard() {
        long totalUsers      = userRepository.count();
        long totalProviders  = userRepository.countByRole(User.Role.PROVIDER);
        long totalClients    = userRepository.countByRole(User.Role.CLIENT);
        long activeSubs      = subscriptionRepository.countByStatus(ProviderSubscription.Status.ACTIVE);
        long trialSubs       = subscriptionRepository.countByStatus(ProviderSubscription.Status.TRIAL);
        long totalServices   = serviceOfferRepository.count();
        long publishedSvcs   = serviceOfferRepository.countByStatus(ServiceOffer.Status.PUBLISHED);
        long totalNegos      = negotiationRepository.count();

        // Revenus estimés : somme des prix des abonnements actifs
        BigDecimal revenue   = subscriptionRepository.sumActivePlanPrices();

        DashboardStats stats = DashboardStats.builder()
                .totalUsers(totalUsers)
                .totalProviders(totalProviders)
                .totalClients(totalClients)
                .activeSubscriptions(activeSubs)
                .trialSubscriptions(trialSubs)
                .totalServices(totalServices)
                .publishedServices(publishedSvcs)
                .totalNegotiations(totalNegos)
                .estimatedMonthlyRevenue(revenue != null ? revenue : BigDecimal.ZERO)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    // ===== Utilisateurs =====

    @Operation(summary = "Liste paginée des utilisateurs")
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PageResponse<UserAdminResponse>>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<User> users = (role != null)
                ? userRepository.findByRole(User.Role.valueOf(role.toUpperCase()), pageable)
                : userRepository.findAll(pageable);

        Page<UserAdminResponse> result = users.map(u -> {
            UserAdminResponse.UserAdminResponseBuilder b = UserAdminResponse.builder()
                    .id(u.getId())
                    .email(u.getEmail())
                    .firstName(u.getFirstName())
                    .lastName(u.getLastName())
                    .phone(u.getPhone())
                    .role(u.getRole().name())
                    .isActive(u.isActive())
                    .emailVerified(u.isEmailVerified())
                    .createdAt(u.getCreatedAt());

            if (u.getRole() == User.Role.PROVIDER) {
                providerProfileRepository.findByUserId(u.getId()).ifPresent(pp -> {
                    b.companyName(pp.getCompanyName());
                    b.verified(pp.isVerified());
                });
                subscriptionRepository.findActiveByProviderId(u.getId()).ifPresent(sub ->
                        b.subscriptionStatus(sub.getStatus().name()));
            }
            return b.build();
        });

        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(result)));
    }

    @Operation(summary = "Activer / désactiver un compte utilisateur")
    @PatchMapping("/users/{id}/toggle")
    public ResponseEntity<ApiResponse<Void>> toggleUser(
            @PathVariable UUID id,
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody ToggleUserRequest request) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id));

        if (user.getRole() == User.Role.ADMIN) {
            throw new com.plateforme.common.exception.BusinessException(
                    "Impossible de modifier un compte admin");
        }

        user.setActive(request.isActive());
        userRepository.save(user);

        log.info("Admin {} a {} le compte {}", admin.getEmail(),
                request.isActive() ? "activé" : "désactivé", user.getEmail());

        return ResponseEntity.ok(ApiResponse.ok(
                "Compte " + (request.isActive() ? "activé" : "désactivé")));
    }

    @Operation(summary = "Vérifier / décocher un prestataire (badge vérifié)")
    @PatchMapping("/providers/{id}/verify")
    public ResponseEntity<ApiResponse<Void>> verifyProvider(
            @PathVariable UUID id,
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody VerifyProviderRequest request) {

        ProviderProfile profile = providerProfileRepository.findByUserId(id)
                .orElseThrow(() -> new ResourceNotFoundException("Profil prestataire", id));

        profile.setVerified(request.isVerified());
        if (request.isVerified()) {
            profile.setVerifiedAt(LocalDateTime.now());
        } else {
            profile.setVerifiedAt(null);
        }
        providerProfileRepository.save(profile);

        log.info("Admin {} a {} le prestataire userId={}",
                admin.getEmail(), request.isVerified() ? "vérifié" : "décoché", id);

        return ResponseEntity.ok(ApiResponse.ok(
                "Prestataire " + (request.isVerified() ? "vérifié" : "non-vérifié")));
    }

    // ===== Abonnements =====

    @Operation(summary = "Liste paginée des abonnements")
    @GetMapping("/subscriptions")
    public ResponseEntity<ApiResponse<PageResponse<SubscriptionAdminResponse>>> getSubscriptions(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<ProviderSubscription> subs = (status != null)
                ? subscriptionRepository.findByStatus(
                ProviderSubscription.Status.valueOf(status.toUpperCase()), pageable)
                : subscriptionRepository.findAll(pageable);

        Page<SubscriptionAdminResponse> result = subs.map(sub -> {
            String company = providerProfileRepository
                    .findByUserId(sub.getProvider().getId())
                    .map(ProviderProfile::getCompanyName)
                    .orElse("—");
            return SubscriptionAdminResponse.builder()
                    .id(sub.getId())
                    .providerId(sub.getProvider().getId())
                    .providerEmail(sub.getProvider().getEmail())
                    .providerCompany(company)
                    .planName(sub.getPlan().getName())
                    .status(sub.getStatus().name())
                    .startDate(sub.getStartDate())
                    .endDate(sub.getEndDate())
                    .paypalSubscriptionId(sub.getPaypalSubscriptionId())
                    .createdAt(sub.getCreatedAt())
                    .build();
        });

        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(result)));
    }

    @Operation(summary = "Modifier manuellement le statut d'un abonnement")
    @PatchMapping("/subscriptions/{id}")
    public ResponseEntity<ApiResponse<Void>> updateSubscription(
            @PathVariable UUID id,
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody UpdateSubscriptionStatusRequest request) {

        ProviderSubscription sub = subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Abonnement", id));

        ProviderSubscription.Status newStatus =
                ProviderSubscription.Status.valueOf(request.getStatus().toUpperCase());
        sub.setStatus(newStatus);
        if (request.getReason() != null) {
            sub.setCancellationReason(request.getReason());
        }
        if (newStatus == ProviderSubscription.Status.CANCELLED) {
            sub.setCancelledAt(java.time.LocalDateTime.now());
        }
        subscriptionRepository.save(sub);

        // Sync visibilité services
        if (newStatus == ProviderSubscription.Status.ACTIVE
                || newStatus == ProviderSubscription.Status.TRIAL) {
            serviceOfferRepository.publishAllHiddenByProviderId(sub.getProvider().getId());
        } else if (newStatus == ProviderSubscription.Status.CANCELLED
                || newStatus == ProviderSubscription.Status.EXPIRED
                || newStatus == ProviderSubscription.Status.SUSPENDED) {
            serviceOfferRepository.hideAllByProviderId(sub.getProvider().getId());
        }

        log.info("Admin {} a mis l'abonnement {} en statut {}",
                admin.getEmail(), id, newStatus);

        return ResponseEntity.ok(ApiResponse.ok("Statut mis à jour : " + newStatus));
    }

    // ===== Services =====

    @Operation(summary = "Suspendre / réactiver un service (modération)")
    @PatchMapping("/services/{id}/suspend")
    public ResponseEntity<ApiResponse<Void>> suspendService(
            @PathVariable UUID id,
            @AuthenticationPrincipal User admin,
            @RequestParam(defaultValue = "true") boolean suspend) {

        ServiceOffer service = serviceOfferRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service", id));

        service.setStatus(suspend ? ServiceOffer.Status.SUSPENDED : ServiceOffer.Status.PUBLISHED);
        serviceOfferRepository.save(service);

        log.info("Admin {} a {} le service {}", admin.getEmail(),
                suspend ? "suspendu" : "réactivé", id);

        return ResponseEntity.ok(ApiResponse.ok(
                "Service " + (suspend ? "suspendu" : "réactivé")));
    }
}