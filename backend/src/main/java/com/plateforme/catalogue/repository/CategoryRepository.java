package com.plateforme.catalogue.repository;

import com.plateforme.catalogue.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {

    List<Category> findByIsActiveTrueOrderBySortOrderAsc();

    Optional<Category> findBySlug(String slug);

    @Query("SELECT c FROM Category c WHERE c.parent IS NULL AND c.isActive = true ORDER BY c.sortOrder ASC")
    List<Category> findRootCategories();

    @Query("SELECT c FROM Category c WHERE c.parent.id = :parentId AND c.isActive = true ORDER BY c.sortOrder ASC")
    List<Category> findByParentId(UUID parentId);

    boolean existsBySlug(String slug);
}
