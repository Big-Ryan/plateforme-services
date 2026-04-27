package com.plateforme.auth.service;

import com.plateforme.auth.entity.RefreshToken;
import com.plateforme.common.exception.InvalidTokenException;
import com.plateforme.users.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    @PersistenceContext
    private EntityManager em;

    @Value("${jwt.refresh-token-expiration-ms}")
    private long refreshTokenExpirationMs;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public String createRefreshToken(User user, String deviceInfo, String ipAddress) {
        // Génère un token cryptographiquement sûr
        byte[] tokenBytes = new byte[64];
        secureRandom.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        String tokenHash = hashToken(rawToken);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .deviceInfo(deviceInfo)
                .ipAddress(ipAddress)
                .expiresAt(LocalDateTime.now().plusNanos(refreshTokenExpirationMs * 1_000_000L))
                .build();

        em.persist(refreshToken);
        return rawToken;
    }

    @Transactional
    public User validateAndRotate(String rawToken, String ipAddress,
                                  java.util.function.Consumer<String> newTokenConsumer) {
        String tokenHash = hashToken(rawToken);

        RefreshToken stored = em.createQuery(
                        "SELECT rt FROM RefreshToken rt JOIN FETCH rt.user WHERE rt.tokenHash = :hash",
                        RefreshToken.class)
                .setParameter("hash", tokenHash)
                .getResultStream()
                .findFirst()
                .orElseThrow(() -> new InvalidTokenException("Refresh token invalide"));

        if (!stored.isValid()) {
            // Si token révoqué ou expiré → révoquer TOUS les tokens de cet utilisateur (attaque détectée)
            if (stored.isRevoked()) {
                log.warn("Refresh token réutilisé détecté pour userId={}. Révocation de tous les tokens.", stored.getUser().getId());
                revokeAllUserTokens(stored.getUser().getId().toString());
            }
            throw new InvalidTokenException("Refresh token expiré ou révoqué");
        }

        // Rotation : révoque l'ancien
        stored.revoke();

        User user = stored.getUser();

        // Crée le nouveau
        String newRawToken = createRefreshToken(user, stored.getDeviceInfo(), ipAddress);
        newTokenConsumer.accept(newRawToken);

        return user;
    }

    @Transactional
    public void revokeAllUserTokens(String userId) {
        em.createQuery("UPDATE RefreshToken rt SET rt.revoked = true, rt.revokedAt = :now " +
                        "WHERE rt.user.id = :userId AND rt.revoked = false")
                .setParameter("now", LocalDateTime.now())
                .setParameter("userId", java.util.UUID.fromString(userId))
                .executeUpdate();
    }

    @Transactional
    @Scheduled(cron = "0 0 3 * * *") // Tous les jours à 3h
    public void cleanExpiredTokens() {
        int deleted = em.createQuery(
                        "DELETE FROM RefreshToken rt WHERE rt.expiresAt < :now OR rt.revoked = true")
                .setParameter("now", LocalDateTime.now().minusDays(7))
                .executeUpdate();
        log.info("Refresh tokens expirés nettoyés: {}", deleted);
    }

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 non disponible", e);
        }
    }
}
