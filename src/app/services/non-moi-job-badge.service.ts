import { Injectable, inject, signal } from '@angular/core';
import { NonMoiJobService } from './non-moi-job.service';

/**
 * The red number beside "Non-MOI Jobs": how many finished jobs are waiting for this person to close.
 * Refreshed when a sidebar appears, on every page change it is asked to follow, and once a minute.
 */
@Injectable({ providedIn: 'root' })
export class NonMoiJobBadgeService {
  private readonly jobs = inject(NonMoiJobService);
  private timer?: ReturnType<typeof setInterval>;

  readonly count = signal(0);

  /** Starts keeping the number fresh. Safe to call from every sidebar that shows it. */
  start(): void {
    this.refresh();
    if (!this.timer) this.timer = setInterval(() => this.refresh(), 60_000);
  }

  refresh(): void {
    this.jobs.awaitingClose().subscribe({
      next: (n) => this.count.set(n),
      // The number is a convenience: if it cannot be fetched it just stays as it was.
      error: () => undefined,
    });
  }
}
