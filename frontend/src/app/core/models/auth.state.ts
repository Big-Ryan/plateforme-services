// ============================================================
// core/models/auth.state.ts — État d'authentification en mémoire
// Le refresh token est dans un cookie HttpOnly géré par le backend.
// L'access token est UNIQUEMENT en mémoire (jamais localStorage).
// ============================================================

import { UserInfo } from './api.models';

export interface AuthState {
  accessToken: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export const initialAuthState: AuthState = {
  accessToken: null,
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};
