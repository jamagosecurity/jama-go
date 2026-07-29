import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, debounceTime, distinctUntilChanged, filter, finalize, switchMap } from 'rxjs';
import { DIA_STATUSES, Dia, DiaListQuery, DiaStatus, PaginatedData } from '../../../../models/dia.model';
import { DiaService } from '../../../../services/dia.service';
import { getApiErrorMessage } from '../../../../utils/api-error.util';
import { DIA_BASE_PATH } from '../dia-base-path';
import {
  ConfirmationDialogData,
  DiaConfirmationDialogComponent,
  DiaEmptyStateComponent,
  DiaSkeletonComponent,
  DiaStatusChipComponent,
} from '../shared/dia-shared.components';

@Component({
  selector: 'app-dia-list',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    DiaEmptyStateComponent,
    DiaSkeletonComponent,
    DiaStatusChipComponent,
  ],
  templateUrl: './dia-list.component.html',
  styleUrl: '../dia.styles.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaListComponent implements OnInit {
  private readonly service = inject(DiaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  /** Portal this screen is mounted under — see DIA_BASE_PATH. */
  protected readonly base = inject(DIA_BASE_PATH);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = DIA_STATUSES;
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  /** 'Archived' is a filter mode, not a cycle status — it swaps the list over
   *  to soft-deleted records rather than filtering the live ones. */
  protected readonly statusControl = new FormControl<DiaStatus | 'Archived' | ''>('', {
    nonNullable: true,
  });
  protected readonly result = signal<PaginatedData<Dia> | null>(null);
  protected readonly loading = signal(true);
  protected readonly actionId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly query = signal<DiaListQuery>({
    pageNumber: 1,
    pageSize: 10,
    sortBy: 'createdDate',
    sortDirection: 'desc',
  });
  protected readonly displayedColumns = [
    'diaNumber',
    'clientNumber',
    'clientName',
    'clientLocation',
    'currentQuarter',
    'activatedDate',
    'nextInspectionDate',
    'status',
    'actions',
  ];

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const statusValue = params.get('status');
      const archived = statusValue === 'Archived';
      const status =
        !archived && this.statuses.includes(statusValue as DiaStatus)
          ? (statusValue as DiaStatus)
          : undefined;
      const query: DiaListQuery = {
        pageNumber: Math.max(1, Number(params.get('page')) || 1),
        pageSize: [10, 25, 50].includes(Number(params.get('pageSize')))
          ? Number(params.get('pageSize'))
          : 10,
        search: params.get('search')?.trim() || undefined,
        status,
        archived,
        sortBy: params.get('sortBy') || 'createdDate',
        sortDirection: params.get('sortDirection') === 'asc' ? 'asc' : 'desc',
      };
      this.query.set(query);
      this.searchControl.setValue(query.search ?? '', { emitEvent: false });
      this.statusControl.setValue(archived ? 'Archived' : (query.status ?? ''), {
        emitEvent: false,
      });
      this.load();
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.navigate({ page: 1, search: search.trim() || null }));

    this.statusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => this.navigate({ page: 1, status: status || null }));
  }

  protected pageChanged(event: PageEvent): void {
    this.navigate({ page: event.pageIndex + 1, pageSize: event.pageSize });
  }

  protected sortChanged(sort: Sort): void {
    this.navigate({
      page: 1,
      sortBy: sort.active,
      sortDirection: sort.direction || 'desc',
    });
  }

  protected clearFilters(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  protected retry(): void {
    this.load();
  }

  protected statusLabel(status: DiaStatus): string {
    return status.startsWith('Quarter') ? `Quarter ${status.slice(-1)}` : status;
  }

  protected quarterLabel(item: Dia): string {
    return (item.currentQuarter ?? 0) > 0 ? `Q${item.currentQuarter}` : '—';
  }

  protected confirmAction(
    item: Dia,
    action: 'activate' | 'deactivate' | 'archive' | 'restore',
  ): void {
    const definitions: Record<typeof action, ConfirmationDialogData> = {
      activate: {
        title: 'Activate DIA inspection?',
        message: `${item.diaNumber} will begin its quarterly inspection schedule.`,
        confirmLabel: 'Activate',
      },
      deactivate: {
        title: 'Deactivate DIA inspection?',
        message: `${item.diaNumber} will stop its active inspection schedule.`,
        confirmLabel: 'Deactivate',
      },
      archive: {
        title: 'Archive DIA inspection?',
        // Was "cannot be undone" — no longer true now that Restore exists, and
        // telling an admin an action is permanent when it isn't makes them
        // avoid a safe action.
        message: `${item.diaNumber} will be removed from the active register. You can bring it back from the Archived filter.`,
        confirmLabel: 'Archive',
        danger: true,
      },
      restore: {
        title: 'Restore DIA inspection?',
        message: `${item.diaNumber} will return to the register as inactive. Activate it separately to restart its quarterly schedule.`,
        confirmLabel: 'Restore',
      },
    };
    this.dialog
      .open(DiaConfirmationDialogComponent, { data: definitions[action], width: '460px' })
      .afterClosed()
      .pipe(
        filter((confirmed): confirmed is true => confirmed === true),
        switchMap(() => {
          this.actionId.set(item.id);
          const request: Observable<unknown> =
            action === 'activate'
              ? this.service.activate(item.id)
              : action === 'deactivate'
                ? this.service.deactivate(item.id)
                : action === 'restore'
                  ? this.service.restore(item.id)
                  : this.service.archive(item.id);
          return request.pipe(finalize(() => this.actionId.set(null)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.snackBar.open(`DIA ${action}d successfully.`, 'Dismiss', { duration: 3500 });
          this.load();
        },
        error: (error: unknown) =>
          this.snackBar.open(getApiErrorMessage(error, `Unable to ${action} DIA.`), 'Dismiss', {
            duration: 6000,
          }),
      });
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .getList(this.query())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => this.result.set(result),
        error: (error: unknown) => {
          this.result.set(null);
          this.error.set(getApiErrorMessage(error, 'Unable to load DIA inspections.'));
        },
      });
  }
}
