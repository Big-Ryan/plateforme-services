package com.plateforme.users.service;

import com.plateforme.common.exception.ResourceNotFoundException;
import com.plateforme.users.dto.*;
import com.plateforme.users.entity.ClientProfile;
import com.plateforme.users.entity.ProviderProfile;
import com.plateforme.users.entity.User;
import com.plateforme.users.repository.ClientProfileRepository;
import com.plateforme.users.repository.ProviderProfileRepository;
import com.plateforme.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final ClientProfileRepository clientProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(User currentUser) {
        if (currentUser.getRole() == User.Role.PROVIDER) {
            ProviderProfile profile = providerProfileRepository.findByUserId(currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Profil prestataire", currentUser.getId()));
            return UserProfileResponse.fromProvider(currentUser, profile);
        } else {
            ClientProfile profile = clientProfileRepository.findByUserId(currentUser.getId())
                    .orElse(null);
            return UserProfileResponse.fromClient(currentUser, profile);
        }
    }

    @Transactional
    public UserProfileResponse updateProfile(User currentUser, UpdateProfileRequest request) {
        currentUser.setFirstName(request.getFirstName());
        currentUser.setLastName(request.getLastName());
        if (request.getPhone() != null) {
            currentUser.setPhone(request.getPhone());
        }
        userRepository.save(currentUser);

        if (currentUser.getRole() == User.Role.PROVIDER) {
            ProviderProfile profile = providerProfileRepository.findByUserId(currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Profil prestataire", currentUser.getId()));

            if (request.getCompanyName() != null) profile.setCompanyName(request.getCompanyName());
            if (request.getDescription() != null) profile.setDescription(request.getDescription());
            if (request.getWebsite() != null) profile.setWebsite(request.getWebsite());
            if (request.getAddress() != null) profile.setAddress(request.getAddress());
            if (request.getCity() != null) profile.setCity(request.getCity());

            providerProfileRepository.save(profile);
            return UserProfileResponse.fromProvider(currentUser, profile);
        }

        ClientProfile profile = clientProfileRepository.findByUserId(currentUser.getId()).orElse(null);
        if (profile != null && request.getCompanyName() != null) {
            profile.setCompanyName(request.getCompanyName());
            clientProfileRepository.save(profile);
        }
        return UserProfileResponse.fromClient(currentUser, profile);
    }

    @Transactional
    public void changePassword(User currentUser, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPassword())) {
            throw new com.plateforme.common.exception.BusinessException("Mot de passe actuel incorrect");
        }
        currentUser.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(currentUser);
        log.info("Mot de passe changé pour userId={}", currentUser.getId());
    }

    @Transactional
    public void updateLogoUrl(UUID userId, String logoUrl) {
        ProviderProfile profile = providerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profil prestataire", userId));
        profile.setLogoUrl(logoUrl);
        providerProfileRepository.save(profile);
    }

    @Transactional(readOnly = true)
    public ProviderPublicResponse getPublicProviderProfile(UUID providerId) {
        ProviderProfile profile = providerProfileRepository.findByUserIdWithUser(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Prestataire", providerId));
        return ProviderPublicResponse.from(profile);
    }
}
