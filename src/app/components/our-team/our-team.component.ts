import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { RevealDirective } from '../../directives/reveal.directive';
import { AuthService } from '../../services/auth.service';
import { StaffService } from '../../services/staff.service';
import { StaffMember } from '../../models/staff.model';

@Component({
  selector: 'app-our-team',
  standalone: true,
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './our-team.component.html',
})
export class OurTeamComponent {
  private readonly staffService = inject(StaffService);
  private readonly destroyRef = inject(DestroyRef);

  readonly team = signal<StaffMember[]>([]);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  /** The roster is not published; the section hides rather than showing a gap. */
  readonly restricted = signal(false);

  constructor() {
    // Fetched in the browser only. During the build-time prerender there is no
    // API to answer, and Angular waits for outstanding HTTP before it will
    // write the page — which hung the prerender until it timed out. The roster
    // is live data anyway, so baking a build-time copy into static HTML would
    // go stale the moment someone is added.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      this.loading.set(false);
      return;
    }

    // The roster endpoint is admin-only by deliberate decision — publishing the
    // staff of a security company was closed off on purpose. An anonymous
    // visitor calling it would get a guaranteed 401 on every page load, logging
    // a console error and telling us nothing we do not already know, so the
    // section stays silent unless someone signed in is looking at it.
    // Injected here rather than as a field: AuthService restores its session
    // from localStorage on construction, which does not exist during the
    // build-time prerender. A field initialiser would run before the platform
    // check above and break the static render of the home page.
    if (!inject(AuthService).isLoggedIn()) {
      this.loading.set(false);
      this.restricted.set(true);
      return;
    }

    this.staffService
      .getActive()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (staff) => this.team.set(staff),
        error: () => this.loadFailed.set(true),
      });
  }
}
