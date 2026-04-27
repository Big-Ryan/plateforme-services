package com.plateforme.users.repository;

import com.plateforme.users.entity.ClientProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClientProfileRepository extends JpaRepository<ClientProfile, UUID> {
    Optional<ClientProfile> findByUserId(UUID userId);
    boolean existsByUserId(UUID userId);
}
