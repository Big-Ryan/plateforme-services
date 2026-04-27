package com.plateforme.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Service PayPal — API Subscriptions v1/billing/subscriptions
 * Compatible avec les plans créés via /v1/billing/plans (Subscriptions, pas Deprecated)
 */
@Service
@Slf4j
public class PayPalApiService {

    @Value("${paypal.client-id}")
    private String clientId;

    @Value("${paypal.client-secret}")
    private String clientSecret;

    @Value("${paypal.mode:sandbox}")
    private String mode;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    private String getBaseUrl() {
        return "sandbox".equals(mode)
                ? "https://api-m.sandbox.paypal.com"
                : "https://api-m.paypal.com";
    }

    public String getAccessToken() {
        String credentials = Base64.getEncoder()
                .encodeToString((clientId + ":" + clientSecret).getBytes());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set("Authorization", "Basic " + credentials);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");

        ResponseEntity<Map> response = restTemplate.postForEntity(
                getBaseUrl() + "/v1/oauth2/token",
                new HttpEntity<>(body, headers), Map.class);

        if (response.getBody() == null) throw new RuntimeException("Token PayPal introuvable");
        return (String) response.getBody().get("access_token");
    }

    /**
     * Crée un abonnement PayPal via l'API Subscriptions.
     * Le plan doit être créé via POST /v1/billing/plans (pas Billing Plans deprecated).
     */
    public PayPalSubscriptionResult createSubscription(
            String paypalPlanId, String internalSubscriptionId) {

        String token = getAccessToken();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, Object> payload = new HashMap<>();
        payload.put("plan_id", paypalPlanId);
        payload.put("custom_id", internalSubscriptionId);
        payload.put("application_context", Map.of(
                "brand_name", "Plateforme Services",
                "locale", "fr-CM",
                "shipping_preference", "NO_SHIPPING",
                "user_action", "SUBSCRIBE_NOW",
                "return_url", frontendUrl + "/provider/subscription/success",
                "cancel_url", frontendUrl + "/provider/subscription/cancel"
        ));

        log.info("Création abonnement PayPal pour plan={}", paypalPlanId);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                    getBaseUrl() + "/v1/billing/subscriptions",
                    new HttpEntity<>(payload, headers), JsonNode.class);

            if (response.getBody() == null) throw new RuntimeException("Réponse PayPal vide");

            JsonNode body = response.getBody();
            String paypalSubId = body.get("id").asText();

            String approvalUrl = null;
            if (body.has("links")) {
                for (JsonNode link : body.get("links")) {
                    if ("approve".equals(link.get("rel").asText())) {
                        approvalUrl = link.get("href").asText();
                        break;
                    }
                }
            }

            if (approvalUrl == null) throw new RuntimeException("URL d'approbation introuvable");

            log.info("Abonnement PayPal créé : id={}", paypalSubId);
            return new PayPalSubscriptionResult(paypalSubId, approvalUrl);

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("Erreur PayPal {} : {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Erreur PayPal : " + e.getResponseBodyAsString());
        }
    }

    public void cancelSubscription(String paypalSubscriptionId, String reason) {
        if (paypalSubscriptionId == null || paypalSubscriptionId.isBlank()) return;
        try {
            String token = getAccessToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(token);
            restTemplate.postForEntity(
                    getBaseUrl() + "/v1/billing/subscriptions/" + paypalSubscriptionId + "/cancel",
                    new HttpEntity<>(Map.of("reason", reason != null ? reason : "Annulé"), headers),
                    Void.class);
            log.info("Abonnement PayPal annulé : {}", paypalSubscriptionId);
        } catch (Exception e) {
            log.warn("Impossible d'annuler {} : {}", paypalSubscriptionId, e.getMessage());
        }
    }

    public record PayPalSubscriptionResult(String paypalSubscriptionId, String approvalUrl) {}
}