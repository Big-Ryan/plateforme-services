package com.plateforme.admin.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.plateforme.subscription.entity.ProviderSubscription;
import com.plateforme.users.entity.User;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class AdminDtos {

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class UserAdminResponse {
        private UUID id;
        private String email;
        private String firstName;
        private String lastName;
        private String phone;
        private String role;
        @com.fasterxml.jackson.annotation.JsonProperty("isActive")
        private boolean isActive;
        private boolean emailVerified;
        private LocalDateTime createdAt;
        // Prestataire
        private String companyName;
        private boolean verified;
        private String subscriptionStatus;
    }

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class SubscriptionAdminResponse {
        private UUID id;
        private UUID providerId;
        private String providerEmail;
        private String providerCompany;
        private String planName;
        private String status;
        private LocalDate startDate;
        private LocalDate endDate;
        private String paypalSubscriptionId;
        private LocalDateTime createdAt;
    }

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DashboardStats {
        private long totalUsers;
        private long totalProviders;
        private long totalClients;
        private long activeSubscriptions;
        private long trialSubscriptions;
        private long totalServices;
        private long publishedServices;
        private long totalNegotiations;
        private BigDecimal estimatedMonthlyRevenue;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ToggleUserRequest {
        private boolean active;
        private String reason;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyProviderRequest {
        private boolean verified;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateSubscriptionStatusRequest {
        private String status;
        private String reason;
    }
}