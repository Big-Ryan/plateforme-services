package com.plateforme.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TokenResponse {

    private String accessToken;
    private String tokenType;
    private long expiresIn;

    // Refresh token retourné uniquement lors du login/register
    // En prod il est mis en HttpOnly cookie; ici on le retourne aussi dans le body
    // pour faciliter le dev mobile/API
    private String refreshToken;

    private UserInfo user;

    @Getter
    @Builder
    public static class UserInfo {
        private UUID id;
        private String email;
        private String firstName;
        private String lastName;
        private String role;
        private boolean emailVerified;
    }
}
