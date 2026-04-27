package com.plateforme.review;

import com.plateforme.auth.dto.RegisterRequest;
import com.plateforme.auth.service.AuthService;
import com.plateforme.catalogue.entity.ServiceOffer;
import com.plateforme.catalogue.repository.ServiceOfferRepository;
import com.plateforme.common.exception.BusinessException;
import com.plateforme.negotiation.entity.Negotiation;
import com.plateforme.negotiation.repository.NegotiationRepository;
import com.plateforme.review.dto.ReviewDtos;
import com.plateforme.review.service.ReviewService;
import com.plateforme.users.entity.User;
import com.plateforme.users.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("ReviewService — Tests")
class ReviewServiceTest {

    @Autowired ReviewService          reviewService;
    @Autowired AuthService            authService;
    @Autowired UserRepository         userRepository;
    @Autowired NegotiationRepository  negotiationRepository;
    @Autowired ServiceOfferRepository serviceOfferRepository;

    User client, provider;
    ServiceOffer service;
    Negotiation  negotiation;

    @BeforeEach
    void setup() {
        // email, password, firstName, lastName, phone, referralCode, role, companyName, city
        authService.register(new RegisterRequest("rv_client@test.cm", "Password123!", "Client", "Test",
                null, null, User.Role.CLIENT, null, null), null, null);
        client = userRepository.findByEmail("rv_client@test.cm").orElseThrow();

        authService.register(new RegisterRequest("rv_provider@test.cm", "Password123!", "Provider", "Test",
                null, null, User.Role.PROVIDER, "Review SARL", null), null, null);
        provider = userRepository.findByEmail("rv_provider@test.cm").orElseThrow();

        service = serviceOfferRepository.save(ServiceOffer.builder()
                .provider(provider).title("Service Test").description("Desc")
                .status(ServiceOffer.Status.PUBLISHED).currency("XAF").build());

        negotiation = negotiationRepository.save(Negotiation.builder()
                .service(service).provider(provider).client(client)
                .status(Negotiation.Status.AGREED).mode(Negotiation.Mode.INTERNAL).build());
    }

    @Test @DisplayName("Créer un avis — succès")
    void createReview_success() {
        ReviewDtos.CreateReviewRequest req = new ReviewDtos.CreateReviewRequest();
        req.setNegotiationId(negotiation.getId()); req.setRating((short) 5); req.setComment("Excellent !");
        ReviewDtos.ReviewResponse r = reviewService.createReview(client, req);
        assertThat(r.getRating()).isEqualTo((short) 5);
    }

    @Test @DisplayName("Double avis — lève BusinessException")
    void createReview_duplicate_throws() {
        ReviewDtos.CreateReviewRequest req = new ReviewDtos.CreateReviewRequest();
        req.setNegotiationId(negotiation.getId()); req.setRating((short) 4);
        reviewService.createReview(client, req);
        assertThatThrownBy(() -> reviewService.createReview(client, req)).isInstanceOf(BusinessException.class);
    }

    @Test @DisplayName("Avis par mauvais client — lève BusinessException")
    void createReview_wrongClient_throws() {
        authService.register(new RegisterRequest("rv_other@test.cm", "Password123!", "Other", "Test",
                null, null, User.Role.CLIENT, null, null), null, null);
        User other = userRepository.findByEmail("rv_other@test.cm").orElseThrow();
        ReviewDtos.CreateReviewRequest req = new ReviewDtos.CreateReviewRequest();
        req.setNegotiationId(negotiation.getId()); req.setRating((short) 3);
        assertThatThrownBy(() -> reviewService.createReview(other, req)).isInstanceOf(BusinessException.class);
    }

    @Test @DisplayName("Récupérer avis d'un prestataire")
    void getByProvider_returnsReviews() {
        ReviewDtos.CreateReviewRequest req = new ReviewDtos.CreateReviewRequest();
        req.setNegotiationId(negotiation.getId()); req.setRating((short) 5);
        reviewService.createReview(client, req);
        assertThat(reviewService.getByProvider(provider.getId())).hasSize(1);
    }

    @Test @DisplayName("Résumé notation — calcul correct")
    void getRatingSummary_correct() {
        ReviewDtos.CreateReviewRequest req = new ReviewDtos.CreateReviewRequest();
        req.setNegotiationId(negotiation.getId()); req.setRating((short) 5);
        reviewService.createReview(client, req);
        ReviewDtos.RatingSummary s = reviewService.getRatingSummary(provider.getId());
        assertThat(s.getTotalReviews()).isEqualTo(1);
        assertThat(s.getAverageRating()).isEqualTo(5.0);
    }
}