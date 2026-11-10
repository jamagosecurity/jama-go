import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, OnInit, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AppSelectComponent } from '../../../../components/app-select/app-select.component';
import {
  MaintenanceCategory,
  MaintenanceImage,
  MaintenanceIssueOption,
  maintenanceCategoryOptions,
} from '../../../../models/maintenance.model';
import { MaintenanceService } from '../../../../services/maintenance.service';
import { getApiErrorMessage } from '../../../../utils/api-error.util';
import { NON_MOI_BASE_PATH } from './non-moi-base-path';

const NAME_MAX = 200;
const DESCRIPTION_MAX = 500;
const PRICE_MAX = 999_999.99;
const CATEGORY_MAX = 60;

type Field = 'name' | 'category' | 'price' | 'descriptionEn' | 'descriptionAr';

/** Adds or edits one service on the Non-MOI price list — the stock inventory's
 *  item page, for a maintenance service instead of a product. */
@Component({
  selector: 'app-non-moi-editor',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AppSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './non-moi-editor.component.html',
  styleUrl: './non-moi-editor.component.css',
})
export class NonMoiEditorComponent implements OnInit {
  private readonly service = inject(MaintenanceService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  protected readonly base = inject(NON_MOI_BASE_PATH);

  /** Categories on the price list now, so a custom one added earlier can be
   *  picked again; the built-ins are always there. */
  private readonly listedCategories = signal<MaintenanceCategory[]>([]);
  protected readonly categories = computed(() => maintenanceCategoryOptions(this.listedCategories()));
  protected readonly categoryMax = CATEGORY_MAX;

  /** Creating a category replaces the dropdown with this box until cancelled. */
  protected readonly creatingCategory = signal(false);
  protected readonly newCategory = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(CATEGORY_MAX)],
  });
  private readonly newCategoryText = toSignal(this.newCategory.valueChanges, { initialValue: '' });
  private readonly newCategoryInput = viewChild<ElementRef<HTMLInputElement>>('newCategoryInput');
  /** The pick to go back to if creating is cancelled. */
  private categoryBeforeCreating: MaintenanceCategory = 'PowerService';

  protected readonly images = signal<MaintenanceImage[]>([]);
  /** Pictures chosen before the service exists; sent once it has an id. */
  protected readonly pendingFiles = signal<{ file: File; url: string }[]>([]);
  protected readonly uploading = signal(false);
  protected readonly imageError = signal('');
  protected readonly nameMax = NAME_MAX;
  protected readonly descriptionMax = DESCRIPTION_MAX;

  private readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly isEditing = signal(!!this.id);
  protected readonly loading = signal(!!this.id);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(NAME_MAX)]],
    category: this.formBuilder.nonNullable.control<MaintenanceCategory>('PowerService', Validators.required),
    price: this.formBuilder.control<number | null>(250, [
      Validators.required,
      Validators.min(0),
      Validators.max(PRICE_MAX),
    ]),
    descriptionEn: ['', Validators.maxLength(DESCRIPTION_MAX)],
    descriptionAr: ['', Validators.maxLength(DESCRIPTION_MAX)],
  });

  ngOnInit(): void {
    // A message about the form goes as soon as the form is put right, rather
    // than sitting under a now-valid form until the next save.
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.form.valid) this.formError.set('');
    });

    this.destroyRef.onDestroy(() => this.pendingFiles().forEach((p) => URL.revokeObjectURL(p.url)));

    // Set by the new-service flow when the service saved but its pictures did not.
    const notice = (history.state as { notice?: string } | null)?.notice;
    if (notice) this.formError.set(notice);

    // The list is small and already what every screen reads, so the one
    // service is picked out of it rather than fetched on its own.
    this.service
      .issueCatalogue()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.listedCategories.set(items.map((i) => i.category));
          if (!this.id) return;
          const item = items.find((i) => i.id === this.id);
          if (!item) {
            this.formError.set('This service no longer exists — it may have been deleted.');
            return;
          }
          this.form.setValue({
            name: item.issueType,
            category: item.category,
            price: item.defaultFee,
            descriptionEn: item.descriptionEn ?? '',
            descriptionAr: item.descriptionAr ?? '',
          });
          this.images.set(item.images);
        },
        error: (err: unknown) => this.formError.set(getApiErrorMessage(err, 'Could not load this service.')),
      });
  }

  protected showError(field: Field): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  protected errorFor(field: Field, label: string): string {
    const errors = this.form.controls[field].errors ?? {};
    if (errors['required']) return `${label} is required.`;
    if (errors['maxlength']) return `${label} must be ${errors['maxlength'].requiredLength} characters or fewer.`;
    if (errors['min']) return `${label} cannot be negative.`;
    if (errors['max']) return `${label} is too large.`;
    return `Check the ${label.toLowerCase()}.`;
  }

  protected save(event: Event): void {
    event.preventDefault();
    if (this.saving()) return;

    this.form.markAllAsTouched();
    this.newCategory.markAsTouched();
    if (this.form.invalid || (this.creatingCategory() && this.newCategory.invalid)) {
      this.formError.set('Fix the highlighted fields first.');
      return;
    }

    const value = this.form.getRawValue();
    const category = this.creatingCategory() ? this.newCategory.value.trim() : value.category;
    const payload = {
      category,
      name: value.name.trim(),
      price: Number(value.price),
      descriptionEn: value.descriptionEn.trim() || null,
      descriptionAr: value.descriptionAr.trim() || null,
    };

    this.saving.set(true);
    this.formError.set('');
    const request = this.id
      ? this.service.updateCatalogueItem(this.id, payload)
      : this.service.addCatalogueItem(payload);

    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        const queued = this.pendingFiles();
        if (queued.length) {
          this.uploadPending(saved, queued.map((p) => p.file));
          return;
        }
        this.returnToList(saved, !this.id);
      },
      error: (err: unknown) => this.formError.set(getApiErrorMessage(err, 'Could not save this service.')),
    });
  }

  /** Pictures picked before the service existed, sent now it has an id. */
  private uploadPending(saved: MaintenanceIssueOption, files: File[]): void {
    this.saving.set(true);
    forkJoin(files.map((file) => this.service.uploadCatalogueImage(saved.id, file)))
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.returnToList(saved, true),
        error: (err: unknown) => {
          // The service itself saved; only the pictures failed. Open it for
          // editing so they can be retried, rather than implying all was lost.
          void this.router.navigate([this.base, saved.id, 'edit'], {
            state: {
              notice: getApiErrorMessage(err, 'The service was saved, but its pictures could not be uploaded.'),
            },
          });
        },
      });
  }

  // ===== Category: pick one, or create =====

  protected startCreatingCategory(): void {
    this.categoryBeforeCreating = this.form.controls.category.value;
    this.newCategory.reset('');
    this.creatingCategory.set(true);
    // The input only exists once the view re-renders; focus it then.
    afterNextRender(() => this.newCategoryInput()?.nativeElement.focus(), { injector: this.injector });
  }

  protected cancelCreatingCategory(): void {
    this.creatingCategory.set(false);
    this.form.controls.category.setValue(this.categoryBeforeCreating);
  }

  /** What typing a category name will do, so nobody makes a near-duplicate
   *  section by accident. */
  protected readonly newCategoryHint = computed(() => {
    const typed = this.newCategoryText().trim().toLowerCase();
    if (!typed) return '';
    const match = this.categories().find(
      (c) => c.value.toLowerCase() === typed || c.label.toLowerCase() === typed,
    );
    return match
      ? `“${match.label}” already exists — this service will be added to it.`
      : 'New category — it gets its own section in the checklist.';
  });

  // ===== Images =====

  protected onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const chosen = Array.from(input.files ?? []);
    // Cleared so picking the same file twice in a row still fires a change event.
    input.value = '';
    if (!chosen.length) return;

    this.imageError.set('');

    if (!this.id) {
      // No id yet — hold them until the service is created.
      this.pendingFiles.update((files) => [
        ...files,
        ...chosen.map((file) => ({ file, url: URL.createObjectURL(file) })),
      ]);
      return;
    }

    this.uploading.set(true);
    forkJoin(chosen.map((file) => this.service.uploadCatalogueImage(this.id!, file)))
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.uploading.set(false)))
      .subscribe({
        next: (uploaded) => this.images.update((current) => [...current, ...uploaded]),
        error: (err: unknown) => this.imageError.set(getApiErrorMessage(err, 'Unable to upload the image.')),
      });
  }

  protected removePendingFile(index: number): void {
    const gone = this.pendingFiles()[index];
    if (gone) URL.revokeObjectURL(gone.url);
    this.pendingFiles.update((files) => files.filter((_, i) => i !== index));
  }

  protected removeImage(image: MaintenanceImage): void {
    this.imageError.set('');
    this.service
      .deleteCatalogueImage(image.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.images.update((current) => current.filter((x) => x.id !== image.id)),
        error: (err: unknown) => this.imageError.set(getApiErrorMessage(err, 'Unable to remove the image.')),
      });
  }

  /** Back to the list, which confirms and highlights the row just written. */
  private returnToList(saved: MaintenanceIssueOption, created: boolean): void {
    void this.router.navigate([this.base], {
      state: { savedId: saved.id, savedName: saved.issueType, created },
    });
  }
}
