package com.plateforme.subscription.controller;

import com.plateforme.common.dto.ApiResponse;
import com.plateforme.subscription.dto.SubscriptionDtos.*;
import com.plateforme.subscription.service.SubscriptionService;
import com.plateforme.users.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Abonnements")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @Operation(summary = "Liste des plans disponibles (public)")
    @GetMapping("/plans")
    public ResponseEntity<ApiResponse<List<PlanResponse>>> getPlans() {
        return ResponseEntity.ok(ApiResponse.ok(subscriptionService.getActivePlans()));
    }

    @Operation(summary = "Mon abonnement courant")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/current")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> getCurrentSubscription(
            @AuthenticationPrincipal User currentUser) {
        return subscriptionService.getCurrentSubscription(currentUser.getId())
                .map(sub -> ResponseEntity.ok(ApiResponse.ok(sub)))
                .orElse(ResponseEntity.ok(ApiResponse.<SubscriptionResponse>builder()
                        .success(true).message("Aucun abonnement actif").build()));
    }

    @Operation(summary = "Souscrire à un plan (démarre l'essai ou redirige vers PayPal)")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/execute-agreement")
    public ResponseEntity<ApiResponse<Void>> executeAgreement(
            @RequestBody java.util.Map<String, String> body) {
        String token = body.get("token");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.ok("Token manquant", null));
        }
        subscriptionService.executeAgreement(token);
        return ResponseEntity.ok(ApiResponse.ok("Abonnement activé"));
    }

    @PostMapping("/subscribe/{planId}")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<ApiResponse<SubscribeResponse>> subscribe(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID planId) {
        SubscribeResponse response = subscriptionService.subscribe(currentUser, planId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}