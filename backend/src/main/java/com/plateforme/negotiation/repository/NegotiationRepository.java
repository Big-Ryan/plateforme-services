package com.plateforme.negotiation.repository;

import com.plateforme.negotiation.entity.Negotiation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface NegotiationRepository extends JpaRepository<Negotiation, UUID> {

    // Négociations d'un prestataire
    @Query("""
        SELECT n FROM Negotiation n
        LEFT JOIN FETCH n.service s
        WHERE n.provider.id = :providerId
        ORDER BY n.updatedAt DESC
        """)
    Page<Negotiation> findByProviderId(@Param("providerId") UUID providerId, Pageable pageable);

    // Négociations d'un client inscrit
    @Query("""
        SELECT n FROM Negotiation n
        LEFT JOIN FETCH n.service s
        WHERE n.client.id = :clientId
        ORDER BY n.updatedAt DESC
        """)
    Page<Negotiation> findByClientId(@Param("clientId") UUID clientId, Pageable pageable);

    // Détail avec messages
    @Query("""
        SELECT n FROM Negotiation n
        LEFT JOIN FETCH n.service
        LEFT JOIN FETCH n.provider
        LEFT JOIN FETCH n.client
        WHERE n.id = :id
        """)
    Optional<Negotiation> findByIdWithDetails(@Param("id") UUID id);

    // Vérifier accès (prestataire ou client)
    @Query("""
        SELECT n FROM Negotiation n
        WHERE n.id = :id
        AND (n.provider.id = :userId OR n.client.id = :userId)
        """)
    Optional<Negotiation> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);
}
