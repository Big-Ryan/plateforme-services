package com.plateforme.auth.controller;

import com.plateforme.auth.dto.*;
import com.plateforme.auth.service.AuthService;
import com.plateforme.auth.service.NotificationAuthService;
import com.plateforme.common.dto.ApiResponse;
import com.plateforme.users.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification", description = "Inscription, connexion, gestion des tokens")
public class AuthController {

    private final AuthService authService;
    private final NotificationAuthService notificationAuthService;

    @Value("${jwt.refresh-token-expiration-ms}")
    private long refreshTokenExpirationMs;

    // ===== Register =====

    @PostMapping("/register")
    @Operation(summary = "Créer un compte (client ou prestataire)")
    public ResponseEntity<ApiResponse<TokenResponse>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        TokenResponse tokenResponse = authService.register(
                request,
                httpRequest.getHeader("User-Agent"),
                getClientIp(httpRequest)
        );

        setRefreshTokenCookie(httpResponse, tokenResponse.getRefreshToken());

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Compte créé avec succès", tokenResponse));
    }

    // ===== Login =====

    @PostMapping("/login")
    @Operation(summary = "Se connecter")
    public ResponseEntity<ApiResponse<TokenResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        TokenResponse tokenResponse = authService.login(
                request,
                httpRequest.getHeader("User-Agent"),
                getClientIp(httpRequest)
        );

        setRefreshTokenCookie(httpResponse, tokenResponse.getRefreshToken());

        return ResponseEntity.ok(ApiResponse.ok(tokenResponse));
    }

    // ===== Refresh =====

    @PostMapping("/refresh")
    @Operation(summary = "Renouveler l'access token")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @RequestBody(required = false) RefreshTokenRequest body,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        // Priorité : cookie HttpOnly, puis body (pour clients API/mobile)
        String rawToken = extractRefreshTokenFromCookieOrBody(httpRequest, body);

        TokenResponse tokenResponse = authService.refresh(
                rawToken,
                httpRequest.getHeader("User-Agent"),
                getClientIp(httpRequest)
        );

        setRefreshTokenCookie(httpResponse, tokenResponse.getRefreshToken());

        return ResponseEntity.ok(ApiResponse.ok(tokenResponse));
    }

    // ===== Logout =====

    @PostMapping("/logout")
    @Operation(summary = "Se déconnecter (révocation du refresh token)")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal User currentUser,
            @RequestBody(required = false) RefreshTokenRequest body,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String rawToken = extractRefreshTokenFromCookieOrBody(httpRequest, body);
        authService.logout(rawToken, currentUser);

        // Supprime le cookie
        clearRefreshTokenCookie(httpResponse);

        return ResponseEntity.ok(ApiResponse.ok("Déconnexion réussie"));
    }

    // ===== Email verification =====

    @GetMapping("/verify-email")
    @Operation(summary = "Vérifier l'adresse email via token")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@RequestParam String token) {
        notificationAuthService.verifyEmail(token);
        return ResponseEntity.ok(ApiResponse.ok("Email vérifié avec succès"));
    }

    // ===== Password reset =====

    @PostMapping("/forgot-password")
    @Operation(summary = "Demander un email de réinitialisation")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        // Toujours 200 pour éviter l'énumération d'emails
        notificationAuthService.sendPasswordResetEmail(request.getEmail());
        return ResponseEntity.ok(ApiResponse.ok(
                "Si cet email existe, un lien de réinitialisation vous a été envoyé"));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Réinitialiser le mot de passe")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        notificationAuthService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.ok("Mot de passe réinitialisé avec succès"));
    }

    // ===== Me =====

    @GetMapping("/me")
    @Operation(summary = "Récupérer le profil de l'utilisateur connecté")
    public ResponseEntity<ApiResponse<TokenResponse.UserInfo>> me(
            @AuthenticationPrincipal User currentUser) {

        TokenResponse.UserInfo userInfo = TokenResponse.UserInfo.builder()
                .id(currentUser.getId())
                .email(currentUser.getEmail())
                .firstName(currentUser.getFirstName())
                .lastName(currentUser.getLastName())
                .role(currentUser.getRole().name())
                .emailVerified(currentUser.isEmailVerified())
                .build();

        return ResponseEntity.ok(ApiResponse.ok(userInfo));
    }

    // ===== Helpers =====

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true); // HTTPS uniquement
        cookie.setPath("/api/auth");
        cookie.setMaxAge((int) (refreshTokenExpirationMs / 1000));
        // SameSite=Strict via header manuel (Servlet API ne supporte pas encore nativement)
        response.addHeader("Set-Cookie",
                String.format("refreshToken=%s; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=%d",
                        refreshToken, refreshTokenExpirationMs / 1000));
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        response.addHeader("Set-Cookie",
                "refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=0");
    }

    private String extractRefreshTokenFromCookieOrBody(
            HttpServletRequest request, RefreshTokenRequest body) {

        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("refreshToken".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }

        if (body != null && body.getRefreshToken() != null) {
            return body.getRefreshToken();
        }

        throw new com.plateforme.common.exception.InvalidTokenException("Refresh token manquant");
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
