package com.plateforme.review.entity;

import com.plateforme.catalogue.entity.ServiceOffer;
import com.plateforme.negotiation.entity.Negotiation;
import com.plateforme.users.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "reviews")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "negotiation_id", nullable = false, unique = true)
    private Negotiation negotiation;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceOffer service;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private User provider;

    @Column(nullable = false)
    private Short rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    private LocalDateTime createdAt;
}