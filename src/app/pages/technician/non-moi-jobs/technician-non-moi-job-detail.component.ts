import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { NonMoiJob } from '../../../models/non-moi-job.model';
import { MaintenanceIssueOption, maintenanceCategoryLabel } from '../../../models/maintenance.model';
import { MaintenanceService } from '../../../services/maintenance.service';
import { jobStatusLabel } from '../../../utils/non-moi-job-status.util';
import { NonMoiJobService } from '../../../services/non-moi-job.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { navigationUrl, toSitePin } from '../../../utils/geo.util';

interface Group { category: string; items: MaintenanceIssueOption[] }

/**
 * One Non-MOI job. The technician ticks the issues he fixed from the Non-MOI price
 * list, sets how many of each, and completes the job. The total here is only a
 * running preview — the server prices the lines itself when he completes it.
 */
@Component({
  selector: 'app-technician-non-moi-job-detail',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './technician-non-moi-job-detail.component.html',
  styleUrl: './technician-non-moi-job-detail.component.css',
})
export class TechnicianNonMoiJobDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly jobs = inject(NonMoiJobService);
  private readonly maintenance = inject(MaintenanceService);

  protected readonly job = signal<NonMoiJob | null>(null);
  protected readonly catalogue = signal<MaintenanceIssueOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly notes = signal('');
  /** issue id → quantity, for the ticked ones only. */
  protected readonly picked = signal<ReadonlyMap<string, number>>(new Map());

  protected readonly groups = computed<Group[]>(() => {
    const out: Group[] = [];
    for (const item of this.catalogue()) {
      const g = out.find((x) => x.category === item.category);
      if (g) g.items.push(item); else out.push({ category: item.category, items: [item] });
    }
    return out;
  });

  protected readonly total = computed(() =>
    this.catalogue().reduce((sum, i) => sum + (this.picked().get(i.id) ?? 0) * i.defaultFee, 0));
  protected readonly count = computed(() => this.picked().size);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({ mine: this.jobs.mine(), catalogue: this.maintenance.issueCatalogue() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ mine, catalogue }) => {
          const found = mine.find((j) => j.id === id) ?? null;
          this.job.set(found);
          this.catalogue.set(catalogue);
          if (!found) this.error.set('This job was not found, or it is not assigned to you.');
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load the job.')),
      });
  }

  protected readonly categoryLabel = maintenanceCategoryLabel;

  protected readonly statusLabel = jobStatusLabel;

  protected isPicked(i: MaintenanceIssueOption): boolean { return this.picked().has(i.id); }

  protected toggle(i: MaintenanceIssueOption): void {
    this.picked.update((m) => {
      const next = new Map(m);
      if (!next.delete(i.id)) next.set(i.id, 1);
      return next;
    });
  }

  protected complete(): void {
    const job = this.job();
    if (!job || this.saving() || !this.count()) return;
    this.saving.set(true);
    this.error.set('');
    const lines = this.catalogue()
      .filter((i) => this.picked().has(i.id))
      .map((i) => ({ category: i.category, issueType: i.issueType, quantity: this.picked().get(i.id)! }));
    this.jobs
      .complete(job.id, { lines, notes: this.notes().trim() || null })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (done) => this.job.set(done),
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not complete the job.')),
      });
  }

  protected navigateTo(job: NonMoiJob): string {
    return navigationUrl({ latitude: job.latitude, longitude: job.longitude, clientLocation: job.location });
  }
  protected isPinned(job: NonMoiJob): boolean { return toSitePin(job.latitude, job.longitude) !== null; }
}
