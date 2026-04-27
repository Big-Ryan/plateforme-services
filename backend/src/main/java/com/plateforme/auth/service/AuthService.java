package com.plateforme.auth.service;

import com.plateforme.auth.dto.*;
import com.plateforme.common.exception.BusinessException;
import com.plateforme.common.exception.ConflictException;
import com.plateforme.common.exception.ResourceNotFoundException;
import com.plateforme.users.entity.ClientProfile;
import com.plateforme.users.entity.ProviderProfile;
import com.plateforme.users.entity.User;
import com.plateforme.users.repository.ClientProfileRepository;
import com.plateforme.users.repository.ProviderProfileRepository;
import com.plateforme.users.repository.UserRepository;
import com.plateforme.referral.service.ReferralService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final ClientProfileRepository clientProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final ReferralService referralService;
    private final AuthenticationManager authenticationManager;
    private final NotificationAuthService notificationAuthService;

    @Value("${jwt.access-token-expiration-ms}")
    private long accessTokenExpirationMs;

    // ===== Register =====

    @Transactional
    public TokenResponse register(RegisterRequest request, String deviceInfo, String ipAddress) {
        if (userRepository.existsByEmail(request.getEmail().toLowerCase())) {
            throw new ConflictException("Un compte avec cet email existe déjà");
        }

        if (request.getRole() == User.Role.ADMIN) {
            throw new BusinessException("Impossible de créer un compte admin via cette API");
        }

        if (request.getRole() == User.Role.PROVIDER && (request.getCompanyName() == null || request.getCompanyName().isBlank())) {
            throw new BusinessException("Le nom de l'entreprise est obligatoire pour un prestataire");
        }

        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhone())
                .isActive(true)
                .emailVerified(false)
                .referralCode(generateReferralCode())
                .build();

        userRepository.save(user);

        // Enregistrer le parrainage si un code a été fourni
        if (request.getReferralCode() != null && !request.getReferralCode().isBlank()) {
            referralService.registerReferral(user, request.getReferralCode());
        }

        // Création du profil selon le rôle
        if (request.getRole() == User.Role.PROVIDER) {
            ProviderProfile profile = ProviderProfile.builder()
                    .user(user)
                    .companyName(request.getCompanyName())
                    .city(request.getCity())
                    .build();
            providerProfileRepository.save(profile);
        } else {
            ClientProfile profile = ClientProfile.builder()
                    .user(user)
                    .build();
            clientProfileRepository.save(profile);
        }

        // Crée le token (dans cette transaction) puis envoie l'email (async)
        notificationAuthService.createAndSendVerificationEmail(user);

        log.info("Nouvel utilisateur enregistré: {} ({})", user.getEmail(), user.getRole());

        return generateTokenResponse(user, deviceInfo, ipAddress);
    }

    // ===== Login =====

    @Transactional
    public TokenResponse login(LoginRequest request, String deviceInfo, String ipAddress) {
        // Spring Security gère BadCredentialsException / DisabledException
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail().toLowerCase(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", request.getEmail()));

        log.info("Connexion réussie: {} depuis {}", user.getEmail(), ipAddress);

        return generateTokenResponse(user, deviceInfo, ipAddress);
    }

    // ===== Refresh =====

    @Transactional
    public TokenResponse refresh(String rawRefreshToken, String deviceInfo, String ipAddress) {
        final String[] newRefreshToken = new String[1];

        User user = refreshTokenService.validateAndRotate(rawRefreshToken, ipAddress,
                token -> newRefreshToken[0] = token);

        String accessToken = jwtService.generateAccessToken(user);

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(newRefreshToken[0])
                .tokenType("Bearer")
                .expiresIn(accessTokenExpirationMs / 1000)
                .user(toUserInfo(user))
                .build();
    }

    // ===== Logout =====

    @Transactional
    public void logout(String rawRefreshToken, User currentUser) {
        // currentUser peut être null si le token est expiré → on ignore silencieusement
        if (currentUser == null) {
            log.debug("Logout sans utilisateur authentifié — ignoré");
            return;
        }
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokenService.revokeAllUserTokens(currentUser.getId().toString());
        }
        log.info("Déconnexion: {}", currentUser.getEmail());
    }

    // ===== Helper =====

    private String generateReferralCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        java.util.Random random = new java.util.Random();
        StringBuilder code = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            code.append(chars.charAt(random.nextInt(chars.length())));
        }
        // Vérifier unicité
        String generated = code.toString();
        if (userRepository.findByReferralCode(generated).isPresent()) {
            return generateReferralCode(); // Récursion si collision (très rare)
        }
        return generated;
    }

    private TokenResponse generateTokenResponse(User user, String deviceInfo, String ipAddress) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefreshToken = refreshTokenService.createRefreshToken(user, deviceInfo, ipAddress);

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpirationMs / 1000)
                .user(toUserInfo(user))
                .build();
    }

    private TokenResponse.UserInfo toUserInfo(User user) {
        return TokenResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .emailVerified(user.isEmailVerified())
                .build();
    }
}