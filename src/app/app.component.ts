import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { AnalyticsService } from './services/analytics.service';
import { isPortalRoute } from './utils/portal-routes';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
})
export class AppComponent {
  private readonly router = inject(Router);

  constructor() {
    inject(AnalyticsService).start();
  }

  /** Hide marketing header/footer on secure portal pages. */
  readonly showPublicShell = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => !this.isPortalRoute(this.router.url)),
      startWith(!this.isPortalRoute(this.router.url)),
    ),
    { initialValue: !this.isPortalRoute(this.router.url) },
  );

  // Moved to portal-routes so analytics answers this the same way. The local
  // copy also omitted /client, which would have shown the marketing header on a
  // signed-in client's pages.
  private isPortalRoute(url: string): boolean {
    return isPortalRoute(url);
  }
}
