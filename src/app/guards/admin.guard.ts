import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { UserRole } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

/**
 * Guards a portal branch behind a single role.
 *
 * The catchError below MUST clear the session. The interceptor only clears it
 * on a 401, so any other failure (500, 503, the API restarting, a network drop)
 * previously left a "logged in" session in place: this guard redirected to
 * /admin/login, guestGuard saw isLoggedIn() still true and redirected straight
 * back, and the two ping-ponged forever — thousands of /auth/me calls until the
 * tab was closed. Dropping the session ends it after one failed attempt.
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
    catchError(() => {
      auth.clearSession();
      return of(router.createUrlTree(['/admin/login']));
    }),
  );
};

export const adminGuard = requireRole('Admin');
export const staffGuard = requireRole('Staff');
export const technicianGuard = requireRole('Technician');

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

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree([auth.landingRoute()]);
};
