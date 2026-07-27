import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  UserSummary,
} from '../models/auth.model';

const TOKEN_KEY = 'jamago_admin_token';
const USER_KEY = 'jamago_admin_user';
const EXPIRES_KEY = 'jamago_admin_expires';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<UserSummary | null>(null);

  constructor() {
    this.restoreSession();
  }

  getToken(): string | null {
    if (this.isSessionExpired()) {
      this.clearSession();
      return null;
    }

    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUser();
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'Admin';
  }

  isStaff(): boolean {
    return this.currentUser()?.role === 'Staff';
  }

  isTechnician(): boolean {
    return this.currentUser()?.role === 'Technician';
  }

  /**
   * Whether the signed-in user holds a permission. Drives navigation and
   * button visibility only — the API enforces the same requirement on every
   * endpoint, so this is convenience, not a security boundary.
   */
  can(permission: string): boolean {
    return this.currentUser()?.permissions?.includes(permission) ?? false;
  }

  landingRoute(user = this.currentUser()): string {
    if (user?.role === 'Technician') return '/technician';
    return user?.role === 'Staff' ? '/staff' : '/admin/staff';
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<ApiResult<LoginResponse>>(`${environment.apiUrl}/auth/login`, request)
      .pipe(
        map((result) => unwrapApiResult(result)),
        tap((response) => this.persistSession(response)),
      );
  }

  /** Self-service password change for the signed-in user, any role. */
  changePassword(request: ChangePasswordRequest): Observable<string> {
    return this.http
      .post<ApiResult<string>>(`${environment.apiUrl}/auth/change-password`, request)
      .pipe(map((result) => unwrapApiResult(result)));
  }

  validateSession(): Observable<UserSummary> {
    return this.http
      .get<ApiResult<UserSummary>>(`${environment.apiUrl}/auth/me`)
      .pipe(
        map((result) => unwrapApiResult(result)),
        tap((user) => {
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          this.currentUser.set(user);
        }),
      );
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/admin/login']);
  }

  /** Clears an invalid/expired session and returns to the shared secure login. */
  handleUnauthorized(): void {
    const onPortal =
      this.router.url.startsWith('/admin')
      || this.router.url.startsWith('/staff')
      || this.router.url.startsWith('/technician');
    this.clearSession();

    if (onPortal && !this.router.url.startsWith('/admin/login')) {
      void this.router.navigate(['/admin/login']);
    }
  }

  handleForbidden(): void {
    const route = this.landingRoute();
    if (this.router.url.split('?')[0] !== route) {
      void this.router.navigate([route]);
    }
  }

  private restoreSession(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = this.readStoredUser();

    if (!token || !user || this.isSessionExpired()) {
      this.clearSession();
      return;
    }

    this.currentUser.set(user);
  }

  private persistSession(response: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));

    if (response.expiresAtUtc) {
      localStorage.setItem(EXPIRES_KEY, response.expiresAtUtc);
    } else {
      localStorage.removeItem(EXPIRES_KEY);
    }

    this.currentUser.set(response.user);
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    this.currentUser.set(null);
  }

  private isSessionExpired(): boolean {
    const expiresAt = localStorage.getItem(EXPIRES_KEY);
    if (!expiresAt) {
      // No client-side expiry — rely on API 401 handling.
      return false;
    }

    const expiresMs = Date.parse(expiresAt);
    if (Number.isNaN(expiresMs)) {
      return true;
    }

    // Small skew buffer so we don't send a token that expires mid-request.
    return Date.now() >= expiresMs - 30_000;
  }

  private readStoredUser(): UserSummary | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UserSummary;
    } catch {
      return null;
    }
  }
}
