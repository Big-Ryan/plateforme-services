import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { PageResponse } from '../../core/models/api.models';

export interface DashboardStats {
  totalUsers: number;
  totalProviders: number;
  totalClients: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  totalServices: number;
  publishedServices: number;
  totalNegotiations: number;
  estimatedMonthlyRevenue: number;
}

export interface UserAdminRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  companyName?: string;
  verified?: boolean;
  subscriptionStatus?: string;
  createdAt: string;
}

export interface SubscriptionAdminRow {
  id: string;
  providerId: string;
  providerEmail: string;
  providerCompany: string;
  planName: string;
  status: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  active: boolean;
  serviceCount: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private api: ApiService) {}

  // Dashboard
  getDashboard(): Observable<DashboardStats> {
    return this.api.get<DashboardStats>('/admin/dashboard');
  }

  // Utilisateurs
  getUsers(page = 0, size = 20, role?: string): Observable<PageResponse<UserAdminRow>> {
    const params: Record<string, unknown> = { page, size };
    if (role) params['role'] = role;
    return this.api.getPage<UserAdminRow>('/admin/users', params);
  }
  toggleUser(id: string, active: boolean): Observable<void> {
    return this.api.patch<void>(`/admin/users/${id}/toggle`, { active });
  }
  verifyProvider(id: string, verified: boolean): Observable<void> {
    return this.api.patch<void>(`/admin/providers/${id}/verify`, { verified });
  }

  // Abonnements
  getSubscriptions(page = 0, size = 20, status?: string): Observable<PageResponse<SubscriptionAdminRow>> {
    const params: Record<string, unknown> = { page, size };
    if (status) params['status'] = status;
    return this.api.getPage<SubscriptionAdminRow>('/admin/subscriptions', params);
  }
  updateSubscription(id: string, status: string, reason?: string): Observable<void> {
    return this.api.patch<void>(`/admin/subscriptions/${id}`, { status, reason });
  }
  suspendService(id: string, suspend: boolean): Observable<void> {
    return this.api.patch<void>(`/admin/services/${id}/suspend`, { suspend });
  }

  // Catégories
  getCategories(): Observable<CategoryRow[]> {
    return this.api.get<CategoryRow[]>('/admin/categories');
  }
  createCategory(data: { name: string; slug: string; sortOrder: number }): Observable<CategoryRow> {
    return this.api.post<CategoryRow>('/admin/categories', data);
  }
  updateCategory(id: string, data: { name?: string; sortOrder?: number; active?: boolean }): Observable<CategoryRow> {
    return this.api.patch<CategoryRow>(`/admin/categories/${id}`, data);
  }
  reorderCategories(items: { id: string; sortOrder: number }[]): Observable<void> {
    return this.api.put<void>('/admin/categories/reorder', { items });
  }
  deleteCategory(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/categories/${id}`);
  }
}