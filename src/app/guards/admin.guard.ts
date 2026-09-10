import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { UserRole } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

/**
 * Guards a portal branch behind a single role.
 *
 * What this branch must NOT do is send a failed /auth/me to the login screen
 * while leaving the session in place: the guard redirected to /admin/login,
 * guestGuard saw isLoggedIn() still true and redirected straight back, and the
 * two ping-ponged forever — thousands of /auth/me calls until the tab was
 * closed. Clearing the session on every failure ended that loop, but it also
 * meant one 500, one 502 while the API restarted, or one dropped packet on
 * office wifi signed the user out mid-task, since this runs on every
 * navigation inside the portal.
 *
 * So the two cases are separated. A 401 is the server saying the session is
 * genuinely gone — the interceptor has already cleared it, and the login
 * screen is correct. Anything else is the API being briefly unreachable, which
 * says nothing about whether the caller is signed in: the locally stored user
 * still decides the role, the navigation proceeds, and any request that really
 * is unauthorized will 401 on its own. Neither path redirects to login while
 * still holding a session, so the loop stays fixed.
 */
const requireRole = (role: UserRole): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    auth.clearSession();
    return router.createUrlTree(['/admin/login']);
  }

  return auth.validateSession().pipe(
    map((user) => (user.role === role ? true : router.createUrlTree([auth.landingRoute(user)]))),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.clearSession();
        return of(router.createUrlTree(['/admin/login']));
      }

      const stored = auth.currentUser();
      return of(
        stored?.role === role ? true : router.createUrlTree([auth.landingRoute(stored)]),
      );
    }),
  );
};

export const adminGuard = requireRole('Admin');
export const staffGuard = requireRole('Staff');
export const technicianGuard = requireRole('Technician');
export const clientGuard = requireRole('Client');

/**
 * Gates a route on a permission rather than a role, for capabilities an admin
 * grants per account. Runs inside an already role-guarded branch, so the
 * session is known good by the time this executes.
 *
 * The API enforces the same permission on every endpoint — this only keeps a
 * user from landing on a screen whose requests would all be rejected.
 */
export const permissionGuard = (permission: string): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.can(permission) ? true : router.createUrlTree([auth.landingRoute()]);
};

/**
 * The same, for a screen more than one grant opens.
 *
 * The quotation screens are the case it exists for: building one and deciding on
 * one are separate permissions, and an approver holding only the second still
 * has to reach the document to read it. Mirrors AuthorizationPolicies.BoqRead on
 * the API, which is the check that actually decides.
 */
export const anyPermissionGuard = (...permissions: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return permissions.some((permission) => auth.can(permission))
    ? true
    : router.createUrlTree([auth.landingRoute()]);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree([auth.landingRoute()]);
};
