package com.plateforme.payment.service;

import com.plateforme.subscription.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayPalWebhookService {

    private final SubscriptionService subscriptionService;

    @Value("${paypal.webhook-id:}")
    private String webhookId;

    // ===== Traitement des événements =====

    public void processEvent(Map<String, Object> event) {
        String eventType = (String) event.get("event_type");
        log.info("Webhook PayPal reçu : {}", eventType);

        try {
            switch (eventType) {
                case "BILLING.SUBSCRIPTION.ACTIVATED" ->
                        handleActivated(event);
                case "BILLING.SUBSCRIPTION.RENEWED" ->
                        handleRenewed(event);
                case "BILLING.SUBSCRIPTION.CANCELLED" ->
                        handleCancelled(event);
                case "BILLING.SUBSCRIPTION.EXPIRED" ->
                        handleExpired(event);
                case "BILLING.SUBSCRIPTION.SUSPENDED" ->
                        handleSuspended(event);
                case "PAYMENT.SALE.COMPLETED" ->
                        handlePaymentCompleted(event);
                default ->
                        log.debug("Événement PayPal non géré : {}", eventType);
            }
        } catch (Exception e) {
            log.error("Erreur traitement webhook PayPal {} : {}", eventType, e.getMessage(), e);
            throw e;
        }
    }

    private void handleActivated(Map<String, Object> event) {
        String paypalSubId = extractSubscriptionId(event);
        subscriptionService.activateSubscription(paypalSubId);
    }

    private void handleRenewed(Map<String, Object> event) {
        String paypalSubId = extractSubscriptionId(event);
        subscriptionService.renewSubscription(paypalSubId);
    }

    private void handleCancelled(Map<String, Object> event) {
        String paypalSubId = extractSubscriptionId(event);
        subscriptionService.cancelSubscription(paypalSubId, "Annulé via PayPal");
    }

    private void handleExpired(Map<String, Object> event) {
        String paypalSubId = extractSubscriptionId(event);
        subscriptionService.cancelSubscription(paypalSubId, "Expiré via PayPal");
    }

    private void handleSuspended(Map<String, Object> event) {
        String paypalSubId = extractSubscriptionId(event);
        subscriptionService.suspendSubscription(paypalSubId);
    }

    private void handlePaymentCompleted(Map<String, Object> event) {
        // Enregistrement du paiement (extension future)
        log.info("Paiement complété : {}", event.get("id"));
    }

    @SuppressWarnings("unchecked")
    private String extractSubscriptionId(Map<String, Object> event) {
        Map<String, Object> resource = (Map<String, Object>) event.get("resource");
        if (resource == null) throw new IllegalArgumentException("Payload webhook sans 'resource'");
        String id = (String) resource.get("id");
        if (id == null) throw new IllegalArgumentException("ID subscription manquant dans le webhook");
        return id;
    }

    // ===== Vérification signature HMAC =====

    public boolean verifySignature(String rawBody, String transmissionId,
                                   String transmissionTime, String certUrl,
                                   String transmissionSig, String authAlgo) {
        // Implémentation simplifiée : vérification via SDK PayPal ou manual HMAC
        // En prod, utiliser le SDK PayPal qui gère la vérification complète
        // Pour l'instant on vérifie que les headers sont présents (à renforcer en prod)
        if (transmissionId == null || transmissionSig == null || transmissionTime == null) {
            log.warn("Webhook PayPal sans headers de signature");
            return false;
        }
        // TODO: Intégrer la vérification SDK PayPal complète
        // https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
        log.debug("Signature webhook non vérifiée (à activer en prod)");
        return true;
    }
}