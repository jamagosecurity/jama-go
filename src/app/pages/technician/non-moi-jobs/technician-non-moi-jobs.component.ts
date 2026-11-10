import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NonMoiJob } from '../../../models/non-moi-job.model';
import { NonMoiJobService } from '../../../services/non-moi-job.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { navigationUrl, toSitePin } from '../../../utils/geo.util';

/**
 * The Non-MOI jobs admin has issued to the signed-in technician — the
 * counterpart of the DIA list, but only their own. Each card carries the
 * customer, what to do (in English and Arabic) and a Navigate button that routes
 * to the pin, or searches the address when the job has none.
 */
@Component({
  selector: 'app-technician-non-moi-jobs',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './technician-non-moi-jobs.component.html',
  styleUrl: './technician-non-moi-jobs.component.css',
})
export class TechnicianNonMoiJobsComponent implements OnInit {
  private readonly service = inject(NonMoiJobService);

  protected readonly jobs = signal<NonMoiJob[]>([]);
  /** Two lists, so what still needs doing is never mixed in with what is finished. */
  protected readonly groups = computed(() => {
    const all = this.jobs();
    return [
      { key: 'todo', title: 'To do', empty: 'Nothing left to do — all your jobs are completed.', jobs: all.filter((j) => j.status !== 'Completed') },
      { key: 'done', title: 'Completed', empty: '', jobs: all.filter((j) => j.status === 'Completed') },
    ].filter((g) => g.jobs.length || g.key === 'todo');
  });

  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .mine()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (jobs) => this.jobs.set(jobs),
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load your jobs.')),
      });
  }

  protected navigateTo(job: NonMoiJob): string {
    return navigationUrl({ latitude: job.latitude, longitude: job.longitude, clientLocation: job.location });
  }

  protected isPinned(job: NonMoiJob): boolean {
    return toSitePin(job.latitude, job.longitude) !== null;
  }

  /** A tel: link so the customer can be rung with one tap from the card. */
  protected callTo(job: NonMoiJob): string {
    return `tel:${job.customerNumber.replace(/[^\d+]/g, '')}`;
  }
}
