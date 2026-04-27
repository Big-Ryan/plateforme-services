package com.plateforme.negotiation.entity;

import com.plateforme.users.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "negotiation_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NegotiationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "negotiation_id", nullable = false)
    private Negotiation negotiation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @Column(name = "sent_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime sentAt = LocalDateTime.now();
}
