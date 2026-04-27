import {
  HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  // inject() au lieu du constructeur pour éviter la dépendance circulaire
  // AuthService -> HttpClient -> HTTP_INTERCEPTORS -> AuthInterceptor -> AuthService
  private readonly authService = inject(AuthService);

  private isRefreshing = false;
  private refreshToken$ = new BehaviorSubject<string | null>(null);

  private readonly skipPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
  ];

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.skipPaths.some(p => req.url.includes(p))) {
      return next.handle(req);
    }

    const token = this.authService.getAccessToken();
    const authReq = token ? this.addToken(req, token) : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && token) {
          return this.handle401(req, next);
        }
        return throwError(() => err);
      })
    );
  }

  private handle401(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (this.isRefreshing) {
      return this.refreshToken$.pipe(
        filter(t => t !== null),
        take(1),
        switchMap(newToken => next.handle(this.addToken(req, newToken!)))
      );
    }

    this.isRefreshing = true;
    this.refreshToken$.next(null);

    return this.authService.refresh().pipe(
      switchMap(tokenResponse => {
        this.isRefreshing = false;
        this.refreshToken$.next(tokenResponse.accessToken);
        return next.handle(this.addToken(req, tokenResponse.accessToken));
      }),
      catchError(err => {
        this.isRefreshing = false;
        this.authService.clearTokens();
        return throwError(() => err);
      })
    );
  }

  private addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
}