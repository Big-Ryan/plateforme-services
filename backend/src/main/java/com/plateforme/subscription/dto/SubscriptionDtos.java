package com.plateforme.subscription.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.plateforme.subscription.entity.ProviderSubscription;
import com.plateforme.subscription.entity.SubscriptionPlan;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

public class SubscriptionDtos {

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class PlanResponse {
        private UUID id;
        private String name;
        private String billingPeriod;
        private BigDecimal price;
        private String currency;
        private int trialDays;
        private int maxServices;
        private Map<String, Object> features;

        public static PlanResponse from(SubscriptionPlan p) {
            return PlanResponse.builder()
                    .id(p.getId())
                    .name(p.getName())
                    .billingPeriod(p.getBillingPeriod().name())
                    .price(p.getPrice())
                    .currency(p.getCurrency())
                    .trialDays(p.getTrialDays())
                    .maxServices(p.getMaxServices())
                    .features(p.getFeatures())
                    .build();
        }
    }

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class SubscriptionResponse {
        private UUID id;
        private String status;
        private LocalDate startDate;
        private LocalDate endDate;
        private LocalDate trialEndDate;
        private boolean inTrial;
        private PlanResponse plan;
        private String paypalSubscriptionId;
        private LocalDateTime createdAt;

        public static SubscriptionResponse from(ProviderSubscription s) {
            return SubscriptionResponse.builder()
                    .id(s.getId())
                    .status(s.getStatus().name())
                    .startDate(s.getStartDate())
                    .endDate(s.getEndDate())
                    .trialEndDate(s.getTrialEndDate())
                    .inTrial(s.isInTrial())
                    .plan(PlanResponse.from(s.getPlan()))
                    .paypalSubscriptionId(s.getPaypalSubscriptionId())
                    .createdAt(s.getCreatedAt())
                    .build();
        }
    }

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class SubscribeResponse {
        private UUID subscriptionId;
        private String status;
        private LocalDate trialEndDate;
        private boolean requiresPayment;
        private String approvalUrl; // URL PayPal si paiement requis
        private String message;
    }
}
