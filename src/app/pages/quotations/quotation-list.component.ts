import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { PaginatedData } from '../../models/api-result.model';
import {
  QUOTATION_STATUSES,
  QuotationListItem,
  QuotationStatus,
  QuotationSummary,
} from '../../models/quotation.model';
import { QuotationService } from '../../services/quotation.service';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { downloadBlob } from '../../utils/download.util';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-quotation-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quotation-list.component.html',
  styleUrl: './quotations.css',
})
export class QuotationListComponent implements OnInit {
  private readonly service = inject(QuotationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = QUOTATION_STATUSES;

  protected readonly result = signal<PaginatedData<QuotationListItem> | null>(null);
  protected readonly summary = signal<QuotationSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly listError = signal('');

  protected readonly pendingDeleteId = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);

  protected readonly page = signal(1);
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly statusControl = new FormControl<QuotationStatus | ''>('', {
    nonNullable: true,
  });

  protected readonly hasFilters = computed(
    () => !!this.searchControl.value.trim() || !!this.statusControl.value,
  );

  protected readonly rangeStart = computed(() => {
    const page = this.result();
    return page && page.totalCount ? (page.pageNumber - 1) * page.pageSize + 1 : 0;
  });

  protected readonly rangeEnd = computed(() => {
    const page = this.result();
    return page ? Math.min(page.pageNumber * page.pageSize, page.totalCount) : 0;
  });

  ngOnInit(): void {
    this.load();
    this.loadSummary();

    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetToFirstPage());

    this.statusControl.valueChanges
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
      })
      // Cleared in the handlers rather than with finalize(): the empty-page case
      // starts a second request from inside next(), and finalize would switch
      // loading off while that one was still in flight.
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

  /** Fire-and-forget: the tiles are a nicety and must not surface as a page error. */
  private loadSummary(): void {
    this.service
      .summary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (value) => this.summary.set(value), error: () => {} });
  }

  protected clearFilters(): void {
    this.searchControl.setValue('');
    this.statusControl.setValue('');
  }

  protected goToPage(page: number): void {
    const total = this.result()?.totalPages ?? 1;
    if (page < 1 || page > total || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  protected download(quote: QuotationListItem): void {
    this.busyId.set(quote.id);
    this.listError.set('');

    this.service
      .downloadPdf(quote.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyId.set(null)),
      )
      .subscribe({
        next: (blob) => downloadBlob(blob, `${quote.quoteNumber}.pdf`),
        error: (err: unknown) =>
          this.listError.set(getApiErrorMessage(err, 'Unable to download the PDF.')),
      });
  }

  protected askDelete(quote: QuotationListItem): void {
    this.pendingDeleteId.set(quote.id);
  }

  protected cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  protected confirmDelete(quote: QuotationListItem): void {
    this.busyId.set(quote.id);
    this.listError.set('');

    this.service
      .delete(quote.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.busyId.set(null);
          this.pendingDeleteId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.load();
          this.loadSummary();
        },
        error: (err: unknown) =>
          this.listError.set(getApiErrorMessage(err, 'Unable to delete the quotation.')),
      });
  }
}
