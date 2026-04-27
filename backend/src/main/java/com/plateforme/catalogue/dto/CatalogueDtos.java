package com.plateforme.catalogue.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.plateforme.catalogue.entity.Category;
import com.plateforme.catalogue.entity.ServiceOffer;
import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

// ============================================================
// DTOs du module Catalogue
// ============================================================

public class CatalogueDtos {

    // ===== Category =====

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CategoryResponse {
        private UUID id;
        private String name;
        private String slug;
        private String iconUrl;
        private UUID parentId;
        private int sortOrder;
        private List<CategoryResponse> children;

        public static CategoryResponse from(Category c) {
            return CategoryResponse.builder()
                    .id(c.getId())
                    .name(c.getName())
                    .slug(c.getSlug())
                    .iconUrl(c.getIconUrl())
                    .parentId(c.getParent() != null ? c.getParent().getId() : null)
                    .sortOrder(c.getSortOrder())
                    .build();
        }
    }

    // ===== Service : réponse publique =====

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ServiceSummaryResponse {
        private UUID id;
        private String title;
        private String description;
        private BigDecimal priceFrom;
        private BigDecimal priceTo;
        private String currency;
        private String location;
        private String deliveryTime;
        private String status;
        private String[] tags;
        private String[] images;
        private int viewCount;
        private LocalDateTime createdAt;
        // Provider info (résumé)
        private UUID providerId;
        private String providerName;
        private String providerLogoUrl;
        private boolean providerVerified;
        private String providerCity;
        // Category
        private UUID categoryId;
        private String categoryName;

        public static ServiceSummaryResponse from(ServiceOffer s) {
            return ServiceSummaryResponse.builder()
                    .id(s.getId())
                    .title(s.getTitle())
                    .description(s.getDescription() != null
                            ? s.getDescription().length() > 200
                            ? s.getDescription().substring(0, 200) + "..."
                            : s.getDescription()
                            : null)
                    .priceFrom(s.getPriceFrom())
                    .priceTo(s.getPriceTo())
                    .currency(s.getCurrency())
                    .location(s.getLocation())
                    .deliveryTime(s.getDeliveryTime())
                    .status(s.getStatus().name())
                    .tags(s.getTags())
                    .images(s.getImages() != null && s.getImages().length > 0
                            ? new String[]{s.getImages()[0]} : null)
                    .viewCount(s.getViewCount())
                    .createdAt(s.getCreatedAt())
                    .providerId(s.getProvider().getId())
                    .providerName(s.getProvider().getFirstName() + " " + s.getProvider().getLastName())
                    .providerCity(s.getLocation())
                    .categoryId(s.getCategory() != null ? s.getCategory().getId() : null)
                    .categoryName(s.getCategory() != null ? s.getCategory().getName() : null)
                    .build();
        }
    }

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ServiceDetailResponse {
        private UUID id;
        private String title;
        private String description;
        private BigDecimal priceFrom;
        private BigDecimal priceTo;
        private String currency;
        private String location;
        private String deliveryTime;
        private String status;
        private String[] tags;
        private String[] images;
        private int viewCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private UUID providerId;
        private String providerCompanyName;
        private String providerFirstName;
        private String providerLastName;
        private String providerLogoUrl;
        private String providerPhone;
        private boolean providerVerified;
        private UUID categoryId;
        private String categoryName;
        private String categorySlug;

        public static ServiceDetailResponse from(ServiceOffer s) {
            String companyName = null;
            String logoUrl = null;
            boolean verified = false;
            if (s.getProvider() != null) {
                // Ces valeurs sont chargées via JOIN dans le service
            }
            return ServiceDetailResponse.builder()
                    .id(s.getId())
                    .title(s.getTitle())
                    .description(s.getDescription())
                    .priceFrom(s.getPriceFrom())
                    .priceTo(s.getPriceTo())
                    .currency(s.getCurrency())
                    .location(s.getLocation())
                    .deliveryTime(s.getDeliveryTime())
                    .status(s.getStatus().name())
                    .tags(s.getTags())
                    .images(s.getImages())
                    .viewCount(s.getViewCount())
                    .createdAt(s.getCreatedAt())
                    .updatedAt(s.getUpdatedAt())
                    .providerId(s.getProvider().getId())
                    .providerFirstName(s.getProvider().getFirstName())
                    .providerLastName(s.getProvider().getLastName())
                    .providerPhone(s.getProvider().getPhone())
                    .categoryId(s.getCategory() != null ? s.getCategory().getId() : null)
                    .categoryName(s.getCategory() != null ? s.getCategory().getName() : null)
                    .categorySlug(s.getCategory() != null ? s.getCategory().getSlug() : null)
                    .build();
        }
    }

    // ===== Service : création / modification =====

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateServiceRequest {

        @NotBlank(message = "Le titre est obligatoire")
        @Size(max = 255, message = "Le titre ne doit pas dépasser 255 caractères")
        private String title;

        @Size(max = 5000, message = "La description ne doit pas dépasser 5000 caractères")
        private String description;

        @DecimalMin(value = "0.0", inclusive = false, message = "Le prix minimum doit être positif")
        private BigDecimal priceFrom;

        @DecimalMin(value = "0.0", inclusive = false, message = "Le prix maximum doit être positif")
        private BigDecimal priceTo;

        @Size(max = 3)
        private String currency;

        @Size(max = 100)
        private String deliveryTime;

        @Size(max = 255)
        private String location;

        private UUID categoryId;

        @Size(max = 10, message = "Maximum 10 tags")
        private List<String> tags;

        @Size(max = 5, message = "Maximum 5 images")
        private List<String> images;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateServiceRequest {

        @Size(max = 255)
        private String title;

        @Size(max = 5000)
        private String description;

        @DecimalMin(value = "0.0", inclusive = false)
        private BigDecimal priceFrom;

        @DecimalMin(value = "0.0", inclusive = false)
        private BigDecimal priceTo;

        @Size(max = 3)
        private String currency;

        @Size(max = 100)
        private String deliveryTime;

        @Size(max = 255)
        private String location;

        private UUID categoryId;

        @Size(max = 10)
        private List<String> tags;

        private List<String> images;    private String status; // DRAFT, PUBLISHED
    }
}