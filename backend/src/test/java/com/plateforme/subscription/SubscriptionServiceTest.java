package com.plateforme.subscription;

import com.plateforme.auth.dto.RegisterRequest;
import com.plateforme.auth.service.AuthService;
import com.plateforme.subscription.entity.ProviderSubscription;
import com.plateforme.subscription.entity.SubscriptionPlan;
import com.plateforme.subscription.repository.ProviderSubscriptionRepository;
import com.plateforme.subscription.repository.SubscriptionPlanRepository;
import com.plateforme.users.entity.User;
import com.plateforme.users.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("Subscription — Tests")
class SubscriptionServiceTest {

    @Autowired AuthService                    authService;
    @Autowired UserRepository                 userRepository;
    @Autowired SubscriptionPlanRepository     planRepository;
    @Autowired ProviderSubscriptionRepository subscriptionRepository;

    User             provider;
    SubscriptionPlan plan;

    @BeforeEach
    void setup() {
        // email, password, firstName, lastName, phone, referralCode, role, companyName, city
        authService.register(new RegisterRequest("sub_provider@test.cm", "Password123!", "Sub", "Provider",
                null, null, User.Role.PROVIDER, "Sub SARL", null), null, null);
        provider = userRepository.findByEmail("sub_provider@test.cm").orElseThrow();

        plan = planRepository.save(SubscriptionPlan.builder()
                .name("Test Plan").billingPeriod(SubscriptionPlan.BillingPeriod.MONTHLY)
                .price(new BigDecimal("30.00")).currency("USD")
                .trialDays(7).maxServices(5).isActive(true)
                .paypalPlanId("P-TEST123").build());
    }

    @Test @DisplayName("Plans actifs visibles")
    void activePlans_areListed() {
        assertThat(planRepository.findByIsActiveTrueOrderByPriceAsc()).isNotEmpty();
    }

    @Test @DisplayName("Plan récupérable par paypalPlanId")
    void plan_findByPaypalId() {
        Optional<SubscriptionPlan> found = planRepository.findByPaypalPlanId("P-TEST123");
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Test Plan");
    }

    @Test @DisplayName("Aucun abonnement au départ")
    void noSubscription_initially() {
        assertThat(subscriptionRepository.countByProviderId(provider.getId())).isZero();
    }

    @Test @DisplayName("Abonnement créé en PENDING")
    void subscription_createdAsPending() {
        ProviderSubscription sub = subscriptionRepository.save(
                ProviderSubscription.builder()
                        .provider(provider).plan(plan)
                        .status(ProviderSubscription.Status.PENDING)
                        .startDate(java.time.LocalDate.now())
                        .paypalSubscriptionId("I-TEST456").build());
        assertThat(sub.getId()).isNotNull();
        assertThat(sub.getStatus()).isEqualTo(ProviderSubscription.Status.PENDING);
    }
}