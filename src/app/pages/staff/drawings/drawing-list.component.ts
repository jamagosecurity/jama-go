import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PaginatedData } from '../../../models/api-result.model';
import { DRAWING_STATUSES, DrawingListItem, DrawingStatus } from '../../../models/drawing.model';
import { DrawingService } from '../../../services/drawing.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { DRAWING_BASE_PATH } from './drawing-base-path';

const PAGE_SIZE = 20;

/** Mirrors BoqListComponent. */
@Component({
  selector: 'app-drawing-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drawing-list.component.html',
  styleUrl: '../boq/boq.css',
})
export class DrawingListComponent implements OnInit {
  private readonly service = inject(DrawingService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly basePath = inject(DRAWING_BASE_PATH);
  protected readonly statuses = DRAWING_STATUSES;

  protected readonly result = signal<PaginatedData<DrawingListItem> | null>(null);
  protected readonly loading = signal(true);
  protected readonly listError = signal('');
  protected readonly busyId = signal<string | null>(null);
  protected readonly pendingDeleteId = signal<string | null>(null);

  protected readonly page = signal(1);
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly statusControl = new FormControl<DrawingStatus | ''>('', { nonNullable: true });
  protected readonly mineControl = new FormControl(false, { nonNullable: true });

  private readonly searchValue = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  private readonly statusValue = toSignal(this.statusControl.valueChanges, { initialValue: '' as DrawingStatus | '' });
  private readonly mineValue = toSignal(this.mineControl.valueChanges, { initialValue: false });

  protected readonly hasFilters = computed(
    () => !!this.searchValue().trim() || !!this.statusValue() || this.mineValue(),
  );

  ngOnInit(): void {
    this.load();
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
          this.listError.set(getApiErrorMessage(err, 'Unable to load drawings.'));
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

  protected askDelete(drawing: DrawingListItem): void {
    this.pendingDeleteId.set(drawing.id);
  }

  protected cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  protected confirmDelete(drawing: DrawingListItem): void {
    this.busyId.set(drawing.id);
    this.service.delete(drawing.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.pendingDeleteId.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.pendingDeleteId.set(null);
        this.listError.set(getApiErrorMessage(err, 'Unable to delete the drawing.'));
      },
    });
  }
}
