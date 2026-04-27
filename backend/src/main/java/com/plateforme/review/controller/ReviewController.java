package com.plateforme.review.controller;

import com.plateforme.common.dto.ApiResponse;
import com.plateforme.review.dto.ReviewDtos;
import com.plateforme.review.service.ReviewService;
import com.plateforme.users.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    /** Soumettre un avis (client authentifié) */
    @PostMapping("/api/reviews")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<ApiResponse<ReviewDtos.ReviewResponse>> create(
            @AuthenticationPrincipal User client,
            @Valid @RequestBody ReviewDtos.CreateReviewRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(reviewService.createReview(client, req)));
    }

    /** Peut-on laisser un avis sur cette négociation ? */
    @GetMapping("/api/reviews/can-review/{negotiationId}")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<ApiResponse<Boolean>> canReview(
            @AuthenticationPrincipal User client,
            @PathVariable UUID negotiationId) {
        return ResponseEntity.ok(ApiResponse.ok(reviewService.canReview(client, negotiationId)));
    }

    /** Avis d'un prestataire — PUBLIC */
    @GetMapping("/api/providers/{id}/reviews")
    public ResponseEntity<ApiResponse<List<ReviewDtos.ReviewResponse>>> byProvider(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(reviewService.getByProvider(id)));
    }

    /** Résumé des notes d'un prestataire — PUBLIC */
    @GetMapping("/api/providers/{id}/rating")
    public ResponseEntity<ApiResponse<ReviewDtos.RatingSummary>> rating(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(reviewService.getRatingSummary(id)));
    }

    /** Avis sur un service — PUBLIC */
    @GetMapping("/api/services/{id}/reviews")
    public ResponseEntity<ApiResponse<List<ReviewDtos.ReviewResponse>>> byService(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(reviewService.getByService(id)));
    }
}