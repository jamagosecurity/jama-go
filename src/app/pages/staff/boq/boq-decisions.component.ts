import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PaginatedData } from '../../../models/api-result.model';
import { BoqListItem, BoqStatus } from '../../../models/boq.model';
import { BoqService } from '../../../services/boq.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { BOQ_BASE_PATH } from './boq-base-path';

const PAGE_SIZE = 20;

/**
 * What has been decided: the approved quotations, and the rejected ones.
 *
 * One screen with a tab rather than two sidebar entries. They answer the same
 * question — what was decided — and the only differences are the status asked
 * for and the two columns that follow from it: who decided and when, plus the
 * reason on a rejection.
 *
 * The tab lives in the query string, so a particular list can still be linked
 * to and the browser's back button steps between them.
 *
 * The decision fields come off the list row itself, so neither tab has to open
 * a quotation to say who signed it off.
 */
@Component({
  selector: 'app-boq-decisions',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boq-decisions.component.html',
  styleUrl: './boq.css',
})
export class BoqDecisionsComponent implements OnInit {
  private readonly service = inject(BoqService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly basePath = inject(BOQ_BASE_PATH);

  /** Which tab is open, from ?status= — approved unless asked otherwise. */
  protected readonly status = signal<BoqStatus>('Approved');
  protected readonly rejected = computed(() => this.status() === 'Rejected');

  protected readonly result = signal<PaginatedData<BoqListItem> | null>(null);
  protected readonly loading = signal(true);
  protected readonly listError = signal('');
  protected readonly page = signal(1);

  protected readonly heading = computed(() =>
    this.rejected() ? 'Rejected quotations' : 'Approved quotations');

  protected readonly blurb = computed(() =>
    this.rejected()
      ? 'Every quotation an approver sent back, with the reason they gave.'
      : 'Every quotation that has been approved, and who approved it.');

  ngOnInit(): void {
    // Subscribed rather than read once: switching tabs changes the query string
    // without remounting the component, and the back button has to work too.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.status.set(params.get('status') === 'Rejected' ? 'Rejected' : 'Approved');
        this.page.set(1);
        this.load();
      });
  }

  /** Moves the tab through the URL, so the list can be linked to. */
  protected showTab(status: BoqStatus): void {
    if (this.status() === status) return;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status },
      replaceUrl: true,
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.listError.set('');

    this.service
      .list({ pageNumber: this.page(), pageSize: PAGE_SIZE, status: this.status() })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => this.result.set(result),
        error: (err: unknown) =>
          this.listError.set(getApiErrorMessage(err, 'Unable to load these quotations.')),
      });
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }
}
