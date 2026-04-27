package com.plateforme.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Value("${app.frontend-url:http://localhost:8080}")
    private String serverUrl;

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Plateforme Services — API")
                        .description("""
                                API REST de la plateforme de mise en relation prestataires/clients.
                                
                                **Authentification** : JWT Bearer token (obtenu via `/api/auth/login`).
                                Le refresh token est géré en cookie HttpOnly.
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Équipe Plateforme")
                                .email("dev@plateforme.cm"))
                        .license(new License().name("Propriétaire")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Développement"),
                        new Server().url(serverUrl).description("Production")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .name("bearerAuth")
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Token JWT obtenu via /api/auth/login")));
    }
}
