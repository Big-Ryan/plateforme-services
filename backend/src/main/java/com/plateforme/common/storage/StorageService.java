package com.plateforme.common.storage;

import com.plateforme.common.exception.StorageException;
import io.minio.*;
import io.minio.http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class StorageService {

    private final MinioClient minioClient;

    @Value("${storage.minio.bucket-name}")
    private String bucketName;

    @Value("${storage.minio.endpoint}")
    private String endpoint;

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024L; // 10 Mo
    private static final List<String> ALLOWED_IMAGE_TYPES = Arrays.asList(
            "image/jpeg", "image/jpg", "image/png", "image/webp");

    public StorageService(
            @Value("${storage.minio.endpoint}")   String endpoint,
            @Value("${storage.minio.access-key}") String accessKey,
            @Value("${storage.minio.secret-key}") String secretKey) {

        this.minioClient = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
        this.endpoint = endpoint;
    }

    // ===== Upload image =====

    public String uploadImage(MultipartFile file, String folder) {
        validateImageFile(file);

        String extension = getExtension(file.getOriginalFilename());
        String objectName = folder + "/" + UUID.randomUUID() + "." + extension;

        try {
            ensureBucketExists();

            try (InputStream inputStream = file.getInputStream()) {
                minioClient.putObject(PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .stream(inputStream, file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build());
            }

            log.info("Fichier uploadé : {}/{}", bucketName, objectName);
            return getPublicUrl(objectName);

        } catch (Exception e) {
            log.error("Erreur upload fichier vers MinIO : {}", e.getMessage());
            throw new StorageException("Erreur lors de l'upload du fichier", e);
        }
    }

    // ===== Supprimer =====

    public void deleteFile(String fileUrl) {
        try {
            String objectName = extractObjectName(fileUrl);
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .build());
            log.info("Fichier supprimé : {}/{}", bucketName, objectName);
        } catch (Exception e) {
            log.warn("Impossible de supprimer le fichier {} : {}", fileUrl, e.getMessage());
        }
    }

    // ===== URL présignée (accès temporaire pour fichiers privés) =====

    public String getPresignedUrl(String objectName, int expiryMinutes) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucketName)
                    .object(objectName)
                    .expiry(expiryMinutes, TimeUnit.MINUTES)
                    .build());
        } catch (Exception e) {
            throw new StorageException("Impossible de générer l'URL présignée", e);
        }
    }

    // ===== Helpers =====

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new StorageException("Fichier vide ou manquant", null);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new StorageException(
                    "Fichier trop volumineux (max " + MAX_FILE_SIZE / 1024 / 1024 + " Mo)", null);
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new StorageException(
                    "Type de fichier non autorisé. Types acceptés : JPEG, PNG, WebP", null);
        }
    }

    private void ensureBucketExists() {
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                // Politique publique en lecture (pour les logos/images de services)
                String policy = """
                    {
                        "Version":"2012-10-17",
                        "Statement":[{
                            "Effect":"Allow",
                            "Principal":{"AWS":["*"]},
                            "Action":["s3:GetObject"],
                            "Resource":["arn:aws:s3:::%s/public/*"]
                        }]
                    }
                    """.formatted(bucketName);
                minioClient.setBucketPolicy(SetBucketPolicyArgs.builder()
                        .bucket(bucketName)
                        .config(policy)
                        .build());
                log.info("Bucket {} créé avec politique publique", bucketName);
            }
        } catch (Exception e) {
            throw new StorageException("Impossible de vérifier/créer le bucket", e);
        }
    }

    private String getPublicUrl(String objectName) {
        return endpoint + "/" + bucketName + "/" + objectName;
    }

    private String extractObjectName(String fileUrl) {
        // Ex: http://minio:9000/plateforme/logos/uuid.jpg → logos/uuid.jpg
        String prefix = endpoint + "/" + bucketName + "/";
        if (fileUrl.startsWith(prefix)) {
            return fileUrl.substring(prefix.length());
        }
        return fileUrl;
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "jpg";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
