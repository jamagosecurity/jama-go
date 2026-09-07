import { DecimalPipe, LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { PaginatedData } from '../../../models/api-result.model';
import { AuthService } from '../../../services/auth.service';
import {
  Camera,
  CameraSummary,
  CameraType,
  PRODUCT_CATEGORIES,
  ProductCategory,
  brandInitials,
  cameraTypeLabel,
  matchCameraBrand,
} from '../../../models/camera.model';
import { CameraService } from '../../../services/camera.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { CAMERAS_BASE_PATH } from './cameras-base-path';

const PAGE_SIZE = 20;

/**
 * The stock list. Adding and editing live on their own pages — see
 * CameraEditorComponent — so this screen is only ever a table you can scan.
 */
@Component({
  selector: 'app-camera-list',
  standalone: true,
  imports: [DecimalPipe, LowerCasePipe, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './camera-list.component.html',
  styleUrl: './camera-list.component.css',
})
export class CameraListComponent implements OnInit {
  private readonly service = inject(CameraService);
  private readonly auth = inject(AuthService);

  /**
   * Whether this account may change the catalogue.
   *
   * Only the super administrator can: everything the business quotes is priced
   * from these rows. Everyone else reads them. The API refuses the write either
   * way — this only keeps a button from being offered that would 403.
   */
  protected readonly canEditStock = computed(() => this.auth.isSuperAdmin());
  private readonly destroyRef = inject(DestroyRef);

  /** Portal this screen is mounted under — see CAMERAS_BASE_PATH. */
  protected readonly base = inject(CAMERAS_BASE_PATH);

  /** Filter options from the data, since type is free text and has no fixed
   *  list to offer. Loaded alongside the summary. */
  protected readonly cameraTypes = signal<string[]>([]);
  protected readonly categories = PRODUCT_CATEGORIES;
  protected readonly brandLogo = matchCameraBrand;
  protected readonly brandInitials = brandInitials;
  protected readonly typeLabel = cameraTypeLabel;

  protected readonly result = signal<PaginatedData<Camera> | null>(null);
  protected readonly loading = signal(true);
  protected readonly listError = signal('');

  /** Whole-inventory totals for the header tiles. Left alone on failure — the
   *  tiles stay hidden rather than showing 0. */
  protected readonly summary = signal<CameraSummary | null>(null);

  /**
   * Confirmation after a write. The editor navigates back here and passes what
   * it saved in the navigation state, so the confirmation lands on the screen
   * showing the result rather than on the form that has just been left.
   */
  protected readonly toast = signal<{ text: string; tone: 'ok' | 'bad' } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  /** The row just written, highlighted in the table and scrolled to. */
  protected readonly justSavedId = signal<string | null>(null);
  private highlightTimer?: ReturnType<typeof setTimeout>;

  /** The row awaiting delete confirmation, so removal always takes two clicks. */
  protected readonly pendingDeleteId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);

  protected readonly page = signal(1);
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly typeFilterControl = new FormControl<CameraType | ''>('', { nonNullable: true });
  protected readonly categoryFilterControl = new FormControl<ProductCategory | ''>('', {
    nonNullable: true,
  });
  protected readonly lowStockFilterControl = new FormControl(false, { nonNullable: true });

  /**
   * Mirrored into signals because a computed() that reads FormControl.value
   * takes no dependency on it — the control is not a signal, so the computed
   * evaluated once and cached, and "Clear filters" never appeared.
   */
  private readonly searchValue = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  private readonly typeValue = toSignal(this.typeFilterControl.valueChanges, { initialValue: '' as CameraType | '' });
  private readonly categoryValue = toSignal(this.categoryFilterControl.valueChanges, { initialValue: '' as ProductCategory | '' });
  private readonly lowStockValue = toSignal(this.lowStockFilterControl.valueChanges, { initialValue: false });

  protected readonly hasFilters = computed(
    () =>
      !!this.searchValue().trim() ||
      !!this.typeValue() ||
      !!this.categoryValue() ||
      this.lowStockValue(),
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
    this.readSaveResult();
    this.load();
    this.loadSummary();

    // Silent on failure: the filter simply offers nothing rather than the page
    // reporting an error for a convenience.
    this.service
      .typeCounts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (counts) => this.cameraTypes.set(counts.map((c) => c.type).filter(Boolean)),
        error: () => this.cameraTypes.set([]),
      });

    // Debounced so a name typed letter by letter is one request, not eight.
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetToFirstPage());

    this.typeFilterControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetToFirstPage());

    this.categoryFilterControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetToFirstPage());

    this.lowStockFilterControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetToFirstPage());
  }

  /**
   * What the editor left behind, if we arrived from a save. Read from
   * history.state rather than a query parameter so the confirmation does not
   * survive a refresh — a reloaded page should not re-announce a save.
   */
  private readSaveResult(): void {
    const state = history.state as
      | { savedId?: string; savedName?: string; created?: boolean }
      | null;

    if (!state?.savedId || !state.savedName) return;

    this.markSaved(state.savedId);
    this.showToast(`${state.created ? 'Added' : 'Saved'} — ${state.savedName}`);
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
        type: this.typeFilterControl.value || undefined,
        category: this.categoryFilterControl.value || undefined,
        lowStockOnly: this.lowStockFilterControl.value || undefined,
      })
      // Cleared in the handlers rather than with finalize(): the empty-page case
      // starts a second request from inside next(), and finalize would switch
      // loading off while that one was still in flight.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          // A delete can empty the last page; step back rather than showing a
          // blank table with a pager that says there is more.
          if (!page.items.length && page.pageNumber > 1) {
            this.page.set(page.pageNumber - 1);
            this.load();
            return;
          }

          this.result.set(page);
          this.loading.set(false);
          this.revealSaved();
        },
        error: (err: unknown) => {
          this.listError.set(getApiErrorMessage(err, 'Unable to load the inventory.'));
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

  // ===== Confirmation =====

  private showToast(text: string, tone: 'ok' | 'bad' = 'ok'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, tone });
    // Long enough to read, short enough not to sit over the table.
    this.toastTimer = setTimeout(() => this.toast.set(null), 4500);
  }

  protected dismissToast(): void {
    clearTimeout(this.toastTimer);
    this.toast.set(null);
  }

  private markSaved(id: string): void {
    clearTimeout(this.highlightTimer);
    this.justSavedId.set(id);
    this.highlightTimer = setTimeout(() => this.justSavedId.set(null), 6000);
  }

  /** Brings the highlighted row into view once the list has rendered with it. */
  private revealSaved(): void {
    if (!this.justSavedId()) return;
    setTimeout(() => {
      document
        .querySelector('.camera-table tbody tr.is-saved')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }

  // ===== Filters =====

  protected clearFilters(): void {
    this.searchControl.setValue('');
    this.typeFilterControl.setValue('');
    this.categoryFilterControl.setValue('');
    this.lowStockFilterControl.setValue(false);
  }

  protected goToPage(page: number): void {
    const total = this.result()?.totalPages ?? 1;
    if (page < 1 || page > total || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  // ===== Delete =====

  protected askDelete(camera: Camera): void {
    this.pendingDeleteId.set(camera.id);
  }

  protected cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  protected confirmDelete(camera: Camera): void {
    this.deletingId.set(camera.id);
    this.listError.set('');

    this.service
      .delete(camera.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.deletingId.set(null);
          this.pendingDeleteId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.showToast(`Deleted — ${camera.itemName}`, 'bad');
          this.load();
          this.loadSummary();
        },
        error: (err: unknown) =>
          this.listError.set(getApiErrorMessage(err, 'Unable to delete the item.')),
      });
  }
}
