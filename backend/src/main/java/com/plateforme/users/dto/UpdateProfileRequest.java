package com.plateforme.users.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateProfileRequest {

    @Size(max = 100)
    private String firstName;

    @Size(max = 100)
    private String lastName;

    @Size(max = 20)
    private String phone;

    @Size(max = 255)
    private String companyName;

    private String description;

    @Size(max = 255)
    private String website;

    @Size(max = 500)
    private String address;

    @Size(max = 100)
    private String city;
}
