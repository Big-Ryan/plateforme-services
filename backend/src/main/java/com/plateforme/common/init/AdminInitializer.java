package com.plateforme.common.init;

import com.plateforme.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminInitializer implements ApplicationRunner {

    private final UserRepository    userRepository;
    private final PasswordEncoder   passwordEncoder;

    @Value("${admin.password:#{null}}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminPassword == null || adminPassword.isBlank()) return;

        userRepository.findByEmail("admin@plateforme.cm").ifPresent(admin -> {
            admin.setPassword(passwordEncoder.encode(adminPassword));
            userRepository.save(admin);
            log.info("Mot de passe admin mis à jour depuis la variable ADMIN_PASSWORD");
        });
    }
}