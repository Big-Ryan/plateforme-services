package com.plateforme.referral.controller;

import com.plateforme.common.dto.ApiResponse;
import com.plateforme.referral.service.ReferralService;
import com.plateforme.users.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ReferralController {

    private final ReferralService referralService;

    @GetMapping("/api/referral/stats")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<ApiResponse<ReferralService.ReferralStats>> getMyStats(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.<ReferralService.ReferralStats>ok(referralService.getStats(user.getId())));
    }

    @GetMapping("/api/referral/my-code")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<ApiResponse<String>> getMyCode(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok("code", user.getReferralCode()));
    }
}