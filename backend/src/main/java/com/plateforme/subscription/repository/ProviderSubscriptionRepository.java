package com.plateforme.subscription.repository;

import com.plateforme.subscription.entity.ProviderSubscription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProviderSubscriptionRepository extends JpaRepository<ProviderSubscription, UUID> {

    // Abonnement actif courant d'un prestataire
    @Query("""
        SELECT ps FROM ProviderSubscription ps
        JOIN FETCH ps.plan
        WHERE ps.provider.id = :providerId
        AND ps.status IN ('ACTIVE', 'TRIAL')
        ORDER BY ps.createdAt DESC
        """)
    Optional<ProviderSubscription> findActiveByProviderId(@Param("providerId") UUID providerId);

    // Historique d'un prestataire
    Page<ProviderSubscription> findByProviderIdOrderByCreatedAtDesc(UUID providerId, Pageable pageable);

    // Via ID PayPal (pour les webhooks)
    Optional<ProviderSubscription> findByPaypalSubscriptionId(String paypalSubscriptionId);

    // Abonnements expirant dans N jours (pour les rappels email)
    @Query("""
        SELECT ps FROM ProviderSubscription ps
        JOIN FETCH ps.provider
        JOIN FETCH ps.plan
        WHERE ps.status = 'ACTIVE'
        AND ps.endDate IS NOT NULL
        AND ps.endDate = :targetDate
        """)
    List<ProviderSubscription> findExpiringOn(@Param("targetDate") LocalDate targetDate);

    // Abonnements expirés à traiter
    @Query("""
        SELECT ps FROM ProviderSubscription ps
        WHERE ps.status IN ('ACTIVE', 'TRIAL')
        AND ps.endDate < :today
        """)
    List<ProviderSubscription> findExpiredToProcess(@Param("today") LocalDate today);

    // Essais expirés
    @Query("""
        SELECT ps FROM ProviderSubscription ps
        WHERE ps.status = 'TRIAL'
        AND ps.trialEndDate < :today
        """)
    List<ProviderSubscription> findExpiredTrials(@Param("today") LocalDate today);

    boolean existsByProviderIdAndStatusIn(UUID providerId, List<ProviderSubscription.Status> statuses);

    // Vérifie si le prestataire a déjà eu AU MOINS UN abonnement (trial ou autre)
    boolean existsByProviderId(UUID providerId);

    long countByProviderId(UUID providerId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
            "UPDATE ProviderSubscription ps SET ps.status = 'CANCELLED' " +
                    "WHERE ps.provider.id = :providerId " +
                    "AND ps.status = 'PENDING' " +
                    "AND ps.createdAt < :cutoff")
    void cancelExpiredPending(
            @org.springframework.data.repository.query.Param("providerId") UUID providerId,
            @org.springframework.data.repository.query.Param("cutoff") java.time.LocalDateTime cutoff);

    long countByStatus(ProviderSubscription.Status status);

    org.springframework.data.domain.Page<ProviderSubscription> findByStatus(
            ProviderSubscription.Status status,
            org.springframework.data.domain.Pageable pageable);

    @Query("""
        SELECT COALESCE(SUM(ps.plan.price), 0)
        FROM ProviderSubscription ps
        WHERE ps.status IN ('ACTIVE', 'TRIAL')
        """)
    java.math.BigDecimal sumActivePlanPrices();
}