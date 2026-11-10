import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, startWith } from 'rxjs';
import { AppSelectComponent } from '../../../components/app-select/app-select.component';
import { PERMISSIONS } from '../../../models/auth.model';
import {
  MAINTENANCE_STATUSES,
  MaintenanceCategory,
  MaintenanceRequestListItem,
  MaintenanceStatus,
  maintenanceCategoryLabel,
  maintenanceCategoryOptions,
} from '../../../models/maintenance.model';
import { AuthService } from '../../../services/auth.service';
import { MaintenanceService } from '../../../services/maintenance.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { MAINTENANCE_BASE_PATH } from './maintenance-base-path';

/** The company-wide queue for maintenance.manage holders; everyone else
 *  (staff and clients alike) sees only the tickets they themselves filed. */
@Component({
  selector: 'app-maintenance-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, DecimalPipe, AppSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './maintenance-list.component.html',
  styleUrl: './maintenance-list.component.css',
})
export class MaintenanceListComponent implements OnInit {
  private readonly service = inject(MaintenanceService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  protected readonly basePath = inject(MAINTENANCE_BASE_PATH);

  protected readonly canManage = this.auth.can(PERMISSIONS.maintenanceManage);
  protected readonly statusFilterOptions = [{ value: '', label: 'All statuses' }, ...MAINTENANCE_STATUSES];
  /** The six built-in sections until the price list says which others admin
   *  has added. */
  protected readonly categoryFilterOptions = signal([
    { value: '', label: 'All categories' },
    ...maintenanceCategoryOptions(),
  ]);

  protected readonly filters = this.formBuilder.nonNullable.group({
    search: [''],
    status: this.formBuilder.control<MaintenanceStatus | ''>(''),
    category: this.formBuilder.control<MaintenanceCategory | ''>(''),
    unassignedOnly: [false],
  });

  protected readonly tickets = signal<MaintenanceRequestListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);

  ngOnInit(): void {
    if (!this.canManage) {
      this.loadMine();
      return;
    }

    // Best effort: without it the filter still offers the six built-ins.
    this.service
      .issueCatalogue()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) =>
          this.categoryFilterOptions.set([
            { value: '', label: 'All categories' },
            ...maintenanceCategoryOptions(items.map((i) => i.category)),
          ]),
        error: () => undefined,
      });

    this.filters.valueChanges
      .pipe(
        startWith(this.filters.getRawValue()),
        debounceTime(200),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    const value = this.filters.getRawValue();

    this.service
      .list({
        pageNumber: this.page(),
        pageSize: 20,
        search: value.search.trim() || undefined,
        status: value.status || undefined,
        category: value.category || undefined,
        unassignedOnly: value.unassignedOnly || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.tickets.set(result.items);
          this.totalPages.set(result.totalPages);
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load tickets.')),
      });
  }

  private loadMine(): void {
    this.loading.set(true);
    this.error.set('');

    this.service
      .getMine()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (tickets) => {
          this.tickets.set(tickets);
          this.totalPages.set(1);
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load your tickets.')),
      });
  }

  protected goToPage(page: number): void {
    if (!this.canManage || page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.load();
  }

  protected clearFilters(): void {
    this.filters.reset({ search: '', status: '', category: '', unassignedOnly: false });
  }

  protected categoryLabels(ticket: MaintenanceRequestListItem): string {
    return ticket.categories.map(maintenanceCategoryLabel).join(', ') || '—';
  }

  protected hasFilters(): boolean {
    const v = this.filters.getRawValue();
    return !!(v.search || v.status || v.category || v.unassignedOnly);
  }
}
