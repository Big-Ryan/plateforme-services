package com.plateforme.users.repository;

import com.plateforme.users.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByReferralCode(String referralCode);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.id = :id AND u.isActive = true")
    Optional<User> findActiveById(UUID id);

    @Modifying
    @Query("UPDATE User u SET u.isActive = false WHERE u.id = :id")
    void deactivate(UUID id);

    @Modifying
    @Query("UPDATE User u SET u.emailVerified = true WHERE u.id = :id")
    void verifyEmail(UUID id);

    long countByRole(User.Role role);

    org.springframework.data.domain.Page<User> findByRole(
            User.Role role, org.springframework.data.domain.Pageable pageable);
}