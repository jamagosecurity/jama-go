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

  // ----- keeping the Non-MOI inventory up to date from the job -----
  // A price changed here is the inventory price, for every job from now on; an item added here is in the inventory
  // at once and ticked on this job. Both are recorded with who did it.
  protected readonly editingId = signal<string | null>(null);
  protected readonly editPrice = signal('');
  protected readonly addingIn = signal<string | null>(null);
  protected readonly newName = signal('');
  protected readonly newPrice = signal('');
  protected readonly catalogueBusy = signal(false);
  protected readonly catalogueError = signal('');
  protected readonly catalogueFlash = signal('');

  protected startEditPrice(i: MaintenanceIssueOption): void {
    this.addingIn.set(null);
    this.catalogueError.set('');
    this.editingId.set(i.id);
    this.editPrice.set(String(i.defaultFee));
  }

  protected savePrice(i: MaintenanceIssueOption): void {
    const price = this.parsePrice(this.editPrice());
    if (price === null) return;
    if (price === i.defaultFee) { this.editingId.set(null); return; }
    this.catalogueBusy.set(true);
    this.maintenance
      .updateCatalogueItem(i.id, { category: i.category, name: i.issueType, descriptionEn: i.descriptionEn, descriptionAr: i.descriptionAr, price })
      .pipe(finalize(() => this.catalogueBusy.set(false)))
      .subscribe({
        next: (saved) => {
          this.catalogue.update((list) => list.map((x) => (x.id === saved.id ? saved : x)));
          this.editingId.set(null);
          this.catalogueFlash.set(`${saved.issueType}: price changed to ${saved.defaultFee.toFixed(2)} QAR for everyone.`);
        },
        error: (err: unknown) => this.catalogueError.set(getApiErrorMessage(err, 'Could not change the price.')),
      });
  }

  protected startAdd(category: string): void {
    this.editingId.set(null);
    this.catalogueError.set('');
    this.addingIn.set(category);
    this.newName.set('');
    this.newPrice.set('');
  }

  protected saveNew(category: string): void {
    const name = this.newName().trim();
    if (!name) { this.catalogueError.set('Type the item name.'); return; }
    const price = this.parsePrice(this.newPrice());
    if (price === null) return;
    this.catalogueBusy.set(true);
    this.maintenance
      .addCatalogueItem({ category, name, descriptionEn: null, descriptionAr: null, price })
      .pipe(finalize(() => this.catalogueBusy.set(false)))
      .subscribe({
        next: (added) => {
          this.catalogue.update((list) => [...list, added]);
          this.addingIn.set(null);
          if (!this.isPicked(added)) this.toggle(added);
          this.catalogueFlash.set(`${added.issueType} added to the inventory and ticked on this job.`);
        },
        error: (err: unknown) => this.catalogueError.set(getApiErrorMessage(err, 'Could not add the item.')),
      });
  }

  /** A price as typed: a number with at most two decimals; null (with a message) otherwise. */
  private parsePrice(text: string): number | null {
    const value = text.replace(/,/g, '').trim();
    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      this.catalogueError.set('Enter the price as a number, like 45 or 120.50.');
      return null;
    }
    this.catalogueError.set('');
    return Number(value);
  }

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
          else if (found.status === 'Assigned') this.restoreDraft(found.id);
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load the job.')),
      });
  }

  protected readonly categoryLabel = maintenanceCategoryLabel;

  protected readonly statusLabel = jobStatusLabel;

  /** "Sara <sara@jamago.qa>" is how names are stored; on screen only the name reads well. */
  protected person(name: string | null | undefined): string {
    return (name ?? '').replace(/\s*<[^>]*>\s*$/, '').trim();
  }


  protected isPicked(i: MaintenanceIssueOption): boolean { return this.picked().has(i.id); }

  protected toggle(i: MaintenanceIssueOption): void {
    this.picked.update((m) => {
      const next = new Map(m);
      if (!next.delete(i.id)) next.set(i.id, 1);
      return next;
    });
    this.saveDraft();
  }

  // What has been ticked is kept on the phone until the job is completed, so a dropped session or a reload
  // does not cost the technician their selection.
  private draftKey(id: string): string { return `jamago_nonmoi_draft_${id}`; }

  protected saveNotes(): void { this.saveDraft(); }

  private saveDraft(): void {
    const job = this.job();
    if (!job) return;
    try {
      localStorage.setItem(this.draftKey(job.id), JSON.stringify({ picked: [...this.picked()], notes: this.notes() }));
    } catch { /* storage unavailable: the page still works */ }
  }

  private restoreDraft(id: string): void {
    try {
      const raw = localStorage.getItem(this.draftKey(id));
      if (!raw) return;
      const draft = JSON.parse(raw) as { picked?: [string, number][]; notes?: string };
      const known = new Set(this.catalogue().map((i) => i.id));
      this.picked.set(new Map((draft.picked ?? []).filter(([key]) => known.has(key))));
      this.notes.set(draft.notes ?? '');
    } catch { /* a bad draft is ignored */ }
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
        next: (done) => {
          this.job.set(done);
          try { localStorage.removeItem(this.draftKey(done.id)); } catch { /* ignore */ }
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not complete the job.')),
      });
  }

  protected navigateTo(job: NonMoiJob): string {
    return navigationUrl({ latitude: job.latitude, longitude: job.longitude, clientLocation: job.location });
  }
  protected isPinned(job: NonMoiJob): boolean { return toSitePin(job.latitude, job.longitude) !== null; }
}
