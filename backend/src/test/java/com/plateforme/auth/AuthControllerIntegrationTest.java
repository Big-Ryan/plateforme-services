package com.plateforme.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plateforme.users.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Auth API — Tests HTTP")
class AuthControllerIntegrationTest {

    @Autowired MockMvc        mockMvc;
    @Autowired ObjectMapper   objectMapper;
    @Autowired UserRepository userRepository;

    @Test
    @DisplayName("POST /api/auth/register — retourne un token")
    void register_returns200_withToken() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "http_test@plateforme.cm",
                                "password", "Password123!",
                                "firstName", "Test",
                                "lastName", "User",
                                "role", "CLIENT"
                        ))))
                .andExpect(status().is2xxSuccessful())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/auth/register — 409 ou 4xx si email dupliqué")
    void register_duplicate_returns409() throws Exception {
        String json = objectMapper.writeValueAsString(Map.of(
                "email", "dup_http@plateforme.cm", "password", "Password123!",
                "firstName", "Dup", "lastName", "User", "role", "CLIENT"
        ));
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().is2xxSuccessful());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("POST /api/auth/register — 400 si champs manquants")
    void register_missing_fields_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"incomplete@test.cm\"}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("GET /api/me — 401 sans token")
    void protected_endpoint_without_token_returns401() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/services — 200 sans token (public)")
    void public_catalogue_accessible_without_token() throws Exception {
        mockMvc.perform(get("/api/services"))
                .andExpect(status().isOk());
    }
}