package com.plateforme.users.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.plateforme.users.entity.ClientProfile;
import com.plateforme.users.entity.ProviderProfile;
import com.plateforme.users.entity.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserProfileResponse {

    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String role;
    private boolean emailVerified;
    private LocalDateTime createdAt;

    // Champs prestataire
    private String companyName;
    private String description;
    private String logoUrl;
    private String website;
    private String address;
    private String city;
    private String country;
    private boolean verified;

    public static UserProfileResponse fromProvider(User user, ProviderProfile profile) {
        UserProfileResponseBuilder b = UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt());

        if (profile != null) {
            b.companyName(profile.getCompanyName())
             .description(profile.getDescription())
             .logoUrl(profile.getLogoUrl())
             .website(profile.getWebsite())
             .address(profile.getAddress())
             .city(profile.getCity())
             .country(profile.getCountry())
             .verified(profile.isVerified());
        }
        return b.build();
    }

    public static UserProfileResponse fromClient(User user, ClientProfile profile) {
        UserProfileResponseBuilder b = UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt());
        if (profile != null) {
            b.companyName(profile.getCompanyName());
        }
        return b.build();
    }
}
