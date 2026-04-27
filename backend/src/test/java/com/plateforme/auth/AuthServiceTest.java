package com.plateforme.auth;

import com.plateforme.auth.dto.RegisterRequest;
import com.plateforme.auth.dto.TokenResponse;
import com.plateforme.auth.service.AuthService;
import com.plateforme.common.exception.ConflictException;
import com.plateforme.users.entity.User;
import com.plateforme.users.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("AuthService — Tests")
class AuthServiceTest {

    @Autowired AuthService    authService;
    @Autowired UserRepository userRepository;

    @Test
    @DisplayName("Inscription client réussie — retourne un token valide")
    void register_success() {
        TokenResponse response = authService.register(client("alice_test@test.cm"), null, null);
        assertThat(response.getAccessToken()).isNotBlank();
        assertThat(response.getUser().getEmail()).isEqualTo("alice_test@test.cm");
    }

    @Test
    @DisplayName("Inscription prestataire — code de parrainage généré")
    void register_provider_generates_referral_code() {
        authService.register(provider("bob_test@test.cm", "Bob SARL"), null, null);
        User saved = userRepository.findByEmail("bob_test@test.cm").orElseThrow();
        assertThat(saved.getReferralCode()).isNotBlank().hasSize(8);
    }

    @Test
    @DisplayName("Inscription email dupliqué — lève ConflictException")
    void register_duplicate_email_throws() {
        authService.register(client("dup_test@test.cm"), null, null);
        assertThatThrownBy(() -> authService.register(client("dup_test@test.cm"), null, null))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("Connexion réussie — retourne token")
    void login_success() {
        authService.register(client("login_test@test.cm"), null, null);
        TokenResponse response = authService.login(buildLogin("login_test@test.cm", "Password123!"), null, null);
        assertThat(response.getAccessToken()).isNotBlank();
    }

    @Test
    @DisplayName("Connexion mot de passe incorrect — lève exception")
    void login_wrong_password_throws() {
        authService.register(client("wrong_test@test.cm"), null, null);
        assertThatThrownBy(() -> authService.login(buildLogin("wrong_test@test.cm", "MauvaisPass!"), null, null))
                .isInstanceOf(Exception.class);
    }

    // email, password, firstName, lastName, phone, referralCode, role, companyName, city
    private RegisterRequest client(String email) {
        return new RegisterRequest(email, "Password123!", "Test", "User", null, null, User.Role.CLIENT, null, null);
    }

    private RegisterRequest provider(String email, String companyName) {
        return new RegisterRequest(email, "Password123!", "Test", "User", null, null, User.Role.PROVIDER, companyName, null);
    }

    private com.plateforme.auth.dto.LoginRequest buildLogin(String email, String password) {
        com.plateforme.auth.dto.LoginRequest req = new com.plateforme.auth.dto.LoginRequest();
        try {
            var f1 = req.getClass().getDeclaredField("email");
            var f2 = req.getClass().getDeclaredField("password");
            f1.setAccessible(true); f2.setAccessible(true);
            f1.set(req, email); f2.set(req, password);
        } catch (Exception e) { throw new RuntimeException(e); }
        return req;
    }
}