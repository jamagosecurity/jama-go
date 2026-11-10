import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NonMoiJob } from '../../../models/non-moi-job.model';
import { NonMoiJobService } from '../../../services/non-moi-job.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { toSitePin } from '../../../utils/geo.util';
import { NON_MOI_JOBS_BASE_PATH } from './non-moi-jobs-base-path';

const PAGE_SIZE = 20;

/**
 * The Non-MOI jobs admin has issued, newest first — each goes to one
 * technician, who sees it in their own portal. Laid out like the Non-MOI
 * price list; issuing or editing one is its own page.
 *
 * The list is small, so it is loaded once and searched and paged in the browser.
 */
@Component({
  selector: 'app-non-moi-job-list',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './non-moi-job-list.component.html',
  styleUrl: './non-moi-job-list.component.css',
})
export class NonMoiJobListComponent implements OnInit {
  private readonly service = inject(NonMoiJobService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly base = inject(NON_MOI_JOBS_BASE_PATH);

  protected readonly jobs = signal<NonMoiJob[]>([]);
  protected readonly loading = signal(true);
  protected readonly listError = signal('');
  protected readonly search = signal('');
  protected readonly page = signal(1);

  protected readonly pendingDeleteId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly justSavedId = signal<string | null>(null);
  protected readonly toast = signal<{ text: string; tone: 'ok' | 'bad' } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.jobs();
    return this.jobs().filter((j) =>
      [j.jobNumber, j.customerName, j.customerNumber, j.location, j.assignedToName, j.descriptionEn]
        .some((text) => text.toLowerCase().includes(term)),
    );
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  protected readonly pageItems = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });
  protected readonly rangeStart = computed(() => (this.filtered().length ? (this.page() - 1) * PAGE_SIZE + 1 : 0));
  protected readonly rangeEnd = computed(() => Math.min(this.page() * PAGE_SIZE, this.filtered().length));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.listError.set('');
    this.service
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (jobs) => {
          this.jobs.set(jobs);
          this.readSaveResult();
        },
        error: (err: unknown) => this.listError.set(getApiErrorMessage(err, 'Could not load the jobs.')),
      });
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.page.set(page);
  }

  protected isPinned(job: NonMoiJob): boolean {
    return toSitePin(job.latitude, job.longitude) !== null;
  }

  protected askDelete(job: NonMoiJob): void {
    this.pendingDeleteId.set(job.id);
  }

  protected confirmDelete(job: NonMoiJob): void {
    this.deletingId.set(job.id);
    this.service
      .remove(job.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          this.jobs.update((jobs) => jobs.filter((j) => j.id !== job.id));
          this.pendingDeleteId.set(null);
          this.goToPage(Math.min(this.page(), this.totalPages()));
          this.showToast(`Deleted — ${job.jobNumber}`);
        },
        error: (err: unknown) => this.showToast(getApiErrorMessage(err, 'Could not delete that job.'), 'bad'),
      });
  }

  protected dismissToast(): void {
    clearTimeout(this.toastTimer);
    this.toast.set(null);
  }

  /** The editor hands back what it saved through history.state, so the
   *  confirmation does not survive a refresh — same as the price list. */
  private readSaveResult(): void {
    const state = history.state as { savedId?: string; savedName?: string; created?: boolean } | null;
    if (!state?.savedId || !state.savedName) return;

    const index = this.filtered().findIndex((j) => j.id === state.savedId);
    if (index >= 0) this.page.set(Math.floor(index / PAGE_SIZE) + 1);
    this.justSavedId.set(state.savedId);
    setTimeout(() => this.justSavedId.set(null), 6000);
    this.showToast(`${state.created ? 'Issued' : 'Saved'} — ${state.savedName}`);
  }

  private showToast(text: string, tone: 'ok' | 'bad' = 'ok'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, tone });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4500);
  }
}
