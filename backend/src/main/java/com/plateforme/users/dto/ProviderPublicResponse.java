package com.plateforme.users.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.plateforme.users.entity.ProviderProfile;
import com.plateforme.users.entity.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProviderPublicResponse {

    private UUID id;
    private String companyName;
    private String description;
    private String logoUrl;
    private String website;
    private String city;
    private String country;
    private boolean verified;
    private String firstName;
    private String lastName;
    private LocalDateTime memberSince;

    public static ProviderPublicResponse from(ProviderProfile profile) {
        User user = profile.getUser();
        return ProviderPublicResponse.builder()
                .id(user.getId())
                .companyName(profile.getCompanyName())
                .description(profile.getDescription())
                .logoUrl(profile.getLogoUrl())
                .website(profile.getWebsite())
                .city(profile.getCity())
                .country(profile.getCountry())
                .verified(profile.isVerified())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .memberSince(user.getCreatedAt())
                .build();
    }
}
