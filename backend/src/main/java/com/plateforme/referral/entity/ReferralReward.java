package com.plateforme.referral.entity;

import com.plateforme.users.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "referral_rewards")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ReferralReward {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referrer_id", nullable = false)
    private User referrer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referred_id", nullable = false, unique = true)
    private User referred;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    private LocalDateTime validatedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum Status { PENDING, VALIDATED, CANCELLED }
}