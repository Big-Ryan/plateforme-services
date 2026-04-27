package com.plateforme.catalogue.service;

import com.plateforme.catalogue.dto.CatalogueDtos.*;
import com.plateforme.catalogue.entity.Category;
import com.plateforme.catalogue.entity.ServiceOffer;
import com.plateforme.catalogue.repository.CategoryRepository;
import com.plateforme.catalogue.repository.ServiceOfferRepository;
import com.plateforme.common.dto.PageResponse;
import com.plateforme.common.exception.BusinessException;
import com.plateforme.common.exception.ResourceNotFoundException;
import com.plateforme.common.exception.SubscriptionRequiredException;
import com.plateforme.subscription.service.SubscriptionService;
import com.plateforme.users.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CatalogueService {

    private final ServiceOfferRepository serviceOfferRepository;
    private final CategoryRepository categoryRepository;
    private final SubscriptionService subscriptionService;

    // ===== Catégories =====

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findByIsActiveTrueOrderBySortOrderAsc()
                .stream()
                .map(CategoryResponse::from)
                .collect(Collectors.toList());
    }

    // ===== Catalogue public =====

    @Transactional(readOnly = true)
    public PageResponse<ServiceSummaryResponse> getPublishedServices(
            String categoryId, String city, String query,
            int page, int size, String sortBy) {

        Pageable pageable = buildPageable(page, size, sortBy);

        // Normaliser les paramètres
        String q       = (query      != null && !query.isBlank())      ? query.trim()      : null;
        String cityStr = (city        != null && !city.isBlank())       ? city.trim()       : null;
        String catStr  = (categoryId  != null && !categoryId.isBlank()) ? categoryId.trim() : null;

        // Convertir catStr en UUID pour les requêtes JPQL (sans recherche texte)
        UUID catUUID = null;
        if (catStr != null) {
            try { catUUID = UUID.fromString(catStr); } catch (Exception ignored) {}
        }

        Page<ServiceOffer> results;
        if (q != null) {
            // Native SQL gère son propre ORDER BY — Pageable sans sort pour éviter conflit
            Pageable nativePageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
            if (cityStr != null) {
                results = serviceOfferRepository.findPublishedByCategoryAndCityAndQuery(catStr, cityStr, q, nativePageable);
            } else {
                results = serviceOfferRepository.findPublishedByCategoryAndQuery(catStr, q, nativePageable);
            }
        } else {
            // Sans recherche texte → JPQL classique
            if (cityStr != null) {
                results = serviceOfferRepository.findPublishedByCategoryAndCity(catUUID, cityStr, pageable);
            } else {
                results = serviceOfferRepository.findPublishedByCategory(catUUID, pageable);
            }
        }

        return PageResponse.from(results.map(ServiceSummaryResponse::from));
    }

    @Transactional
    public ServiceDetailResponse getServiceDetail(UUID id) {
        ServiceOffer service = serviceOfferRepository.findById(id)
                .filter(s -> s.getStatus() == ServiceOffer.Status.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Service", id));

        // Incrément atomique (pas de contention)
        serviceOfferRepository.incrementViewCount(id);

        return ServiceDetailResponse.from(service);
    }

    // ===== CRUD Prestataire =====

    @Transactional(readOnly = true)
    public PageResponse<ServiceSummaryResponse> getMyServices(User provider, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ServiceOffer> results = serviceOfferRepository
                .findByProviderIdOrderByCreatedAtDesc(provider.getId(), pageable);
        return PageResponse.from(results.map(ServiceSummaryResponse::from));
    }

    @Transactional
    public ServiceDetailResponse createService(User provider, CreateServiceRequest request) {
        // Abonnement actif obligatoire
        if (!subscriptionService.hasActiveSubscription(provider.getId())) {
            throw new SubscriptionRequiredException(
                    "Un abonnement actif est requis pour publier des services.");
        }

        // Vérifier la limite de services du plan
        int maxServices = subscriptionService.getMaxServices(provider.getId());
        long currentCount = serviceOfferRepository.countByProviderIdAndStatus(
                provider.getId(), ServiceOffer.Status.PUBLISHED);
        if (currentCount >= maxServices) {
            throw new BusinessException(
                    "Limite de services atteinte (" + maxServices + "). Passez à un plan supérieur.");
        }

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Catégorie", request.getCategoryId()));
        }

        ServiceOffer service = ServiceOffer.builder()
                .provider(provider)
                .category(category)
                .title(request.getTitle())
                .description(request.getDescription())
                .priceFrom(request.getPriceFrom())
                .priceTo(request.getPriceTo())
                .currency(request.getCurrency() != null ? request.getCurrency() : "XAF")
                .deliveryTime(request.getDeliveryTime())
                .location(request.getLocation())
                .status(ServiceOffer.Status.PUBLISHED)
                .tags(request.getTags() != null ? request.getTags().toArray(new String[0]) : null)
                .images(request.getImages() != null ? request.getImages().toArray(new String[0]) : null)
                .build();

        serviceOfferRepository.save(service);
        log.info("Service créé : {} par providerId={}", service.getTitle(), provider.getId());
        return ServiceDetailResponse.from(service);
    }

    @Transactional
    public ServiceDetailResponse updateService(User provider, UUID serviceId, UpdateServiceRequest request) {
        ServiceOffer service = serviceOfferRepository
                .findByIdAndProviderId(serviceId, provider.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Service", serviceId));

        if (request.getTitle() != null) service.setTitle(request.getTitle());
        if (request.getDescription() != null) service.setDescription(request.getDescription());
        if (request.getPriceFrom() != null) service.setPriceFrom(request.getPriceFrom());
        if (request.getPriceTo() != null) service.setPriceTo(request.getPriceTo());
        if (request.getCurrency() != null) service.setCurrency(request.getCurrency());
        if (request.getDeliveryTime() != null) service.setDeliveryTime(request.getDeliveryTime());
        if (request.getLocation() != null) service.setLocation(request.getLocation());
        if (request.getTags() != null) service.setTags(request.getTags().toArray(new String[0]));
        if (request.getImages() != null) service.setImages(request.getImages().toArray(new String[0]));

        if (request.getStatus() != null) {
            ServiceOffer.Status newStatus = ServiceOffer.Status.valueOf(request.getStatus());
            // Peut publier ou repasser en brouillon
            if (newStatus == ServiceOffer.Status.PUBLISHED
                    && !subscriptionService.hasActiveSubscription(provider.getId())) {
                throw new SubscriptionRequiredException("Abonnement actif requis pour publier");
            }
            if (newStatus == ServiceOffer.Status.PUBLISHED || newStatus == ServiceOffer.Status.DRAFT) {
                service.setStatus(newStatus);
            }
        }

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Catégorie", request.getCategoryId()));
            service.setCategory(category);
        }

        serviceOfferRepository.save(service);
        return ServiceDetailResponse.from(service);
    }

    @Transactional
    public void deleteService(User provider, UUID serviceId) {
        ServiceOffer service = serviceOfferRepository
                .findByIdAndProviderId(serviceId, provider.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Service", serviceId));
        serviceOfferRepository.delete(service);
        log.info("Service supprimé : {} par providerId={}", serviceId, provider.getId());
    }

    // ===== Helper =====

    private Pageable buildPageable(int page, int size, String sortBy) {
        size = Math.min(size, 50); // plafond
        Sort sort = switch (sortBy != null ? sortBy : "recent") {
            case "price_asc"  -> Sort.by("priceFrom").ascending();
            case "price_desc" -> Sort.by("priceFrom").descending();
            case "popular"    -> Sort.by("viewCount").descending();
            default           -> Sort.by("createdAt").descending();
        };
        return PageRequest.of(page, size, sort);
    }
}