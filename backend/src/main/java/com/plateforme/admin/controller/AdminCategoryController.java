package com.plateforme.admin.controller;

import com.plateforme.admin.dto.CategoryAdminDtos.*;
import com.plateforme.catalogue.entity.Category;
import com.plateforme.catalogue.repository.CategoryRepository;
import com.plateforme.catalogue.repository.ServiceOfferRepository;
import com.plateforme.common.dto.ApiResponse;
import com.plateforme.common.exception.BusinessException;
import com.plateforme.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.plateforme.users.entity.User;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Administration — Catégories")
@Slf4j
public class AdminCategoryController {

    private final CategoryRepository    categoryRepository;
    private final ServiceOfferRepository serviceOfferRepository;

    // ===== Liste toutes les catégories =====

    @Operation(summary = "Liste toutes les catégories avec comptage services")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAll() {
        List<CategoryResponse> result = categoryRepository
                .findAllByOrderBySortOrderAsc()
                .stream()
                .map(c -> CategoryResponse.builder()
                        .id(c.getId())
                        .name(c.getName())
                        .slug(c.getSlug())
                        .sortOrder(c.getSortOrder())
                        .active(c.isActive())
                        .serviceCount(serviceOfferRepository.countByCategoryId(c.getId()))
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ===== Créer une catégorie =====

    @Operation(summary = "Créer une nouvelle catégorie")
    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<CategoryResponse>> create(
            @Valid @RequestBody CreateCategoryRequest req,
            @AuthenticationPrincipal User admin) {

        if (categoryRepository.existsBySlug(req.getSlug())) {
            throw new BusinessException("Un slug identique existe déjà : " + req.getSlug());
        }

        Category cat = Category.builder()
                .name(req.getName())
                .slug(req.getSlug())
                .sortOrder(req.getSortOrder())
                .isActive(true)
                .build();

        categoryRepository.save(cat);
        log.info("Admin {} a créé la catégorie '{}'", admin.getEmail(), cat.getName());

        return ResponseEntity.ok(ApiResponse.ok(toResponse(cat)));
    }

    // ===== Modifier une catégorie =====

    @Operation(summary = "Modifier le nom, l'ordre ou l'état actif d'une catégorie")
    @PatchMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<CategoryResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCategoryRequest req,
            @AuthenticationPrincipal User admin) {

        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Catégorie", id));

        if (req.getName()      != null) cat.setName(req.getName());
        if (req.getSortOrder() != null) cat.setSortOrder(req.getSortOrder());
        if (req.getActive()    != null) cat.setActive(req.getActive());

        categoryRepository.save(cat);
        log.info("Admin {} a modifié la catégorie '{}'", admin.getEmail(), cat.getName());

        return ResponseEntity.ok(ApiResponse.ok(toResponse(cat)));
    }

    // ===== Réordonner les catégories (drag & drop) =====

    @Operation(summary = "Réordonner toutes les catégories en une seule requête")
    @PutMapping("/reorder")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> reorder(
            @Valid @RequestBody ReorderRequest req,
            @AuthenticationPrincipal User admin) {

        req.getItems().forEach(item -> {
            categoryRepository.findById(item.getId()).ifPresent(cat -> {
                cat.setSortOrder(item.getSortOrder());
                categoryRepository.save(cat);
            });
        });

        log.info("Admin {} a réordonné {} catégories", admin.getEmail(), req.getItems().size());
        return ResponseEntity.ok(ApiResponse.ok("Ordre mis à jour"));
    }

    // ===== Supprimer une catégorie =====

    @Operation(summary = "Supprimer une catégorie (impossible si des services y sont liés)")
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User admin) {

        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Catégorie", id));

        long count = serviceOfferRepository.countByCategoryId(id);
        if (count > 0) {
            throw new BusinessException(
                    "Impossible de supprimer : " + count + " service(s) utilisent cette catégorie. Désactivez-la plutôt.");
        }

        categoryRepository.delete(cat);
        log.info("Admin {} a supprimé la catégorie '{}'", admin.getEmail(), cat.getName());

        return ResponseEntity.ok(ApiResponse.ok("Catégorie supprimée"));
    }

    // ===== Helper =====
    private CategoryResponse toResponse(Category c) {
        return CategoryResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .slug(c.getSlug())
                .sortOrder(c.getSortOrder())
                .active(c.isActive())
                .serviceCount(serviceOfferRepository.countByCategoryId(c.getId()))
                .build();
    }
}
