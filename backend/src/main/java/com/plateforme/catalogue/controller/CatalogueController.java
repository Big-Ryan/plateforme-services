package com.plateforme.catalogue.controller;

import com.plateforme.catalogue.dto.CatalogueDtos.*;
import com.plateforme.catalogue.service.CatalogueService;
import com.plateforme.common.dto.ApiResponse;
import com.plateforme.common.dto.PageResponse;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CatalogueController {

    private final CatalogueService catalogueService;

    // ===== PUBLIC =====

    @Tag(name = "Catalogue public")
    @Operation(summary = "Liste des catégories actives")
    @GetMapping("/api/categories")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategories() {
        return ResponseEntity.ok(ApiResponse.ok(catalogueService.getAllCategories()));
    }

    @Tag(name = "Catalogue public")
    @Operation(summary = "Catalogue des services publiés (filtres + recherche FTS)")
    @GetMapping("/api/services")
    public ResponseEntity<ApiResponse<PageResponse<ServiceSummaryResponse>>> getServices(
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "recent") String sort) {

        return ResponseEntity.ok(ApiResponse.ok(
                catalogueService.getPublishedServices(categoryId, city, q, page, size, sort)));
    }

    @Tag(name = "Catalogue public")
    @Operation(summary = "Détail d'un service (incrémente le compteur de vues)")
    @GetMapping("/api/services/{id}")
    public ResponseEntity<ApiResponse<ServiceDetailResponse>> getServiceDetail(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(catalogueService.getServiceDetail(id)));
    }

    // ===== PRESTATAIRE =====

    @Tag(name = "Prestataire - Services")
    @Operation(summary = "Mes services (tous statuts)")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/api/provider/services")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<ApiResponse<PageResponse<ServiceSummaryResponse>>> getMyServices(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {

        return ResponseEntity.ok(ApiResponse.ok(
                catalogueService.getMyServices(currentUser, page, size)));
    }

    @Tag(name = "Prestataire - Services")
    @Operation(summary = "Créer un service")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/api/provider/services")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<ApiResponse<ServiceDetailResponse>> createService(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateServiceRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Service créé", catalogueService.createService(currentUser, request)));
    }

    @Tag(name = "Prestataire - Services")
    @Operation(summary = "Modifier un service")
    @SecurityRequirement(name = "bearerAuth")
    @PatchMapping("/api/provider/services/{id}")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<ApiResponse<ServiceDetailResponse>> updateService(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateServiceRequest request) {

        return ResponseEntity.ok(ApiResponse.ok(
                "Service mis à jour", catalogueService.updateService(currentUser, id, request)));
    }

    @Tag(name = "Prestataire - Services")
    @Operation(summary = "Supprimer un service")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/api/provider/services/{id}")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<ApiResponse<Void>> deleteService(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {

        catalogueService.deleteService(currentUser, id);
        return ResponseEntity.ok(ApiResponse.ok("Service supprimé"));
    }
}