package com.plateforme.subscription.repository;

import com.plateforme.subscription.entity.ProviderSubscription;
import com.plateforme.subscription.entity.SubscriptionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, UUID> {

    List<SubscriptionPlan> findByIsActiveTrueOrderByPriceAsc();

    Optional<SubscriptionPlan> findByPaypalPlanId(String paypalPlanId);
}
