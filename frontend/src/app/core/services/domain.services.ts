import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  SubscriptionPlan, ProviderSubscription, SubscribeResponse,
  NegotiationSummary, NegotiationDetail, NegotiationMessage,
  InitiateNegotiationRequest, PageResponse,
  CreateReviewRequest, ReviewResponse, RatingSummary, ReferralStats
} from '../models/api.models';

// ===== SubscriptionService =====

@Injectable({ providedIn: 'root' })
export class SubscriptionService {

  constructor(private api: ApiService) {}

  getPlans(): Observable<SubscriptionPlan[]> {
    return this.api.get<SubscriptionPlan[]>('/subscriptions/plans');
  }

  getCurrentSubscription(): Observable<ProviderSubscription | undefined> {
    return this.api.get<ProviderSubscription | undefined>('/subscriptions/current');
  }

  subscribe(planId: string): Observable<SubscribeResponse> {
    return this.api.post<SubscribeResponse>(`/subscriptions/subscribe/${planId}`, {});
  }
}

// ===== NegotiationService =====

@Injectable({ providedIn: 'root' })
export class NegotiationService {

  constructor(private api: ApiService) {}

  initiate(request: InitiateNegotiationRequest): Observable<NegotiationDetail> {
    return this.api.post<NegotiationDetail>('/negotiations', request);
  }

  getProviderNegotiations(page = 0, size = 10): Observable<PageResponse<NegotiationSummary>> {
    return this.api.getPage<NegotiationSummary>('/negotiations/provider', { page, size });
  }

  getClientNegotiations(page = 0, size = 10): Observable<PageResponse<NegotiationSummary>> {
    return this.api.getPage<NegotiationSummary>('/negotiations/client', { page, size });
  }

  getDetail(id: string): Observable<NegotiationDetail> {
    return this.api.get<NegotiationDetail>(`/negotiations/${id}`);
  }

  sendMessage(id: string, content: string): Observable<NegotiationMessage> {
    return this.api.post<NegotiationMessage>(`/negotiations/${id}/messages`, { content });
  }

  updateStatus(
    id: string,
    status: string,
    agreedPrice?: number,
    notes?: string
  ): Observable<NegotiationDetail> {
    return this.api.patch<NegotiationDetail>(`/negotiations/${id}/status`, {
      status, agreedPrice, notes
    });
  }
}

// ===== ReviewService =====

@Injectable({ providedIn: 'root' })
export class ReviewService {

  constructor(private api: ApiService) {}

  create(req: CreateReviewRequest): Observable<ReviewResponse> {
    return this.api.post<ReviewResponse>('/reviews', req);
  }

  canReview(negotiationId: string): Observable<boolean> {
    return this.api.get<boolean>(`/reviews/can-review/${negotiationId}`);
  }

  getByProvider(providerId: string): Observable<ReviewResponse[]> {
    return this.api.get<ReviewResponse[]>(`/providers/${providerId}/reviews`);
  }

  getRating(providerId: string): Observable<RatingSummary> {
    return this.api.get<RatingSummary>(`/providers/${providerId}/rating`);
  }

  getByService(serviceId: string): Observable<ReviewResponse[]> {
    return this.api.get<ReviewResponse[]>(`/services/${serviceId}/reviews`);
  }
}

// ===== ReferralService =====

@Injectable({ providedIn: 'root' })
export class ReferralService {

  constructor(private api: ApiService) {}

  getMyCode(): Observable<string> {
    return this.api.get<string>('/referral/my-code');
  }

  getMyStats(): Observable<ReferralStats> {
    return this.api.get<ReferralStats>('/referral/stats');
  }
}