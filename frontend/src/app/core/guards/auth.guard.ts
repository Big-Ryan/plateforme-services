import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = (route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const ProviderGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) { router.navigate(['/auth/login']); return false; }
  if (!auth.isProvider())      { router.navigate(['/catalogue']);   return false; }
  return true;
};

export const ClientGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) { router.navigate(['/auth/login']); return false; }
  if (!auth.isClient())        { router.navigate(['/catalogue']);   return false; }
  return true;
};

export const AdminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) { router.navigate(['/auth/login']); return false; }
  if (!auth.isAdmin())         { router.navigate(['/catalogue']);   return false; }
  return true;
};

export const GuestGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  const role = auth.getCurrentUser()?.role;
  if (role === 'PROVIDER')    router.navigate(['/provider/dashboard']);
  else if (role === 'ADMIN')  router.navigate(['/admin/dashboard']);
  else                        router.navigate(['/client/dashboard']);
  return false;
};