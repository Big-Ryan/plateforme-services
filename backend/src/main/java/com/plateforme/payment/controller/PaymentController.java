package com.plateforme.payment.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plateforme.payment.service.PayPalWebhookService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/payments/paypal")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PayPalWebhookService webhookService;
    private final ObjectMapper objectMapper;

    /**
     * Webhook PayPal — endpoint public, signature HMAC vérifiée dans le service.
     * On lit le body brut une seule fois via HttpServletRequest pour la vérification
     * de signature, puis on le désérialise en Map pour le traitement.
     * POST /api/payments/paypal/webhook
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(
            HttpServletRequest request,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-ID",   required = false) String transmissionId,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-TIME", required = false) String transmissionTime,
            @RequestHeader(value = "PAYPAL-CERT-URL",          required = false) String certUrl,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-SIG",  required = false) String transmissionSig,
            @RequestHeader(value = "PAYPAL-AUTH-ALGO",         required = false) String authAlgo) {

        String rawBody;
        try {
            rawBody = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("Impossible de lire le body du webhook PayPal", e);
            return ResponseEntity.badRequest().build();
        }

        // Vérification signature HMAC
        boolean valid = webhookService.verifySignature(
                rawBody, transmissionId, transmissionTime, certUrl, transmissionSig, authAlgo);

        if (!valid) {
            log.warn("Webhook PayPal — signature invalide, requête ignorée");
            return ResponseEntity.badRequest().build();
        }

        try {
            Map<String, Object> payload = objectMapper.readValue(
                    rawBody, new TypeReference<>() {});
            webhookService.processEvent(payload);
        } catch (Exception e) {
            log.error("Erreur de désérialisation webhook PayPal : {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok().build();
    }
}
