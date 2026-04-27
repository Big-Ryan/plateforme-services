package com.plateforme.common.storage;

import com.plateforme.common.dto.ApiResponse;
import com.plateforme.users.entity.User;
import com.plateforme.users.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Stockage fichiers")
public class StorageController {

    private final StorageService storageService;
    private final UserService userService;

    // ===== Upload logo prestataire =====

    @Operation(summary = "Uploader le logo de son entreprise")
    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadLogo(
            @AuthenticationPrincipal User currentUser,
            @RequestParam("file") MultipartFile file) {

        String url = storageService.uploadImage(file, "public/logos");
        userService.updateLogoUrl(currentUser.getId(), url);

        return ResponseEntity.ok(ApiResponse.ok(
                "Logo uploadé avec succès", Map.of("url", url)));
    }

    // ===== Upload images de service =====

    @Operation(summary = "Uploader des images pour un service (max 5)")
    @PostMapping(value = "/service-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<ApiResponse<Map<String, List<String>>>> uploadServiceImages(
            @AuthenticationPrincipal User currentUser,
            @RequestParam("files") List<MultipartFile> files) {

        if (files.size() > 5) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.<Map<String, List<String>>>builder()
                            .success(false)
                            .message("Maximum 5 images par service")
                            .build());
        }

        List<String> urls = new ArrayList<>();
        for (MultipartFile file : files) {
            String url = storageService.uploadImage(file, "public/services/" + currentUser.getId());
            urls.add(url);
        }

        return ResponseEntity.ok(ApiResponse.ok(
                "Images uploadées", Map.of("urls", urls)));
    }
}
