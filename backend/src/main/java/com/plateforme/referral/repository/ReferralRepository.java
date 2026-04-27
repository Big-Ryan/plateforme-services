package com.plateforme.referral.repository;

import com.plateforme.referral.entity.ReferralReward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReferralRepository extends JpaRepository<ReferralReward, UUID> {

    List<ReferralReward> findByReferrerIdOrderByCreatedAtDesc(UUID referrerId);

    Optional<ReferralReward> findByReferredId(UUID referredId);

    @Query("SELECT COUNT(r) FROM ReferralReward r WHERE r.referrer.id = :referrerId AND r.status = 'VALIDATED'")
    long countValidatedByReferrerId(@Param("referrerId") UUID referrerId);

    boolean existsByReferredId(UUID referredId);
}