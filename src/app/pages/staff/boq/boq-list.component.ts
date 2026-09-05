import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { PaginatedData } from '../../../models/api-result.model';
import { BOQ_STATUSES, BoqListItem, BoqStatus } from '../../../models/boq.model';
import { BoqService } from '../../../services/boq.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { downloadBlob } from '../../../utils/download.util';
import { BOQ_BASE_PATH } from './boq-base-path';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-boq-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boq-list.component.html',
  styleUrl: './boq.css',
})
export class BoqListComponent implements OnInit {
  private readonly service = inject(BoqService);
  private readonly destroyRef = inject(DestroyRef);

  /** The portal these screens are mounted under — see BOQ_BASE_PATH. */
  protected readonly basePath = inject(BOQ_BASE_PATH);

  protected readonly statuses = BOQ_STATUSES;
  protected readonly result = signal<PaginatedData<BoqListItem> | null>(null);
  protected readonly loading = signal(true);
  protected readonly listError = signal('');
  protected readonly busyId = signal<string | null>(null);
  protected readonly pendingDeleteId = signal<string | null>(null);

  protected readonly page = signal(1);
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly statusControl = new FormControl<BoqStatus | ''>('', { nonNullable: true });
  protected readonly mineControl = new FormControl(false, { nonNullable: true });

  /** Mirrored into signals — see the note in camera-list: a computed() reading
   *  FormControl.value never invalidates. */
  private readonly searchValue = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  private readonly statusValue = toSignal(this.statusControl.valueChanges, { initialValue: '' as BoqStatus | '' });
  private readonly mineValue = toSignal(this.mineControl.valueChanges, { initialValue: false });

  protected readonly hasFilters = computed(
    () => !!this.searchValue().trim() || !!this.statusValue() || this.mineValue(),
  );

  ngOnInit(): void {
    this.load();
    // Subscribed one by one rather than in a loop: the three controls hold
    // different value types, and the union of their valueChanges has no common
    // callable subscribe signature.
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetToFirstPage());

    this.statusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetToFirstPage());

    this.mineControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetToFirstPage());
  }

  private resetToFirstPage(): void {
    this.page.set(1);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.listError.set('');

    this.service
      .list({
        pageNumber: this.page(),
        pageSize: PAGE_SIZE,
        search: this.searchControl.value.trim() || undefined,
        status: this.statusControl.value || undefined,
        mineOnly: this.mineControl.value || undefined,
      })
      // Cleared in the handlers: the empty-page case starts a second request
      // from inside next(), and finalize would switch loading off mid-flight.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (!page.items.length && page.pageNumber > 1) {
            this.page.set(page.pageNumber - 1);
            this.load();
            return;
          }
          this.result.set(page);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.listError.set(getApiErrorMessage(err, 'Unable to load quotations.'));
          this.loading.set(false);
        },
      });
  }

  protected clearFilters(): void {
    this.searchControl.setValue('');
    this.statusControl.setValue('');
    this.mineControl.setValue(false);
  }

  protected goToPage(page: number): void {
    const total = this.result()?.totalPages ?? 1;
    if (page < 1 || page > total || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  protected download(boq: BoqListItem): void {
    this.busyId.set(boq.id);
    this.listError.set('');
    this.service
      .downloadPdf(boq.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busyId.set(null)))
      .subscribe({
        next: (blob) => downloadBlob(blob, `${boq.boqNumber}.pdf`),
        error: (err: unknown) =>
          this.listError.set(getApiErrorMessage(err, 'Unable to download the PDF.')),
      });
  }

  protected askDelete(boq: BoqListItem): void {
    this.pendingDeleteId.set(boq.id);
  }

  protected cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  protected confirmDelete(boq: BoqListItem): void {
    this.busyId.set(boq.id);
    this.service
      .delete(boq.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.busyId.set(null);
          this.pendingDeleteId.set(null);
        }),
      )
      .subscribe({
        next: () => this.load(),
        error: (err: unknown) =>
          this.listError.set(getApiErrorMessage(err, 'Unable to delete the quotation.')),
      });
  }
}
