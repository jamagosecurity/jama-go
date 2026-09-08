import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PaginatedData } from '../../../models/api-result.model';
import { DrawingListItem, DrawingStatus } from '../../../models/drawing.model';
import { DrawingService } from '../../../services/drawing.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { DRAWING_BASE_PATH } from './drawing-base-path';

const PAGE_SIZE = 20;

/**
 * What has been decided: the approved drawings, and the rejected ones. Mirrors
 * BoqDecisionsComponent — one screen with a tab in the query string rather than
 * two sidebar entries.
 */
@Component({
  selector: 'app-drawing-decisions',
  standalone: true,
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drawing-decisions.component.html',
  styleUrl: '../boq/boq.css',
})
export class DrawingDecisionsComponent implements OnInit {
  private readonly service = inject(DrawingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly basePath = inject(DRAWING_BASE_PATH);

  protected readonly status = signal<DrawingStatus>('Approved');
  protected readonly rejected = computed(() => this.status() === 'Rejected');

  protected readonly result = signal<PaginatedData<DrawingListItem> | null>(null);
  protected readonly loading = signal(true);
  protected readonly listError = signal('');
  protected readonly page = signal(1);

  protected readonly heading = computed(() =>
    this.rejected() ? 'Rejected drawings' : 'Approved drawings');

  protected readonly blurb = computed(() =>
    this.rejected()
      ? 'Every drawing an approver sent back, with the reason they gave.'
      : 'Every drawing that has been approved, and who approved it.');

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.status.set(params.get('status') === 'Rejected' ? 'Rejected' : 'Approved');
        this.page.set(1);
        this.load();
      });
  }

  protected showTab(status: DrawingStatus): void {
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
          this.listError.set(getApiErrorMessage(err, 'Unable to load these drawings.')),
      });
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }
}
