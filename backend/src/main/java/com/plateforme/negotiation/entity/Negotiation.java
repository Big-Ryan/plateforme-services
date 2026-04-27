package com.plateforme.negotiation.entity;

import com.plateforme.catalogue.entity.ServiceOffer;
import com.plateforme.users.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "negotiations")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Negotiation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private ServiceOffer service;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private User provider;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private User client;

    // Données visiteur non-inscrit
    @Column(name = "client_name", length = 255)
    private String clientName;

    @Column(name = "client_phone", length = 20)
    private String clientPhone;

    @Column(name = "client_email", length = 255)
    private String clientEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.INITIATED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Mode mode = Mode.INTERNAL;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "agreed_price", precision = 10, scale = 2)
    private BigDecimal agreedPrice;

    @OneToMany(mappedBy = "negotiation", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<NegotiationMessage> messages;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum Status {
        INITIATED, IN_PROGRESS, AGREED, CLOSED, REJECTED, EXTERNAL
    }

    public enum Mode {
        INTERNAL, EXTERNAL
    }

    public String getDisplayClientName() {
        if (client != null) return client.getFullName();
        return clientName != null ? clientName : clientEmail;
    }
}
