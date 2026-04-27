import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  LoginRequest, RegisterRequest, TokenResponse, UserInfo, ApiResponse
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly http    = inject(HttpClient);
  private readonly router  = inject(Router);
  private readonly api     = inject(ApiService);
  private readonly baseUrl = environment.apiUrl;

  private _currentUser$ = new BehaviorSubject<UserInfo | null>(null);
  readonly currentUser$ = this._currentUser$.asObservable();

  constructor() {
    // Restaurer l'utilisateur depuis le token JWT au démarrage
    const token = this.api.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Vérifier que le token n'est pas expiré
        if (payload.exp * 1000 > Date.now()) {
          this._currentUser$.next({
            id:            payload.sub,
            email:         payload.email || '',
            firstName:     payload.firstName || '',
            lastName:      payload.lastName || '',
            role:          payload.role || 'CLIENT',
            emailVerified: payload.emailVerified ?? false,
          });
        } else {
          // Token expiré — tenter un refresh silencieux
          this.api.setToken(null);
          this.refresh().subscribe({ error: () => {} });
        }
      } catch {
        this.api.setToken(null);
      }
    }
  }

  login(request: LoginRequest): Observable<TokenResponse> {
    return this.http
      .post<ApiResponse<TokenResponse>>(`${this.baseUrl}/auth/login`, request, {
        withCredentials: true
      })
      .pipe(
        map(r => r.data!),
        tap(t => this.storeTokens(t)),
        catchError(err => throwError(() => err.error ?? err))
      );
  }

  register(request: RegisterRequest): Observable<TokenResponse> {
    return this.http
      .post<ApiResponse<TokenResponse>>(`${this.baseUrl}/auth/register`, request, {
        withCredentials: true
      })
      .pipe(
        map(r => r.data!),
        tap(t => this.storeTokens(t)),
        catchError(err => throwError(() => err.error ?? err))
      );
  }

  refresh(): Observable<TokenResponse> {
    return this.http
      .post<ApiResponse<TokenResponse>>(`${this.baseUrl}/auth/refresh`, {}, {
        withCredentials: true
      })
      .pipe(
        map(r => r.data!),
        tap(t => this.storeTokens(t)),
        catchError(err => throwError(() => err.error ?? err))
        // PAS de clearTokens() ici — on laisse l'état tel quel si refresh échoue
      );
  }

  logout(): void {
    this.http
      .post<void>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({ error: () => {} });
    this.clearTokens();
    this.router.navigate(['/auth/login']);
  }

  forgotPassword(email: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/auth/forgot-password`, { email })
      .pipe(map(() => void 0), catchError(err => throwError(() => err.error ?? err)));
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/auth/reset-password`, { token, newPassword })
      .pipe(map(() => void 0), catchError(err => throwError(() => err.error ?? err)));
  }

  getAccessToken(): string | null     { return this.api.getToken(); }
  isAuthenticated(): boolean          { return !!this.api.getToken(); }
  getCurrentUser(): UserInfo | null   { return this._currentUser$.getValue(); }
  hasRole(role: string): boolean      { return this.getCurrentUser()?.role === role; }
  isProvider(): boolean               { return this.hasRole('PROVIDER'); }
  isClient():   boolean               { return this.hasRole('CLIENT'); }
  isAdmin():    boolean               { return this.hasRole('ADMIN'); }

  clearTokens(): void {
    this.api.setToken(null);
    this._currentUser$.next(null);
  }

  private storeTokens(t: TokenResponse): void {
    this.api.setToken(t.accessToken);
    this._currentUser$.next(t.user);
  }
}