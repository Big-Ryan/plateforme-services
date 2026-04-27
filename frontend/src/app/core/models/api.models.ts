// ============================================================
// core/models/api.models.ts — Interfaces TypeScript alignées sur le backend
// ============================================================

// ===== API wrappers =====

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  timestamp: string;
  path?: string;
  fieldErrors?: FieldError[];
}

export interface FieldError {
  field: string;
  rejectedValue: unknown;
  message: string;
}

// ===== Auth =====

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CLIENT' | 'PROVIDER';
  companyName?: string;
  city?: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CLIENT' | 'PROVIDER' | 'ADMIN';
  emailVerified: boolean;
  logoUrl?: string;
}

// ===== User Profile =====

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  // Provider
  companyName?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  verified?: boolean;
}

export interface ProviderPublicProfile {
  id: string;
  companyName: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  city?: string;
  country?: string;
  verified: boolean;
  firstName: string;
  lastName: string;
  memberSince: string;
}

// ===== Catalogue =====

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  parentId?: string;
  sortOrder: number;
  children?: Category[];
}

export interface ServiceSummary {
  id: string;
  title: string;
  description?: string;
  priceFrom?: number;
  priceTo?: number;
  currency: string;
  location?: string;
  deliveryTime?: string;
  status: string;
  tags?: string[];
  images?: string[];
  viewCount: number;
  createdAt: string;
  providerId: string;
  providerName: string;
  providerLogoUrl?: string;
  providerVerified: boolean;
  providerCity?: string;
  categoryId?: string;
  categoryName?: string;
}

export interface ServiceDetail extends ServiceSummary {
  updatedAt: string;
  providerCompanyName?: string;
  providerFirstName: string;
  providerLastName: string;
  providerPhone?: string;
  categorySlug?: string;
}

export interface CreateServiceRequest {
  title?: string;
  description?: string;
  priceFrom?: number;
  priceTo?: number;
  currency?: string;
  deliveryTime?: string;
  location?: string;
  categoryId?: string;
  tags?: string[];
  images?: string[];
  status?: string;
}

export interface ServiceSearchParams {
  categoryId?: string;
  city?: string;
  q?: string;
  page?: number;
  size?: number;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'popular';
}

// ===== Subscriptions =====

export interface SubscriptionPlan {
  id: string;
  name: string;
  billingPeriod: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  price: number;
  currency: string;
  trialDays: number;
  maxServices: number;
  features?: Record<string, unknown>;
}

export interface ProviderSubscription {
  id: string;
  status: 'PENDING' | 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  startDate: string;
  endDate?: string;
  trialEndDate?: string;
  inTrial: boolean;
  plan: SubscriptionPlan;
  paypalSubscriptionId?: string;
  createdAt: string;
}

export interface SubscribeResponse {
  subscriptionId: string;
  status: string;
  trialEndDate?: string;
  requiresPayment: boolean;
  approvalUrl?: string;
  message: string;
}

// ===== Negotiations =====

export interface NegotiationSummary {
  id: string;
  status: string;
  mode: string;
  clientName?: string;
  serviceTitle?: string;
  serviceId?: string;
  unreadCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface NegotiationDetail {
  id: string;
  status: string;
  mode: string;
  notes?: string;
  agreedPrice?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  providerId: string;
  providerName: string;
  serviceId?: string;
  serviceTitle?: string;
  messages: NegotiationMessage[];
  updatedAt: string;
  createdAt: string;
}

export interface NegotiationMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  sentAt: string;
}

export interface InitiateNegotiationRequest {
  serviceId: string;
  initialMessage: string;
  mode?: 'INTERNAL' | 'EXTERNAL';
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
}

// ===== Reviews =====

export interface CreateReviewRequest {
  negotiationId: string;
  rating: number;
  comment?: string;
}

export interface ReviewResponse {
  id: string;
  negotiationId: string;
  serviceId: string;
  serviceTitle: string;
  clientId: string;
  clientName: string;
  providerId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  fiveStars: number;
  fourStars: number;
  threeStars: number;
  twoStars: number;
  oneStar: number;
}

// ===== Referral =====

export interface ReferralStats {
  validated: number;
  pending: number;
  currentTier: 'NONE' | 'AMBASSADOR' | 'ONE_MONTH_FREE' | 'DISCOUNT_20';
  nextThreshold: number;
  toNextTier: number;
}