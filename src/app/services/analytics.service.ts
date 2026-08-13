import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { isPortalRoute, pathOf } from '../utils/portal-routes';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Reports page views to Google Analytics.
 *
 * The tag in index.html is configured with send_page_view: false, so nothing is
 * reported until this decides it should be. Two reasons that matters here:
 *
 * 1. Angular routes change without a page load. Left to itself the tag records
 *    only whichever page the visitor first landed on, and every journey through
 *    the site afterwards is invisible.
 *
 * 2. The portals must not be reported at all. Their URLs carry record ids —
 *    /admin/dia/{guid}, /technician/inspection/{guid} — and an invoice share
 *    link carries a token in its query string. Sending those to a third party
 *    would leak internal identifiers and, in the share-link case, a credential.
 *    Only the public marketing pages are measured, and only their path.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  start(): void {
    // No window during the build-time prerender, and no tag to talk to.
    if (!this.isBrowser) {
      return;
    }

    this.report(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.report(event.urlAfterRedirects));
  }

  private report(url: string): void {
    if (isPortalRoute(url)) {
      return;
    }

    // Absent when an ad blocker has stopped the script, which is ordinary and
    // must not throw on a visitor's first navigation.
    if (typeof window.gtag !== 'function') {
      return;
    }

    // Path only. The query string is dropped rather than trimmed, so a token or
    // an email in a link can never reach the report by accident.
    const path = pathOf(url);

    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: `${window.location.origin}${path}`,
      page_title: document.title,
    });
  }
}
