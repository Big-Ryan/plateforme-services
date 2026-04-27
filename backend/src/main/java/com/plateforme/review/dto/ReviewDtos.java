package com.plateforme.review.dto;

import com.plateforme.review.entity.Review;
import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class ReviewDtos {

    @Data
    public static class CreateReviewRequest {
        @NotNull private UUID negotiationId;
        @NotNull @Min(1) @Max(5) private Short rating;
        private String comment;
    }

    @Builder @Data
    public static class ReviewResponse {
        private UUID   id;
        private UUID   negotiationId;
        private UUID   serviceId;
        private String serviceTitle;
        private UUID   clientId;
        private String clientName;
        private UUID   providerId;
        private short  rating;
        private String comment;
        private LocalDateTime createdAt;

        public static ReviewResponse from(Review r) {
            return ReviewResponse.builder()
                    .id(r.getId())
                    .negotiationId(r.getNegotiation().getId())
                    .serviceId(r.getService().getId())
                    .serviceTitle(r.getService().getTitle())
                    .clientId(r.getClient().getId())
                    .clientName(r.getClient().getFirstName() + " " + r.getClient().getLastName())
                    .providerId(r.getProvider().getId())
                    .rating(r.getRating())
                    .comment(r.getComment())
                    .createdAt(r.getCreatedAt())
                    .build();
        }
    }

    @Builder @Data
    public static class RatingSummary {
        private double averageRating;
        private long   totalReviews;
        private long   fiveStars;
        private long   fourStars;
        private long   threeStars;
        private long   twoStars;
        private long   oneStar;
    }
}