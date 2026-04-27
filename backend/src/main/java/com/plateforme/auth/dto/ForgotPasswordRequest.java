package com.plateforme.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ForgotPasswordRequest {

    @NotBlank
    @Email(message = "Format email invalide")
    private String email;
}
