package com.plateforme.common.exception;

import com.plateforme.common.dto.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.List;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // ===== Validation =====

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        List<ApiError.FieldError> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(fe -> ApiError.FieldError.builder()
                        .field(fe.getField())
                        .rejectedValue(fe.getRejectedValue())
                        .message(fe.getDefaultMessage())
                        .build())
                .toList();

        // Validation → DEBUG (pas besoin de voir ça en console en dev)
        log.debug("Validation échouée sur {} : {}", request.getRequestURI(), fieldErrors);

        ApiError error = ApiError.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error("VALIDATION_ERROR")
                .message("Données invalides")
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .fieldErrors(fieldErrors)
                .build();

        return ResponseEntity.badRequest().body(error);
    }

    // ===== Exceptions métier — WARN sans stacktrace =====

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(
            ResourceNotFoundException ex, HttpServletRequest request) {
        log.warn("Ressource introuvable [{}] : {}", request.getRequestURI(), ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiError> handleConflict(
            ConflictException ex, HttpServletRequest request) {
        log.warn("Conflit [{}] : {}", request.getRequestURI(), ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage(), request);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiError> handleBusiness(
            BusinessException ex, HttpServletRequest request) {
        log.warn("Erreur métier [{}] : {}", request.getRequestURI(), ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), request);
    }

    @ExceptionHandler(SubscriptionRequiredException.class)
    public ResponseEntity<ApiError> handleSubscriptionRequired(
            SubscriptionRequiredException ex, HttpServletRequest request) {
        log.warn("Abonnement requis [{}] : {}", request.getRequestURI(), ex.getMessage());
        return buildResponse(HttpStatus.PAYMENT_REQUIRED, "SUBSCRIPTION_REQUIRED", ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ApiError> handleInvalidToken(
            InvalidTokenException ex, HttpServletRequest request) {
        log.warn("Token invalide [{}] : {}", request.getRequestURI(), ex.getMessage());
        return buildResponse(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", ex.getMessage(), request);
    }

    // ===== Sécurité — WARN sans stacktrace =====

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(
            BadCredentialsException ex, HttpServletRequest request) {
        log.warn("Tentative de connexion échouée [{}]", request.getRequestURI());
        return buildResponse(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                "Email ou mot de passe incorrect", request);
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiError> handleDisabled(
            DisabledException ex, HttpServletRequest request) {
        log.warn("Compte désactivé [{}]", request.getRequestURI());
        return buildResponse(HttpStatus.UNAUTHORIZED, "ACCOUNT_DISABLED",
                "Compte désactivé, contactez le support", request);
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<ApiError> handleLocked(
            LockedException ex, HttpServletRequest request) {
        log.warn("Compte bloqué [{}]", request.getRequestURI());
        return buildResponse(HttpStatus.UNAUTHORIZED, "ACCOUNT_LOCKED",
                "Compte temporairement bloqué", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        log.warn("Accès refusé [{}]", request.getRequestURI());
        return buildResponse(HttpStatus.FORBIDDEN, "FORBIDDEN",
                "Accès refusé : permissions insuffisantes", request);
    }

    // ===== Upload — WARN avec message =====

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> handleMaxUploadSize(
            MaxUploadSizeExceededException ex, HttpServletRequest request) {
        log.warn("Fichier trop volumineux [{}]", request.getRequestURI());
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE",
                "Fichier trop volumineux (max 10 Mo)", request);
    }

    @ExceptionHandler(StorageException.class)
    public ResponseEntity<ApiError> handleStorage(
            StorageException ex, HttpServletRequest request) {
        // Storage → ERROR avec cause mais sans stacktrace complet
        log.error("Erreur stockage [{}] : {}", request.getRequestURI(), ex.getMessage());
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR",
                "Erreur lors du traitement du fichier", request);
    }

    // ===== RuntimeException connues — WARN =====

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiError> handleRuntime(
            RuntimeException ex, HttpServletRequest request) {
        // RuntimeExceptions métier (PayPal, etc.) → WARN sans stacktrace
        log.warn("Erreur runtime [{}] : {}", request.getRequestURI(), ex.getMessage());
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "RUNTIME_ERROR",
                ex.getMessage() != null ? ex.getMessage() : "Une erreur s'est produite", request);
    }

    // ===== Catch-all — ERROR avec stacktrace (vraies erreurs inattendues) =====

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(
            Exception ex, HttpServletRequest request) {
        // Seulement les vraies erreurs inattendues méritent le stacktrace complet
        log.error("Erreur inattendue [{}] : {}", request.getRequestURI(), ex.getMessage(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "Une erreur interne s'est produite", request);
    }

    // ===== Helper =====

    private ResponseEntity<ApiError> buildResponse(
            HttpStatus status, String errorCode, String message, HttpServletRequest request) {
        ApiError error = ApiError.builder()
                .status(status.value())
                .error(errorCode)
                .message(message)
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(status).body(error);
    }
}