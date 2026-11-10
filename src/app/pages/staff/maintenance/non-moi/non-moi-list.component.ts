import { DecimalPipe } from '@angular/common';
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
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AppSelectComponent } from '../../../../components/app-select/app-select.component';
import {
  MaintenanceCategory,
  MAINTENANCE_CATEGORIES,
  MaintenanceIssueOption,
  maintenanceCategoryLabel,
  maintenanceCategoryOptions,
} from '../../../../models/maintenance.model';
import { MaintenanceService } from '../../../../services/maintenance.service';
import { getApiErrorMessage } from '../../../../utils/api-error.util';
import { NON_MOI_BASE_PATH } from './non-moi-base-path';

const PAGE_SIZE = 20;

/**
 * The Non-MOI price list as a list, laid out like the stock inventory: figures
 * across the top, search and category filter, then the services with Edit and
 * Delete. Adding or editing one is its own page — see NonMoiEditorComponent.
 *
 * The whole list is small (tens of services, not thousands), so it is loaded
 * once and filtered and paged in the browser rather than per keystroke.
 */
@Component({
  selector: 'app-non-moi-list',
  standalone: true,
  imports: [RouterLink, DecimalPipe, AppSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './non-moi-list.component.html',
  styleUrl: './non-moi-list.component.css',
})
export class NonMoiListComponent implements OnInit {
  private readonly service = inject(MaintenanceService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly base = inject(NON_MOI_BASE_PATH);

  /** Every section, including any admin has added — read off the list itself. */
  protected readonly categoryOptions = computed(() =>
    maintenanceCategoryOptions(this.items().map((i) => i.category)),
  );
  protected readonly categoryFilterOptions = computed(() => [
    { value: '', label: 'All categories' },
    ...this.categoryOptions(),
  ]);
  protected readonly categoryLabel = maintenanceCategoryLabel;

  protected readonly items = signal<MaintenanceIssueOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly listError = signal('');
  protected readonly search = signal('');
  protected readonly category = signal<MaintenanceCategory | ''>('');
  protected readonly page = signal(1);

  protected readonly pendingDeleteId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly justSavedId = signal<string | null>(null);
  protected readonly toast = signal<{ text: string; tone: 'ok' | 'bad' } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const category = this.category();
    return this.items().filter(
      (i) =>
        (!category || i.category === category) &&
        (!term ||
          i.issueType.toLowerCase().includes(term) ||
          (i.descriptionEn ?? '').toLowerCase().includes(term) ||
          (i.descriptionAr ?? '').includes(term)),
    );
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  protected readonly pageItems = computed(() =>
    this.filtered().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE),
  );
  protected readonly rangeStart = computed(() => (this.filtered().length ? (this.page() - 1) * PAGE_SIZE + 1 : 0));
  protected readonly rangeEnd = computed(() => Math.min(this.page() * PAGE_SIZE, this.filtered().length));

  /** Whole-list figures for the line under the title, not the filtered page. */
  protected readonly stats = computed(() => {
    const items = this.items();
    return { services: items.length, categoriesUsed: new Set(items.map((i) => i.category)).size };
  });

  /** Set when the filter is on a category admin added — the only kind that can
   *  be renamed or deleted; the six built-ins are fixed. */
  protected readonly customCategory = computed(() => {
    const category = this.category();
    return category && !MAINTENANCE_CATEGORIES.some((c) => c.value === category) ? category : null;
  });
  protected readonly customCategoryCount = computed(
    () => this.items().filter((i) => i.category === this.customCategory()).length,
  );
  protected readonly renamingCategory = signal(false);
  protected readonly categoryDraft = signal('');
  protected readonly confirmingCategoryDelete = signal(false);
  protected readonly categoryBusy = signal(false);

  protected readonly hasFilters = computed(() => !!this.search() || !!this.category());

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.listError.set('');
    this.service
      .issueCatalogue()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.readSaveResult();
        },
        error: (err: unknown) => this.listError.set(getApiErrorMessage(err, 'Could not load the services.')),
      });
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  protected onCategory(value: string): void {
    this.renamingCategory.set(false);
    this.confirmingCategoryDelete.set(false);
    this.category.set(value as MaintenanceCategory | '');
    this.page.set(1);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.category.set('');
    this.page.set(1);
  }

  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.page.set(page);
  }

  protected askDelete(item: MaintenanceIssueOption): void {
    this.pendingDeleteId.set(item.id);
  }

  protected confirmDelete(item: MaintenanceIssueOption): void {
    this.deletingId.set(item.id);
    this.service
      .deleteCatalogueItem(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          this.items.update((items) => items.filter((i) => i.id !== item.id));
          this.pendingDeleteId.set(null);
          this.goToPage(Math.min(this.page(), this.totalPages()));
          this.showToast(`Deleted — ${item.issueType}`);
        },
        error: (err: unknown) => this.showToast(getApiErrorMessage(err, 'Could not delete that service.'), 'bad'),
      });
  }

  protected startRenameCategory(): void {
    this.categoryDraft.set(this.customCategory() ?? '');
    this.confirmingCategoryDelete.set(false);
    this.renamingCategory.set(true);
  }

  protected saveCategoryName(): void {
    const from = this.customCategory();
    const to = this.categoryDraft().trim();
    if (!from || !to || this.categoryBusy()) return;
    if (to === from) {
      this.renamingCategory.set(false);
      return;
    }

    this.categoryBusy.set(true);
    this.service
      .renameCategory(from, to)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.categoryBusy.set(false)))
      .subscribe({
        next: (stored) => {
          this.items.update((items) => items.map((i) => (i.category === from ? { ...i, category: stored } : i)));
          this.category.set(stored);
          this.renamingCategory.set(false);
          this.showToast(`Renamed — ${from} → ${stored}`);
        },
        error: (err: unknown) => this.showToast(getApiErrorMessage(err, 'Could not rename that category.'), 'bad'),
      });
  }

  protected confirmDeleteCategory(): void {
    const name = this.customCategory();
    if (!name || this.categoryBusy()) return;

    this.categoryBusy.set(true);
    this.service
      .deleteCategory(name)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.categoryBusy.set(false)))
      .subscribe({
        next: (removed) => {
          this.items.update((items) => items.filter((i) => i.category !== name));
          this.confirmingCategoryDelete.set(false);
          this.category.set('');
          this.page.set(1);
          this.showToast(`Deleted — ${name} (${removed} ${removed === 1 ? 'service' : 'services'})`);
        },
        error: (err: unknown) => this.showToast(getApiErrorMessage(err, 'Could not delete that category.'), 'bad'),
      });
  }

  protected dismissToast(): void {
    clearTimeout(this.toastTimer);
    this.toast.set(null);
  }

  /** The editor hands back what it saved through history.state, so the
   *  confirmation does not survive a refresh — same as the stock inventory. */
  private readSaveResult(): void {
    const state = history.state as { savedId?: string; savedName?: string; created?: boolean } | null;
    if (!state?.savedId || !state.savedName) return;

    const index = this.filtered().findIndex((i) => i.id === state.savedId);
    if (index >= 0) this.page.set(Math.floor(index / PAGE_SIZE) + 1);
    this.justSavedId.set(state.savedId);
    setTimeout(() => this.justSavedId.set(null), 6000);
    this.showToast(`${state.created ? 'Added' : 'Saved'} — ${state.savedName}`);
  }

  private showToast(text: string, tone: 'ok' | 'bad' = 'ok'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, tone });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4500);
  }
}
