import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Opts a single request out of the global "403 sends you back to your
 * landing page" behaviour below.
 *
 * That behaviour is right for a 403 on something the user directly asked
 * for — the page they meant to reach has already failed and there is
 * nothing to stay on. It is wrong for a background call a component already
 * treats as best-effort (its own `error` handler quietly degrades), where a
 * caller lacking one specific grant should not be yanked off whatever they
 * were doing to fetch a nicety. Set true on a request's HttpContext to mark
 * it as one of those.
 */
export const SUPPRESS_FORBIDDEN_REDIRECT = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isLoginRequest = req.url.includes('/auth/login');
  // The background renewal runs on a timer, with no user waiting on it. A 401
  // here says that one attempt failed, not that the session is over — the
  // current token is still good until its own expiry, and the next attempt a
  // minute later usually succeeds. Ending the session on it turned any single
  // blip on that timer into a logout mid-task, which is exactly the symptom the
  // renewal was added to prevent. A 401 on actual work still ends the session.
  const isRefreshRequest = req.url.includes('/auth/refresh');
  const token = isLoginRequest ? null : auth.getToken();

  const authedRequest = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isLoginRequest &&
        !isRefreshRequest
      ) {
        auth.handleUnauthorized();
      } else if (
        error instanceof HttpErrorResponse &&
        error.status === 403 &&
        !isLoginRequest &&
        !req.context.get(SUPPRESS_FORBIDDEN_REDIRECT)
      ) {
        auth.handleForbidden();
      }

      return throwError(() => error);
    }),
  );
};
