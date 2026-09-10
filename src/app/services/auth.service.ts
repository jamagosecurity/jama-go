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
/**
 * The idle clock lives in localStorage, not in a field, because the session it
 * guards does too. Activity events only reach the focused tab, so a per-tab
 * field made a second tab left in the background believe the whole account had
 * gone idle — and its logout() cleared the shared localStorage out from under
 * the tab the user was actively working in. Keeping one clock per origin means
 * activity anywhere counts everywhere, and only a genuinely idle account times
 * out.
 */
const ACTIVITY_KEY = 'jamago_admin_last_activity';

/**
 * A session that dies exactly 60 minutes after login — active or not — reads
 * as a sudden, unexplained logout to whoever is mid-task when the clock runs
 * out. These turn that hard cutoff into a sliding one: real activity keeps
 * quietly renewing the token before it expires, and only IDLE_LIMIT_MS of
 * silence lets it actually run out.
 */
const IDLE_LIMIT_MS = 60 * 60 * 1000;
/** How often the idle clock is checked, and — while active — how often the
 *  token gets renewed. Well under IDLE_LIMIT_MS, so a renewal is never missed
 *  by more than this margin. */
const IDLE_CHECK_INTERVAL_MS = 60 * 1000;
/** Activity events fire in bursts (mousemove alone can fire dozens of times a
 *  second) — this is the floor between two events counting as separate
 *  activity, so the browser isn't doing that bookkeeping on every pixel of
 *  mouse movement. */
const ACTIVITY_THROTTLE_MS = 10 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<UserSummary | null>(null);

  /** Mirrors the last value this tab wrote to ACTIVITY_KEY, so throttling a
   *  burst of mousemoves costs a comparison rather than a localStorage read. */
  private lastActivityWriteAt = 0;

  constructor() {
    this.restoreSession();
    this.startIdleWatch();
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

  /**
   * The seeded root account. Gates the handful of destructive actions an ordinary
   * Admin must not reach — see the SuperAdmin policy on the API, which is what
   * actually enforces it. Defaults to false for tokens issued before the flag
   * existed, so an old session loses the button rather than gaining it.
   */
  isSuperAdmin(): boolean {
    return this.currentUser()?.isSuperAdmin === true;
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
    if (user?.role === 'Client') return '/client';
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

  /**
   * Reissues the current token with a fresh 60-minute expiry. Requires the
   * existing token to still be valid — the server refuses an already-expired
   * one — which is what keeps this a sliding window rather than an
   * indefinite one. Re-persisting the response also refreshes currentUser's
   * permissions, since the server recomputes them from the database rather
   * than copying the old token's claims forward.
   */
  private refreshToken(): Observable<LoginResponse> {
    return this.http
      .post<ApiResult<LoginResponse>>(`${environment.apiUrl}/auth/refresh`, {})
      .pipe(
        map((result) => unwrapApiResult(result)),
        tap((response) => this.persistSession(response)),
      );
  }

  /**
   * Real activity keeps the session alive indefinitely; IDLE_LIMIT_MS of
   * silence logs it out. Checked on a timer rather than a per-event countdown
   * so a laptop put to sleep mid-session is handled correctly too — on wake,
   * the elapsed wall-clock time since the last real activity is what counts,
   * not how many timer ticks fired while it was asleep.
   */
  private startIdleWatch(): void {
    const markActive = () => {
      const now = Date.now();
      if (now - this.lastActivityWriteAt > ACTIVITY_THROTTLE_MS) {
        this.lastActivityWriteAt = now;
        localStorage.setItem(ACTIVITY_KEY, String(now));
      }
    };

    for (const event of ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']) {
      window.addEventListener(event, markActive, { passive: true });
    }

    // Another tab logging out — or logging in as somebody else — has to be
    // reflected here rather than left to whatever this tab last read, or this
    // tab goes on rendering a signed-in shell over a session that is gone.
    window.addEventListener('storage', (event) => {
      if (event.key !== TOKEN_KEY && event.key !== USER_KEY) return;

      const user = this.readStoredUser();
      this.currentUser.set(localStorage.getItem(TOKEN_KEY) && user ? user : null);
    });

    setInterval(() => {
      if (!this.isLoggedIn()) return;

      if (Date.now() - this.readLastActivity() >= IDLE_LIMIT_MS) {
        this.logout();
        return;
      }

      // Best-effort: a failed renewal leaves the existing token in place to
      // carry the session until the next attempt a minute later. The
      // interceptor deliberately ignores a 401 from this call for the same
      // reason — a renewal that fails is not proof the session has ended.
      this.refreshToken().subscribe({ error: () => {} });
    }, IDLE_CHECK_INTERVAL_MS);
  }

  /** Falls back to "active right now" for a session that predates the shared
   *  clock, so an upgrade in a tab already open doesn't read as an hour idle. */
  private readLastActivity(): number {
    const stored = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : Date.now();
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
    this.clearSession();

    // A 401 raised while a navigation is already running came from a route
    // guard checking the session — that is the only thing making requests
    // before a route activates. The guard redirects to the login itself when
    // the check fails, so navigating from here too starts a second navigation
    // that cancels the guard's. Both end cancelled, no route ever activates,
    // and the router leaves an empty <app-root> — a blank white page rather
    // than the login form.
    //
    // The symptom only appears with an EXPIRED session, which is why it hid:
    // a signed-out visitor never reaches this (the guard redirects without a
    // request) and a valid session never 401s. Only a stale token does both.
    if (this.router.getCurrentNavigation()) {
      return;
    }

    // No navigation in flight: this 401 came from a screen already on display,
    // so nothing else is going to move the user and this has to.
    const onPortal =
      this.router.url.startsWith('/admin')
      || this.router.url.startsWith('/staff')
      || this.router.url.startsWith('/technician')
      || this.router.url.startsWith('/client');

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

    // Signing in is itself activity. Without this a fresh login inherits the
    // timestamp left by the previous session, and an account signing back in
    // after a long break would be timed out on the idle watch's next tick.
    this.lastActivityWriteAt = Date.now();
    localStorage.setItem(ACTIVITY_KEY, String(this.lastActivityWriteAt));

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
    localStorage.removeItem(ACTIVITY_KEY);
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
