package com.plateforme.negotiation.repository;

import com.plateforme.negotiation.entity.NegotiationMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NegotiationMessageRepository extends JpaRepository<NegotiationMessage, UUID> {

    @Query("""
        SELECT m FROM NegotiationMessage m
        JOIN FETCH m.sender
        WHERE m.negotiation.id = :negotiationId
        ORDER BY m.sentAt ASC
        """)
    List<NegotiationMessage> findByNegotiationId(@Param("negotiationId") UUID negotiationId);

    @Modifying
    @Query("""
        UPDATE NegotiationMessage m SET m.isRead = true
        WHERE m.negotiation.id = :negotiationId
        AND m.sender.id != :readerId
        AND m.isRead = false
        """)
    int markAsRead(@Param("negotiationId") UUID negotiationId, @Param("readerId") UUID readerId);

    long countByNegotiationIdAndIsReadFalseAndSenderIdNot(UUID negotiationId, UUID senderId);
}
