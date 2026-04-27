package com.plateforme.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RefreshTokenRequest {

    @NotBlank(message = "Le refresh token est obligatoire")
    private String refreshToken;
}
