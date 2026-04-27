package com.plateforme.catalogue.entity;

import com.plateforme.users.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "services")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private User provider;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "price_from", precision = 10, scale = 2)
    private BigDecimal priceFrom;

    @Column(name = "price_to", precision = 10, scale = 2)
    private BigDecimal priceTo;

    @Column(length = 3)
    @Builder.Default
    private String currency = "XAF";

    @Column(name = "delivery_time", length = 100)
    private String deliveryTime;

    @Column(length = 255)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.DRAFT;

    // PostgreSQL TEXT[] — stockés comme chaîne délimitée côté Java
    @Column(columnDefinition = "TEXT[]")
    private String[] tags;

    @Column(columnDefinition = "TEXT[]")
    private String[] images;

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    private int viewCount = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum Status {
        DRAFT, PUBLISHED, HIDDEN, SUSPENDED
    }

    public void incrementViewCount() {
        this.viewCount++;
    }
}