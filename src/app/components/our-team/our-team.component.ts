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
