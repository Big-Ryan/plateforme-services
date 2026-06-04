package com.plateforme.catalogue.repository;

import com.plateforme.catalogue.entity.ServiceOffer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceOfferRepository extends JpaRepository<ServiceOffer, UUID> {

    // ===== Catalogue public — sans ville, sans recherche =====
    @Query("SELECT s FROM ServiceOffer s WHERE s.status = 'PUBLISHED' AND (:categoryId IS NULL OR s.category.id = :categoryId)")
    Page<ServiceOffer> findPublishedByCategory(
            @Param("categoryId") UUID categoryId,
            Pageable pageable);

    // ===== Catalogue public — avec ville, sans recherche =====
    @Query("SELECT s FROM ServiceOffer s WHERE s.status = 'PUBLISHED' AND (:categoryId IS NULL OR s.category.id = :categoryId) AND s.location = :city")
    Page<ServiceOffer> findPublishedByCategoryAndCity(
            @Param("categoryId") UUID categoryId,
            @Param("city") String city,
            Pageable pageable);

    // ===== Catalogue public — sans ville, avec recherche (native pour éviter lower(bytea)) =====
    @Query(value = "SELECT * FROM public.services s WHERE s.status = 'PUBLISHED' AND (:categoryId IS NULL OR s.category_id = CAST(:categoryId AS uuid)) AND (s.title ILIKE CONCAT('%', :q, '%') OR s.description ILIKE CONCAT('%', :q, '%')) ORDER BY s.created_at DESC",
            countQuery = "SELECT count(*) FROM public.services s WHERE s.status = 'PUBLISHED' AND (:categoryId IS NULL OR s.category_id = CAST(:categoryId AS uuid)) AND (s.title ILIKE CONCAT('%', :q, '%') OR s.description ILIKE CONCAT('%', :q, '%'))",
            nativeQuery = true)
    Page<ServiceOffer> findPublishedByCategoryAndQuery(
            @Param("categoryId") String categoryId,
            @Param("q") String q,
            Pageable pageable);

    // ===== Catalogue public — avec ville et recherche =====
    @Query(value = "SELECT * FROM public.services s WHERE s.status = 'PUBLISHED' AND (:categoryId IS NULL OR s.category_id = CAST(:categoryId AS uuid)) AND s.location ILIKE CONCAT('%', :city, '%') AND (s.title ILIKE CONCAT('%', :q, '%') OR s.description ILIKE CONCAT('%', :q, '%')) ORDER BY s.created_at DESC",
            countQuery = "SELECT count(*) FROM public.services s WHERE s.status = 'PUBLISHED' AND (:categoryId IS NULL OR s.category_id = CAST(:categoryId AS uuid)) AND s.location ILIKE CONCAT('%', :city, '%') AND (s.title ILIKE CONCAT('%', :q, '%') OR s.description ILIKE CONCAT('%', :q, '%'))",
            nativeQuery = true)
    Page<ServiceOffer> findPublishedByCategoryAndCityAndQuery(
            @Param("categoryId") String categoryId,
            @Param("city") String city,
            @Param("q") String q,
            Pageable pageable);

    Page<ServiceOffer> findByProviderIdOrderByCreatedAtDesc(UUID providerId, Pageable pageable);

    Optional<ServiceOffer> findByIdAndProviderId(UUID id, UUID providerId);

    long countByProviderIdAndStatus(UUID providerId, ServiceOffer.Status status);

    @Modifying
    @Query("UPDATE ServiceOffer s SET s.status = 'HIDDEN' WHERE s.provider.id = :providerId AND s.status = 'PUBLISHED'")
    int hideAllByProviderId(@Param("providerId") UUID providerId);

    @Modifying
    @Query("UPDATE ServiceOffer s SET s.status = 'PUBLISHED' WHERE s.provider.id = :providerId AND s.status = 'HIDDEN'")
    int publishAllHiddenByProviderId(@Param("providerId") UUID providerId);

    @Modifying
    @Query("UPDATE ServiceOffer s SET s.viewCount = s.viewCount + 1 WHERE s.id = :id")
    void incrementViewCount(@Param("id") UUID id);

    long countByStatus(ServiceOffer.Status status);

    long countByCategoryId(UUID categoryId);
}