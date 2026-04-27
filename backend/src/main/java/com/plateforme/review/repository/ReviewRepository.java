package com.plateforme.review.repository;

import com.plateforme.review.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    boolean existsByNegotiationId(UUID negotiationId);

    @Query("SELECT r FROM Review r WHERE r.provider.id = :id ORDER BY r.createdAt DESC")
    List<Review> findByProviderId(@Param("id") UUID providerId);

    @Query("SELECT r FROM Review r WHERE r.service.id = :id ORDER BY r.createdAt DESC")
    List<Review> findByServiceId(@Param("id") UUID serviceId);
}