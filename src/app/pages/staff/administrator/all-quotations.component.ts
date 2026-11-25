import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, finalize, switchMap } from 'rxjs';
import { PaginatedData } from '../../../models/api-result.model';
import { BoqStatus } from '../../../models/boq.model';
import { AdminQuotation } from '../../../models/proforma.model';
import { ProformaService } from '../../../services/proforma.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

/**
 * The office administrator's list: every quotation of every staff member, in any status. Clicking one opens it as
 * its proforma invoice (ProformaSheetComponent).
 */
@Component({
  selector: 'app-all-quotations',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './all-quotations.component.html',
  styleUrl: './all-quotations.component.css',
})
export class AllQuotationsComponent implements OnInit {
  private readonly api = inject(ProformaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload$ = new Subject<number>();

  protected readonly statuses: ReadonlyArray<{ value: BoqStatus | ''; label: string }> = [
    { value: '', label: 'All' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Submitted', label: 'Waiting approval' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  protected readonly search = signal('');
  protected readonly status = signal<BoqStatus | ''>('');
  protected readonly page = signal<PaginatedData<AdminQuotation> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.reload$
      .pipe(
        debounceTime(250),
        switchMap((pageNumber) => {
          this.loading.set(true);
          return this.api.quotations(pageNumber, this.search(), this.status()).pipe(
            catchError((e) => {
              this.error.set(getApiErrorMessage(e, 'Could not load the quotations.'));
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.page.set(page);
        this.error.set('');
      });
    this.reload$.next(1);
  }

  protected setSearch(value: string): void {
    this.search.set(value);
    this.reload$.next(1);
  }

  protected setStatus(value: BoqStatus | ''): void {
    this.status.set(value);
    this.reload$.next(1);
  }

  protected goTo(pageNumber: number): void {
    this.reload$.next(pageNumber);
  }

  protected quoteNo(q: AdminQuotation): string {
    return q.revisionNumber > 0 ? `${q.boqNumber} Rev ${q.revisionNumber}` : q.boqNumber;
  }

  /** "Name <email>" → "Name". */
  protected person(name: string | null): string {
    return (name ?? '').replace(/\s*<[^>]*>\s*$/, '').trim() || '—';
  }

  protected statusLabel(status: BoqStatus): string {
    return status === 'Submitted' ? 'Waiting approval' : status;
  }
}
