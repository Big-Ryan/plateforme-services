import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, ApiError, PageResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {

  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Token stocké ici directement — plus besoin d'intercepteur
  private readonly TOKEN_KEY = 'access_token';

  setToken(token: string | null): void {
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (this.getToken()) {
      headers = headers.set('Authorization', `Bearer ${this.getToken()}`);
    }
    return headers;
  }

  get<T>(path: string, params?: Record<string, unknown>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http
      .get<ApiResponse<T>>(`${this.baseUrl}${path}`, {
        params: httpParams,
        headers: this.getHeaders()
      })
      .pipe(map(r => r.data as T), catchError(this.handleError));
  }

  getPage<T>(path: string, params?: Record<string, unknown>): Observable<PageResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http
      .get<ApiResponse<PageResponse<T>>>(`${this.baseUrl}${path}`, {
        params: httpParams,
        headers: this.getHeaders()
      })
      .pipe(map(r => r.data as PageResponse<T>), catchError(this.handleError));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(`${this.baseUrl}${path}`, body, {
        headers: this.getHeaders(),
        withCredentials: true
      })
      .pipe(map(r => r.data as T), catchError(this.handleError));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(`${this.baseUrl}${path}`, body, {
        headers: this.getHeaders()
      })
      .pipe(map(r => r.data as T), catchError(this.handleError));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(`${this.baseUrl}${path}`, body, {
        headers: this.getHeaders()
      })
      .pipe(map(r => r.data as T), catchError(this.handleError));
  }

  delete<T>(path: string): Observable<void> {
    return this.http
      .delete<ApiResponse<T>>(`${this.baseUrl}${path}`, {
        headers: this.getHeaders()
      })
      .pipe(map(() => void 0), catchError(this.handleError));
  }

  getMyProfile(): Observable<any> {
    return this.get<any>('/me');
  }

  uploadFile<T>(path: string, formData: FormData): Observable<T> {
    // Pas de Content-Type pour multipart (le navigateur le gère)
    let headers = new HttpHeaders();
    if (this.getToken()) {
      headers = headers.set('Authorization', `Bearer ${this.getToken()}`);
    }
    return this.http
      .post<ApiResponse<T>>(`${this.baseUrl}${path}`, formData, { headers })
      .pipe(map(r => r.data as T), catchError(this.handleError));
  }

  private handleError(err: any): Observable<never> {
    const apiError: ApiError = err.error ?? {
      status: err.status,
      error: 'NETWORK_ERROR',
      message: 'Impossible de contacter le serveur',
      timestamp: new Date().toISOString(),
    };
    return throwError(() => apiError);
  }
}