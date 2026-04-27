package com.plateforme.negotiation.service;

import com.plateforme.catalogue.entity.ServiceOffer;
import com.plateforme.catalogue.repository.ServiceOfferRepository;
import com.plateforme.common.dto.PageResponse;
import com.plateforme.common.exception.BusinessException;
import com.plateforme.common.exception.ResourceNotFoundException;
import com.plateforme.negotiation.dto.NegotiationDtos.*;
import com.plateforme.negotiation.entity.Negotiation;
import com.plateforme.negotiation.entity.NegotiationMessage;
import com.plateforme.negotiation.repository.NegotiationMessageRepository;
import com.plateforme.negotiation.repository.NegotiationRepository;
import com.plateforme.users.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NegotiationService {

    private final NegotiationRepository negotiationRepository;
    private final NegotiationMessageRepository messageRepository;
    private final ServiceOfferRepository serviceOfferRepository;

    // ===== Initier =====

    @Transactional
    public NegotiationDetail initiate(User currentUser, InitiateRequest request) {
        ServiceOffer service = serviceOfferRepository.findById(request.getServiceId())
                .filter(s -> s.getStatus() == ServiceOffer.Status.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Service", request.getServiceId()));

        // Un prestataire ne peut pas contacter lui-même
        if (currentUser != null && currentUser.getId().equals(service.getProvider().getId())) {
            throw new BusinessException("Vous ne pouvez pas initier une négociation sur votre propre service");
        }

        Negotiation.NegotiationBuilder builder = Negotiation.builder()
                .service(service)
                .provider(service.getProvider())
                .mode(parseMode(request.getMode()))
                .status(Negotiation.Status.INITIATED);

        if (currentUser != null) {
            builder.client(currentUser);
        } else {
            // Visiteur non-inscrit : données libres
            if (request.getClientName() == null && request.getClientEmail() == null) {
                throw new BusinessException("Nom ou email requis pour initier un contact sans compte");
            }
            builder.clientName(request.getClientName())
                   .clientPhone(request.getClientPhone())
                   .clientEmail(request.getClientEmail());
        }

        Negotiation negotiation = negotiationRepository.save(builder.build());

        // Message initial
        NegotiationMessage message = NegotiationMessage.builder()
                .negotiation(negotiation)
                .sender(currentUser != null ? currentUser : service.getProvider()) // sender = client ou provider
                .content(request.getInitialMessage())
                .build();
        messageRepository.save(message);

        log.info("Négociation initiée : id={}, serviceId={}", negotiation.getId(), service.getId());

        List<MessageResponse> messages = List.of(MessageResponse.from(message));
        return NegotiationDetail.from(negotiation, messages);
    }

    // ===== Liste pour prestataire =====

    @Transactional(readOnly = true)
    public PageResponse<NegotiationSummary> getProviderNegotiations(User provider, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Negotiation> results = negotiationRepository.findByProviderId(provider.getId(), pageable);
        return PageResponse.from(results.map(n -> {
            long unread = messageRepository
                    .countByNegotiationIdAndIsReadFalseAndSenderIdNot(n.getId(), provider.getId());
            return NegotiationSummary.from(n, unread);
        }));
    }

    // ===== Liste pour client =====

    @Transactional(readOnly = true)
    public PageResponse<NegotiationSummary> getClientNegotiations(User client, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Negotiation> results = negotiationRepository.findByClientId(client.getId(), pageable);
        return PageResponse.from(results.map(n -> {
            long unread = messageRepository
                    .countByNegotiationIdAndIsReadFalseAndSenderIdNot(n.getId(), client.getId());
            return NegotiationSummary.from(n, unread);
        }));
    }

    // ===== Détail =====

    @Transactional
    public NegotiationDetail getDetail(User currentUser, UUID negotiationId) {
        Negotiation negotiation = negotiationRepository
                .findByIdAndUserId(negotiationId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Négociation", negotiationId));

        // Marque les messages comme lus
        messageRepository.markAsRead(negotiationId, currentUser.getId());

        List<NegotiationMessage> messages = messageRepository.findByNegotiationId(negotiationId);
        List<MessageResponse> messageResponses = messages.stream()
                .map(MessageResponse::from)
                .collect(Collectors.toList());

        return NegotiationDetail.from(negotiation, messageResponses);
    }

    // ===== Envoyer un message =====

    @Transactional
    public MessageResponse sendMessage(User currentUser, UUID negotiationId, SendMessageRequest request) {
        Negotiation negotiation = negotiationRepository
                .findByIdAndUserId(negotiationId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Négociation", negotiationId));

        if (negotiation.getStatus() == Negotiation.Status.CLOSED
                || negotiation.getStatus() == Negotiation.Status.REJECTED) {
            throw new BusinessException("Cette négociation est fermée");
        }

        // Passe en IN_PROGRESS si c'était INITIATED
        if (negotiation.getStatus() == Negotiation.Status.INITIATED) {
            negotiation.setStatus(Negotiation.Status.IN_PROGRESS);
            negotiationRepository.save(negotiation);
        }

        NegotiationMessage message = NegotiationMessage.builder()
                .negotiation(negotiation)
                .sender(currentUser)
                .content(request.getContent())
                .build();

        messageRepository.save(message);
        return MessageResponse.from(message);
    }

    // ===== Mettre à jour le statut =====

    @Transactional
    public NegotiationDetail updateStatus(User currentUser, UUID negotiationId,
                                          UpdateStatusRequest request) {
        Negotiation negotiation = negotiationRepository
                .findByIdAndUserId(negotiationId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Négociation", negotiationId));

        Negotiation.Status newStatus = Negotiation.Status.valueOf(request.getStatus());

        // Seul le prestataire peut marquer AGREED / CLOSED
        boolean isProvider = currentUser.getId().equals(negotiation.getProvider().getId());
        if ((newStatus == Negotiation.Status.AGREED || newStatus == Negotiation.Status.CLOSED)
                && !isProvider) {
            throw new BusinessException("Seul le prestataire peut finaliser une négociation");
        }

        negotiation.setStatus(newStatus);
        if (request.getAgreedPrice() != null) {
            negotiation.setAgreedPrice(request.getAgreedPrice());
        }
        if (request.getNotes() != null) {
            negotiation.setNotes(request.getNotes());
        }

        negotiationRepository.save(negotiation);

        List<NegotiationMessage> messages = messageRepository.findByNegotiationId(negotiationId);
        return NegotiationDetail.from(negotiation,
                messages.stream().map(MessageResponse::from).collect(Collectors.toList()));
    }

    // ===== Helper =====

    private Negotiation.Mode parseMode(String mode) {
        if (mode == null) return Negotiation.Mode.INTERNAL;
        try {
            return Negotiation.Mode.valueOf(mode.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Negotiation.Mode.INTERNAL;
        }
    }
}
