package com.plateforme.users.repository;

import com.plateforme.users.entity.ProviderProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProviderProfileRepository extends JpaRepository<ProviderProfile, UUID> {

    Optional<ProviderProfile> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);

    @Query("SELECT pp FROM ProviderProfile pp JOIN FETCH pp.user WHERE pp.user.id = :userId")
    Optional<ProviderProfile> findByUserIdWithUser(UUID userId);
}
