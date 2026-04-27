package com.plateforme.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plateforme.auth.dto.LoginRequest;
import com.plateforme.auth.dto.RegisterRequest;
import com.plateforme.users.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@DisplayName("Tests d'intégration Auth")
class AuthIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("plateforme_test")
            .withUsername("test_user")
            .withPassword("test_password");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        // Désactiver Redis pour les tests
        registry.add("spring.data.redis.host", () -> "localhost");
        registry.add("spring.data.redis.port", () -> "6379");
        registry.add("jwt.secret", () -> "dGVzdC1zZWNyZXQtY2xleS10ZXN0LXNlY3JldC1jbGV5LXRlc3Qtc2VjcmV0LWNsZXktdGVzdA==");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Inscription client → retourne 201 avec access token")
    void register_client_returns_201_with_token() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("test.client@example.com")
                .password("Test@1234!")
                .firstName("Jean")
                .lastName("Dupont")
                .role(User.Role.CLIENT)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value("test.client@example.com"))
                .andExpect(jsonPath("$.data.user.role").value("CLIENT"));
    }

    @Test
    @DisplayName("Inscription prestataire sans companyName → retourne 400")
    void register_provider_without_company_returns_400() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("provider@example.com")
                .password("Test@1234!")
                .firstName("Marie")
                .lastName("Martin")
                .role(User.Role.PROVIDER)
                // companyName manquant
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"));
    }

    @Test
    @DisplayName("Login avec mauvais mot de passe → 401 sans exposer si l'email existe")
    void login_wrong_password_returns_401() throws Exception {
        // D'abord créer le compte
        RegisterRequest reg = RegisterRequest.builder()
                .email("existing@example.com")
                .password("Test@1234!")
                .firstName("Test")
                .lastName("User")
                .role(User.Role.CLIENT)
                .build();
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)));

        // Mauvais mot de passe
        LoginRequest login = new LoginRequest();
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"existing@example.com\",\"password\":\"WrongPass!\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"))
                // Important : même message que "email inconnu" (anti-énumération)
                .andExpect(jsonPath("$.message").value("Email ou mot de passe incorrect"));
    }

    @Test
    @DisplayName("Accès endpoint protégé sans token → 401")
    void protected_endpoint_without_token_returns_401() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Catalogue public accessible sans token")
    void public_catalogue_accessible_without_token() throws Exception {
        mockMvc.perform(get("/api/services"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
