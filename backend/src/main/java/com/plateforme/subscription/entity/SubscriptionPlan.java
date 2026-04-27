package com.plateforme.subscription.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "subscription_plans")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPlan {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_period", nullable = false, length = 20)
    private BillingPeriod billingPeriod;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(length = 3)
    @Builder.Default
    private String currency = "XAF";

    @Column(name = "trial_days", nullable = false)
    @Builder.Default
    private int trialDays = 0;

    @Column(name = "paypal_plan_id")
    private String paypalPlanId;

    @Column(name = "max_services", nullable = false)
    @Builder.Default
    private int maxServices = 10;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    // Stocké en JSON texte — pas besoin de librairie externe
    @Column(columnDefinition = "jsonb")
    private String featuresJson;

    @Transient
    public Map<String, Object> getFeatures() {
        if (featuresJson == null || featuresJson.isBlank()) return null;
        try {
            return MAPPER.readValue(featuresJson, new TypeReference<>() {});
        } catch (Exception e) {
            return null;
        }
    }

    @Transient
    public void setFeatures(Map<String, Object> features) {
        if (features == null) { this.featuresJson = null; return; }
        try {
            this.featuresJson = MAPPER.writeValueAsString(features);
        } catch (Exception e) {
            this.featuresJson = null;
        }
    }

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum BillingPeriod {
        MONTHLY, QUARTERLY, ANNUAL
    }
}