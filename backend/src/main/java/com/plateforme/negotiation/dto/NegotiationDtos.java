package com.plateforme.negotiation.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.plateforme.negotiation.entity.Negotiation;
import com.plateforme.negotiation.entity.NegotiationMessage;
import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class NegotiationDtos {

    // ===== Initier une négociation =====

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InitiateRequest {

        @NotNull(message = "L'ID du service est obligatoire")
        private UUID serviceId;

        @NotBlank(message = "Le message initial est obligatoire")
        @Size(max = 2000)
        private String initialMessage;

        private String mode; // INTERNAL | EXTERNAL (défaut : INTERNAL)

        // Données visiteur non-inscrit
        @Size(max = 255)
        private String clientName;

        @Size(max = 20)
        private String clientPhone;

        @Email
        @Size(max = 255)
        private String clientEmail;
    }

    // ===== Envoyer un message =====

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendMessageRequest {

        @NotBlank(message = "Le contenu du message est obligatoire")
        @Size(max = 2000, message = "Le message ne doit pas dépasser 2000 caractères")
        private String content;
    }

    // ===== Mettre à jour le statut =====

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateStatusRequest {

        @NotBlank
        private String status; // IN_PROGRESS | AGREED | CLOSED | REJECTED

        private BigDecimal agreedPrice;
        private String notes;
    }

    // ===== Réponses =====

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class NegotiationSummary {
        private UUID id;
        private String status;
        private String mode;
        private String clientName;
        private String serviceTitle;
        private UUID serviceId;
        private long unreadCount;
        private LocalDateTime updatedAt;
        private LocalDateTime createdAt;

        public static NegotiationSummary from(Negotiation n, long unread) {
            return NegotiationSummary.builder()
                    .id(n.getId())
                    .status(n.getStatus().name())
                    .mode(n.getMode().name())
                    .clientName(n.getDisplayClientName())
                    .serviceTitle(n.getService() != null ? n.getService().getTitle() : null)
                    .serviceId(n.getService() != null ? n.getService().getId() : null)
                    .unreadCount(unread)
                    .updatedAt(n.getUpdatedAt())
                    .createdAt(n.getCreatedAt())
                    .build();
        }
    }

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class NegotiationDetail {
        private UUID id;
        private String status;
        private String mode;
        private String notes;
        private BigDecimal agreedPrice;
        private String clientName;
        private String clientPhone;
        private String clientEmail;
        private UUID providerId;
        private String providerName;
        private UUID serviceId;
        private String serviceTitle;
        private List<MessageResponse> messages;
        private LocalDateTime updatedAt;
        private LocalDateTime createdAt;

        public static NegotiationDetail from(Negotiation n, List<MessageResponse> messages) {
            return NegotiationDetail.builder()
                    .id(n.getId())
                    .status(n.getStatus().name())
                    .mode(n.getMode().name())
                    .notes(n.getNotes())
                    .agreedPrice(n.getAgreedPrice())
                    .clientName(n.getDisplayClientName())
                    .clientPhone(n.getClientPhone())
                    .clientEmail(n.getClientEmail())
                    .providerId(n.getProvider().getId())
                    .providerName(n.getProvider().getFullName())
                    .serviceId(n.getService() != null ? n.getService().getId() : null)
                    .serviceTitle(n.getService() != null ? n.getService().getTitle() : null)
                    .messages(messages)
                    .updatedAt(n.getUpdatedAt())
                    .createdAt(n.getCreatedAt())
                    .build();
        }
    }

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class MessageResponse {
        private UUID id;
        private UUID senderId;
        private String senderName;
        private String content;
        private boolean isRead;
        private LocalDateTime sentAt;

        public static MessageResponse from(NegotiationMessage m) {
            return MessageResponse.builder()
                    .id(m.getId())
                    .senderId(m.getSender().getId())
                    .senderName(m.getSender().getFullName())
                    .content(m.getContent())
                    .isRead(m.isRead())
                    .sentAt(m.getSentAt())
                    .build();
        }
    }
}
