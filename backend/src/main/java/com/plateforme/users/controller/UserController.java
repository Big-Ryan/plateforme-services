package com.plateforme.users.controller;

import com.plateforme.common.dto.ApiResponse;
import com.plateforme.users.dto.ChangePasswordRequest;
import com.plateforme.users.dto.ProviderPublicResponse;
import com.plateforme.users.dto.UpdateProfileRequest;
import com.plateforme.users.dto.UserProfileResponse;
import com.plateforme.users.entity.User;
import com.plateforme.users.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Utilisateurs", description = "Gestion des profils")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    // ===== GET /api/me =====

    @Operation(summary = "Récupérer son propre profil")
    @GetMapping("/api/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getProfile(currentUser)));
    }

    // ===== PUT /api/me =====

    @Operation(summary = "Mettre à jour son profil")
    @PutMapping("/api/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Profil mis à jour", userService.updateProfile(currentUser, request)));
    }

    // ===== PUT /api/me/password =====

    @Operation(summary = "Changer son mot de passe")
    @PutMapping("/api/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(currentUser, request);
        return ResponseEntity.ok(ApiResponse.ok("Mot de passe modifié avec succès"));
    }

    // ===== GET /api/providers/{id} (public) =====

    @Operation(summary = "Récupérer le profil public d'un prestataire")
    @GetMapping("/api/providers/{id}")
    public ResponseEntity<ApiResponse<ProviderPublicResponse>> getProviderProfile(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getPublicProviderProfile(id)));
    }
}
