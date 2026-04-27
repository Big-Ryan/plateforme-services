package com.plateforme.negotiation.controller;

import com.plateforme.common.dto.ApiResponse;
import com.plateforme.common.dto.PageResponse;
import com.plateforme.negotiation.dto.NegotiationDtos.*;
import com.plateforme.negotiation.service.NegotiationService;
import com.plateforme.users.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/negotiations")
@RequiredArgsConstructor
@Tag(name = "Négociations")
public class NegotiationController {

    private final NegotiationService negotiationService;

    @Operation(summary = "Initier une négociation (client inscrit ou visiteur)")
    @PostMapping
    public ResponseEntity<ApiResponse<NegotiationDetail>> initiate(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody InitiateRequest request) {
        // currentUser peut être null si visiteur
        NegotiationDetail result = negotiationService.initiate(currentUser, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Négociation initiée", result));
    }

    @Operation(summary = "Mes négociations reçues (prestataire)")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/provider")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<ApiResponse<PageResponse<NegotiationSummary>>> getProviderNegotiations(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                negotiationService.getProviderNegotiations(currentUser, page, size)));
    }

    @Operation(summary = "Mes négociations (client)")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/client")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<ApiResponse<PageResponse<NegotiationSummary>>> getClientNegotiations(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                negotiationService.getClientNegotiations(currentUser, page, size)));
    }

    @Operation(summary = "Détail d'une négociation (marque les messages comme lus)")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<NegotiationDetail>> getDetail(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(negotiationService.getDetail(currentUser, id)));
    }

    @Operation(summary = "Envoyer un message dans une négociation")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/{id}/messages")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<MessageResponse>> sendMessage(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(negotiationService.sendMessage(currentUser, id, request)));
    }

    @Operation(summary = "Mettre à jour le statut d'une négociation")
    @SecurityRequirement(name = "bearerAuth")
    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<NegotiationDetail>> updateStatus(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Statut mis à jour", negotiationService.updateStatus(currentUser, id, request)));
    }
}
