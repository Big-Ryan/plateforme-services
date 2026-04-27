package com.plateforme.review.service;

import com.plateforme.common.exception.BusinessException;
import com.plateforme.common.exception.ResourceNotFoundException;
import com.plateforme.negotiation.entity.Negotiation;
import com.plateforme.negotiation.repository.NegotiationRepository;
import com.plateforme.review.dto.ReviewDtos;
import com.plateforme.review.entity.Review;
import com.plateforme.review.repository.ReviewRepository;
import com.plateforme.users.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewService {

    private final ReviewRepository      reviewRepository;
    private final NegotiationRepository negotiationRepository;

    // ===== Créer un avis =====

    @Transactional
    public ReviewDtos.ReviewResponse createReview(User client, ReviewDtos.CreateReviewRequest req) {

        Negotiation neg = negotiationRepository.findById(req.getNegotiationId())
                .orElseThrow(() -> new ResourceNotFoundException("Négociation", req.getNegotiationId()));

        if (neg.getClient() == null || !neg.getClient().getId().equals(client.getId()))
            throw new BusinessException("Cette négociation ne vous appartient pas");

        if (neg.getStatus() != Negotiation.Status.AGREED)
            throw new BusinessException("La prestation doit être terminée avant de laisser un avis");

        if (reviewRepository.existsByNegotiationId(req.getNegotiationId()))
            throw new BusinessException("Vous avez déjà laissé un avis pour cette prestation");

        Review review = reviewRepository.save(Review.builder()
                .negotiation(neg)
                .service(neg.getService())
                .client(client)
                .provider(neg.getService().getProvider())
                .rating(req.getRating())
                .comment(req.getComment())
                .build());

        log.info("Avis créé : client={} provider={}", client.getId(), review.getProvider().getId());
        return ReviewDtos.ReviewResponse.from(review);
    }

    // ===== Lire les avis d'un prestataire =====

    @Transactional(readOnly = true)
    public List<ReviewDtos.ReviewResponse> getByProvider(UUID providerId) {
        return reviewRepository.findByProviderId(providerId)
                .stream().map(ReviewDtos.ReviewResponse::from).collect(Collectors.toList());
    }

    // ===== Lire les avis d'un service =====

    @Transactional(readOnly = true)
    public List<ReviewDtos.ReviewResponse> getByService(UUID serviceId) {
        return reviewRepository.findByServiceId(serviceId)
                .stream().map(ReviewDtos.ReviewResponse::from).collect(Collectors.toList());
    }

    // ===== Résumé notation prestataire =====

    @Transactional(readOnly = true)
    public ReviewDtos.RatingSummary getRatingSummary(UUID providerId) {
        List<Review> list = reviewRepository.findByProviderId(providerId);
        double avg = list.stream().mapToInt(r -> (int) r.getRating()).average().orElse(0.0);
        return ReviewDtos.RatingSummary.builder()
                .averageRating(Math.round(avg * 10.0) / 10.0)
                .totalReviews(list.size())
                .fiveStars (list.stream().filter(r -> r.getRating() == 5).count())
                .fourStars (list.stream().filter(r -> r.getRating() == 4).count())
                .threeStars(list.stream().filter(r -> r.getRating() == 3).count())
                .twoStars  (list.stream().filter(r -> r.getRating() == 2).count())
                .oneStar   (list.stream().filter(r -> r.getRating() == 1).count())
                .build();
    }

    // ===== Peut laisser un avis ? =====

    @Transactional(readOnly = true)
    public boolean canReview(User client, UUID negotiationId) {
        return negotiationRepository.findById(negotiationId)
                .map(n -> n.getClient() != null
                        && n.getClient().getId().equals(client.getId())
                        && n.getStatus() == Negotiation.Status.AGREED
                        && !reviewRepository.existsByNegotiationId(negotiationId))
                .orElse(false);
    }
}