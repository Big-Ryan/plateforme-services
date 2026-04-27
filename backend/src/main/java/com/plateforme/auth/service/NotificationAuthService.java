package com.plateforme.auth.service;

import com.plateforme.common.exception.BusinessException;
import com.plateforme.common.exception.InvalidTokenException;
import com.plateforme.users.entity.User;
import com.plateforme.users.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationAuthService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager em;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.mail-from}")
    private String mailFrom;

    @Value("${app.mail-from-name}")
    private String mailFromName;

    private final SecureRandom secureRandom = new SecureRandom();

    // ===== Vérification email =====
    // Appelé DEPUIS la transaction principale de register()
    // On persiste le token ici (dans la même transaction) puis on envoie l'email de façon async

    @Transactional(propagation = Propagation.MANDATORY)
    public String createVerificationToken(UUID userId) {
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        em.createNativeQuery(
                        "INSERT INTO email_verification_tokens (id, user_id, token, expires_at) " +
                                "VALUES (gen_random_uuid(), :userId, :token, :expiresAt)")
                .setParameter("userId", userId)
                .setParameter("token", rawToken)
                .setParameter("expiresAt", LocalDateTime.now().plusHours(24))
                .executeUpdate();

        return rawToken;
    }

    @Async
    public void sendVerificationEmail(User user, String rawToken) {
        try {
            String verificationUrl = frontendUrl + "/auth/verify-email?token=" + rawToken;

            Context ctx = new Context();
            ctx.setVariable("firstName", user.getFirstName());
            ctx.setVariable("verificationUrl", verificationUrl);
            ctx.setVariable("expirationHours", 24);

            sendEmail(user.getEmail(), "Vérifiez votre adresse email", "email/verify-email", ctx);
            log.info("Email de vérification envoyé à {}", user.getEmail());
        } catch (Exception e) {
            log.error("Erreur envoi email vérification à {} : {}", user.getEmail(), e.getMessage());
        }
    }

    // Méthode de commodité appelée depuis AuthService
    @Transactional(propagation = Propagation.MANDATORY)
    public void createAndSendVerificationEmail(User user) {
        String rawToken = createVerificationToken(user.getId());
        sendVerificationEmail(user, rawToken); // async, token déjà persisté
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        Object[] result;
        try {
            result = (Object[]) em.createNativeQuery(
                            "SELECT user_id, expires_at, used FROM email_verification_tokens WHERE token = :token")
                    .setParameter("token", rawToken)
                    .getSingleResult();
        } catch (Exception e) {
            throw new InvalidTokenException("Token de vérification invalide");
        }

        boolean used = (boolean) result[2];
        LocalDateTime expiresAt = ((java.sql.Timestamp) result[1]).toLocalDateTime();
        UUID userId = UUID.fromString(result[0].toString());

        if (used || LocalDateTime.now().isAfter(expiresAt)) {
            throw new InvalidTokenException("Token de vérification expiré ou déjà utilisé");
        }

        em.createNativeQuery("UPDATE email_verification_tokens SET used = true WHERE token = :token")
                .setParameter("token", rawToken)
                .executeUpdate();

        userRepository.verifyEmail(userId);
        log.info("Email vérifié pour userId={}", userId);
    }

    // ===== Réinitialisation mot de passe =====

    @Async
    public void sendPasswordResetEmail(String email) {
        userRepository.findByEmail(email.toLowerCase()).ifPresent(user -> {
            try {
                byte[] tokenBytes = new byte[32];
                secureRandom.nextBytes(tokenBytes);
                String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
                String tokenHash = hashToken(rawToken);

                // Persiste dans une nouvelle transaction indépendante
                savePasswordResetToken(user.getId(), tokenHash);

                String resetUrl = frontendUrl + "/auth/reset-password?token=" + rawToken;

                Context ctx = new Context();
                ctx.setVariable("firstName", user.getFirstName());
                ctx.setVariable("resetUrl", resetUrl);
                ctx.setVariable("expirationHours", 2);

                sendEmail(user.getEmail(), "Réinitialisation de votre mot de passe",
                        "email/reset-password", ctx);
                log.info("Email de réinitialisation envoyé à {}", email);
            } catch (Exception e) {
                log.error("Erreur envoi email reset à {} : {}", email, e.getMessage());
            }
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void savePasswordResetToken(UUID userId, String tokenHash) {
        em.createNativeQuery(
                        "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) " +
                                "VALUES (gen_random_uuid(), :userId, :hash, :expiresAt)")
                .setParameter("userId", userId)
                .setParameter("hash", tokenHash)
                .setParameter("expiresAt", LocalDateTime.now().plusHours(2))
                .executeUpdate();
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        String tokenHash = hashToken(rawToken);

        Object[] result;
        try {
            result = (Object[]) em.createNativeQuery(
                            "SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token_hash = :hash")
                    .setParameter("hash", tokenHash)
                    .getSingleResult();
        } catch (Exception e) {
            throw new InvalidTokenException("Token invalide");
        }

        boolean used = (boolean) result[2];
        LocalDateTime expiresAt = ((java.sql.Timestamp) result[1]).toLocalDateTime();
        UUID userId = UUID.fromString(result[0].toString());

        if (used || LocalDateTime.now().isAfter(expiresAt)) {
            throw new InvalidTokenException("Token expiré ou déjà utilisé");
        }

        em.createNativeQuery("UPDATE password_reset_tokens SET used = true WHERE token_hash = :hash")
                .setParameter("hash", tokenHash)
                .executeUpdate();

        String encoded = passwordEncoder.encode(newPassword);
        em.createNativeQuery("UPDATE users SET password = :pwd WHERE id = :id")
                .setParameter("pwd", encoded)
                .setParameter("id", userId)
                .executeUpdate();

        em.createNativeQuery(
                        "UPDATE refresh_tokens SET revoked = true, revoked_at = now() " +
                                "WHERE user_id = :id AND revoked = false")
                .setParameter("id", userId)
                .executeUpdate();

        log.info("Mot de passe réinitialisé pour userId={}", userId);
    }

    // ===== Helper =====

    private void sendEmail(String to, String subject, String template, Context ctx) {
        try {
            String html = templateEngine.process(template, ctx);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom, mailFromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Envoi email échoué pour {} : {}", to, e.getMessage(), e);
        }
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