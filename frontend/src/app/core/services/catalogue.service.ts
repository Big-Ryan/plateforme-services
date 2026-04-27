import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Category, ServiceSummary, ServiceDetail,
  CreateServiceRequest, PageResponse, ServiceSearchParams
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CatalogueService {

  constructor(private api: ApiService) {}

  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('/categories');
  }

  getServices(params: ServiceSearchParams = {}): Observable<PageResponse<ServiceSummary>> {
    return this.api.getPage<ServiceSummary>('/services', params as Record<string, unknown>);
  }

  getServiceDetail(id: string): Observable<ServiceDetail> {
    return this.api.get<ServiceDetail>(`/services/${id}`);
  }

  // ===== Provider =====

  getMyServices(page = 0, size = 10): Observable<PageResponse<ServiceSummary>> {
    return this.api.getPage<ServiceSummary>('/provider/services', { page, size });
  }

  createService(request: CreateServiceRequest): Observable<ServiceDetail> {
    return this.api.post<ServiceDetail>('/provider/services', request);
  }

  updateService(id: string, request: Partial<CreateServiceRequest>): Observable<ServiceDetail> {
    return this.api.patch<ServiceDetail>(`/provider/services/${id}`, request);
  }

  deleteService(id: string): Observable<void> {
    return this.api.delete(`/provider/services/${id}`);
  }

  uploadLogo(file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.uploadFile<{ url: string }>('/storage/logo', fd);
  }

  uploadServiceImages(files: File[]): Observable<{ urls: string[] }> {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    return this.api.uploadFile<{ urls: string[] }>('/storage/service-images', fd);
  }
}
