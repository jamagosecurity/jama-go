import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { PERMISSIONS } from '../../../models/auth.model';
import {
  CAMERA_BRANDS,
  Camera,
  CameraBrand,
  CameraImage,
  CameraType,
  CAMERA_RESOLUTIONS,
  CameraResolution,
  ITEM_TYPES,
  ItemType,
  PRODUCT_CATEGORIES,
  ProductCategory,
  SUGGESTED_BITRATE_MBPS,
  SaveCameraRequest,
  TAX_OPTIONS,
  UNITS_OF_MEASUREMENT,
  UnitOfMeasurement,
  WARRANTY_UNITS,
  WarrantyUnit,
  matchCameraBrand,
} from '../../../models/camera.model';
import { AuthService } from '../../../services/auth.service';
import { CameraService } from '../../../services/camera.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { fieldErrorMessage, shouldShowError } from '../../../utils/form-validators.util';
import { CAMERAS_BASE_PATH } from './cameras-base-path';

/** Matches CameraFieldRules on the API, so the two reject the same values. */
const ITEM_NAME_MAX_LENGTH = 200;
const BRAND_MAX_LENGTH = 120;
const MODEL_NO_MAX_LENGTH = 120;
const TYPE_MAX_LENGTH = 60;
const SEARCH_KEY_MAX_LENGTH = 300;
const DESCRIPTION_MAX_LENGTH = 500;
const NOTES_MAX_LENGTH = 1000;
const HSN_CODE_MAX_LENGTH = 20;
const QUANTITY_MAX = 100000;
const MONEY_MAX = 9999999.99;

/**
 * Add or edit one stock item, on its own page.
 *
 * Split out of the list: twenty-one fields and an image gallery sat on top of
 * the table and pushed it below the fold, and the staff and VIP screens in this
 * admin already work this way — list at /admin/cameras, form at /new and
 * /:id/edit. Saving returns to the list, which highlights the row it wrote.
 */
@Component({
  selector: 'app-camera-editor',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './camera-editor.component.html',
  styleUrl: './camera-list.component.css',
})
export class CameraEditorComponent implements OnInit {
  private readonly service = inject(CameraService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  /**
   * Whether this account may see and set what stock costs.
   *
   * Its own grant: managing the catalogue and knowing the buying price are
   * different jobs. Without it the API sends the figures blank and refuses to
   * write them, so the two fields are not drawn at all.
   */
  protected readonly canSeeCost = computed(() => this.auth.can(PERMISSIONS.cameraCost));

  /** Portal this screen is mounted under — see CAMERAS_BASE_PATH. */
  protected readonly base = inject(CAMERAS_BASE_PATH);

  protected readonly typeMaxLength = TYPE_MAX_LENGTH;
  protected readonly categories = PRODUCT_CATEGORIES;
  protected readonly units = UNITS_OF_MEASUREMENT;
  protected readonly itemTypes = ITEM_TYPES;
  protected readonly resolutions = CAMERA_RESOLUTIONS;
  protected readonly warrantyUnits = WARRANTY_UNITS;
  protected readonly taxOptions = TAX_OPTIONS;
  protected readonly brands = CAMERA_BRANDS;

  protected readonly itemNameMaxLength = ITEM_NAME_MAX_LENGTH;
  protected readonly brandMaxLength = BRAND_MAX_LENGTH;
  protected readonly modelNoMaxLength = MODEL_NO_MAX_LENGTH;
  protected readonly searchKeyMaxLength = SEARCH_KEY_MAX_LENGTH;
  protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;
  protected readonly notesMaxLength = NOTES_MAX_LENGTH;
  protected readonly hsnCodeMaxLength = HSN_CODE_MAX_LENGTH;

  protected readonly editing = signal<Camera | null>(null);
  protected readonly isEditing = computed(() => this.editing() !== null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly images = signal<CameraImage[]>([]);
  /** Files chosen before the item exists — uploaded straight after it is created. */
  protected readonly pendingFiles = signal<File[]>([]);
  protected readonly uploading = signal(false);
  protected readonly imageError = signal('');

  /** Tracks the brand box so the matching logo shows in the field. */
  protected readonly brandValue = signal('');
  protected readonly selectedBrand = computed(() => matchCameraBrand(this.brandValue()));
  protected readonly brandOpen = signal(false);
  protected readonly brandActiveIndex = signal(-1);

  /**
   * What the user has typed to narrow the menu, which is NOT the same as the
   * field's value.
   *
   * Filtering on the value meant that opening the menu while editing an item
   * whose brand was already "Hikvision" offered exactly one option — the brand
   * it already had — so the dropdown looked broken. Set only on real keystrokes
   * and cleared whenever the menu is opened or a brand is picked, so opening it
   * always shows everything and typing is what narrows.
   */
  protected readonly brandFilter = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    itemName: ['', [Validators.required, Validators.maxLength(ITEM_NAME_MAX_LENGTH)]],
    modelNo: ['', [Validators.maxLength(MODEL_NO_MAX_LENGTH)]],
    brand: ['', [Validators.required, Validators.maxLength(BRAND_MAX_LENGTH)]],
    type: ['', [Validators.required, Validators.maxLength(TYPE_MAX_LENGTH)]],
    category: this.formBuilder.nonNullable.control<ProductCategory>('Cctv', Validators.required),
    searchKey: ['', [Validators.maxLength(SEARCH_KEY_MAX_LENGTH)]],
    descriptionEn: ['', [Validators.maxLength(DESCRIPTION_MAX_LENGTH)]],
    descriptionAr: ['', [Validators.maxLength(DESCRIPTION_MAX_LENGTH)]],

    // Nullable so an empty box means "not recorded" rather than zero — a
    // supplier cost of 0 is a claim, a blank one is silence.
    supplierCost: this.formBuilder.control<number | null>(null, [Validators.min(0), Validators.max(MONEY_MAX)]),
    margin: this.formBuilder.control<number | null>(null, [Validators.min(0), Validators.max(10000)]),
    rate: this.formBuilder.control<number | null>(null, [Validators.min(0), Validators.max(MONEY_MAX)]),
    discount: this.formBuilder.control<number | null>(null, [Validators.min(0), Validators.max(100)]),
    quantity: [0, [Validators.required, Validators.min(0), Validators.max(QUANTITY_MAX)]],
    lowStock: this.formBuilder.control<number | null>(null, [Validators.min(0), Validators.max(QUANTITY_MAX)]),
    hsnCode: ['', [Validators.maxLength(HSN_CODE_MAX_LENGTH)]],
    uom: this.formBuilder.nonNullable.control<UnitOfMeasurement>('Piece', Validators.required),
    taxRate: this.formBuilder.control<number | null>(null),
    itemType: this.formBuilder.nonNullable.control<ItemType>('Product', Validators.required),
    resolution: this.formBuilder.nonNullable.control<CameraResolution>('Unspecified'),
    bitrateMbps: this.formBuilder.control<number | null>(null, [Validators.min(0.001), Validators.max(100)]),

    warrantyValue: this.formBuilder.control<number | null>(null, [Validators.min(1), Validators.max(999)]),
    warrantyUnit: this.formBuilder.control<WarrantyUnit | null>(null),
    notes: ['', [Validators.maxLength(NOTES_MAX_LENGTH)]],
  });

  ngOnInit(): void {
    this.form.controls.brand.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.brandValue.set(value ?? ''));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadItem(id);
  }

  private loadItem(id: string): void {
    this.loading.set(true);
    this.service
      .getById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (camera) => {
          this.editing.set(camera);
          this.images.set(camera.images);
          this.form.reset({
            itemName: camera.itemName,
            modelNo: camera.modelNo,
            brand: camera.brand,
            type: camera.type,
            category: camera.category,
            searchKey: camera.searchKey ?? '',
            descriptionEn: camera.descriptionEn ?? '',
            descriptionAr: camera.descriptionAr ?? '',
            supplierCost: camera.supplierCost,
            margin: camera.margin,
            rate: camera.rate,
            discount: camera.discount,
            quantity: camera.quantity,
            lowStock: camera.lowStock,
            hsnCode: camera.hsnCode ?? '',
            uom: camera.uom,
            taxRate: camera.taxRate,
            itemType: camera.itemType,
            resolution: camera.resolution,
            bitrateMbps: camera.bitrateMbps,
            warrantyValue: camera.warrantyValue,
            warrantyUnit: camera.warrantyUnit,
            notes: camera.notes ?? '',
          });
        },
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to load the item.')),
      });
  }

  // ===== Brand combobox =====

  protected readonly brandOptions = computed(() => {
    const typed = this.brandFilter().trim().toLowerCase();
    if (!typed) return CAMERA_BRANDS;
    return CAMERA_BRANDS.filter(
      (brand) =>
        brand.name.toLowerCase().includes(typed) ||
        brand.aliases.some((alias) => alias.includes(typed)),
    );
  });

  protected openBrandMenu(): void {
    this.brandOpen.set(true);
    this.brandActiveIndex.set(-1);
    // Opening always offers the full list; typing is what narrows it.
    this.brandFilter.set('');
  }

  protected toggleBrandMenu(): void {
    const opening = !this.brandOpen();
    this.brandOpen.set(opening);
    this.brandActiveIndex.set(-1);
    if (opening) this.brandFilter.set('');
  }

  /** Real keystrokes in the field, as opposed to the value being set for us. */
  protected onBrandInput(event: Event): void {
    this.brandFilter.set((event.target as HTMLInputElement).value);
    this.brandOpen.set(true);
    this.brandActiveIndex.set(-1);
  }

  protected closeBrandMenu(): void {
    this.brandOpen.set(false);
    this.brandActiveIndex.set(-1);
    this.brandFilter.set('');
  }

  protected pickBrand(brand: CameraBrand): void {
    this.form.controls.brand.setValue(brand.name);
    this.form.controls.brand.markAsDirty();
    this.closeBrandMenu();
  }

  protected onBrandKeydown(event: KeyboardEvent): void {
    const options = this.brandOptions();

    if (event.key === 'Escape') {
      this.closeBrandMenu();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.brandOpen()) {
        this.openBrandMenu();
        return;
      }
      if (!options.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.brandActiveIndex.set((this.brandActiveIndex() + step + options.length) % options.length);
      return;
    }

    if (event.key === 'Enter' && this.brandOpen() && this.brandActiveIndex() >= 0) {
      event.preventDefault();
      this.pickBrand(options[this.brandActiveIndex()]);
    }
  }

  protected onBrandFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    const wrapper = event.currentTarget as HTMLElement;
    if (!next || !wrapper.contains(next)) this.closeBrandMenu();
  }

  // ===== Pricing helpers =====

  /**
   * Rate = supplier cost + margin, applied only when the margin is edited. A
   * rate is often a round number agreed with the customer, and back-computing it
   * from a percentage would overwrite 285 with 284.175 on any keystroke.
   */
  protected applyMargin(): void {
    const cost = this.form.controls.supplierCost.value;
    const margin = this.form.controls.margin.value;
    if (cost === null || margin === null) return;
    this.form.controls.rate.setValue(Math.round(cost * (1 + margin / 100) * 100) / 100);
    this.form.controls.rate.markAsDirty();
  }

  /** The reverse, offered as its own action: what margin does this rate imply? */
  protected applyRate(): void {
    const cost = this.form.controls.supplierCost.value;
    const rate = this.form.controls.rate.value;
    if (!cost || rate === null) return;
    this.form.controls.margin.setValue(Math.round((rate / cost - 1) * 100 * 100) / 100);
    this.form.controls.margin.markAsDirty();
  }

  /**
   * Typical bitrate for the chosen resolution, or null when none is set.
   *
   * Driven by toSignal, not by reading the control inside computed(): a
   * computed that reads FormControl.value takes no reactive dependency on it,
   * so it would evaluate once and never update again.
   */
  private readonly resolutionValue = toSignal(this.form.controls.resolution.valueChanges, {
    initialValue: this.form.controls.resolution.value,
  });

  protected readonly suggestedBitrate = computed(
    () => SUGGESTED_BITRATE_MBPS[this.resolutionValue()],
  );

  protected useSuggestedBitrate(): void {
    const suggested = this.suggestedBitrate();
    if (suggested === null) return;

    this.form.controls.bitrateMbps.setValue(suggested);
    this.form.controls.bitrateMbps.markAsDirty();
  }

  /** Rate less discount, the figure a customer actually pays before tax. */
  protected readonly netRate = computed(() => {
    const raw = this.form.getRawValue();
    if (raw.rate === null) return null;
    return Math.round(raw.rate * (1 - (raw.discount ?? 0) / 100) * 100) / 100;
  });

  // ===== Save =====

  protected save(event: Event): void {
    event.preventDefault();

    if (this.form.invalid) {
      // Every field is on screen, so marking the form touched shows each problem
      // where it is.
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const request: SaveCameraRequest = {
      itemName: raw.itemName.trim(),
      brand: raw.brand.trim(),
      type: raw.type,
      modelNo: raw.modelNo.trim(),
      category: raw.category,
      // Blank means "none"; the API stores null rather than an empty string.
      searchKey: raw.searchKey.trim() || null,
      descriptionEn: raw.descriptionEn.trim() || null,
      descriptionAr: raw.descriptionAr.trim() || null,
      supplierCost: raw.supplierCost,
      margin: raw.margin,
      rate: raw.rate,
      discount: raw.discount,
      quantity: Number(raw.quantity),
      lowStock: raw.lowStock,
      hsnCode: raw.hsnCode.trim() || null,
      uom: raw.uom,
      taxRate: raw.taxRate,
      itemType: raw.itemType,
      resolution: raw.resolution,
      bitrateMbps: raw.bitrateMbps,
      warrantyValue: raw.warrantyValue,
      warrantyUnit: raw.warrantyUnit,
      notes: raw.notes.trim() || null,
    };

    const target = this.editing();
    const save$ = target ? this.service.update(target.id, request) : this.service.create(request);

    this.saving.set(true);
    this.formError.set('');

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        const queued = this.pendingFiles();
        if (queued.length) {
          this.uploadPending(saved, queued, !target);
          return;
        }
        this.saving.set(false);
        this.returnToList(saved, !target);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.formError.set(
          getApiErrorMessage(err, target ? 'Unable to save the item.' : 'Unable to add the item.'),
        );
      },
    });
  }

  /** Images picked before the item existed, sent once it has an id. */
  private uploadPending(saved: Camera, files: File[], created: boolean): void {
    forkJoin(files.map((file) => this.service.uploadImage(saved.id, file)))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => this.returnToList(saved, created),
        error: (err: unknown) => {
          // The item itself saved; only the pictures failed. Stay on the page so
          // the user can retry them rather than implying the whole thing was lost.
          this.pendingFiles.set([]);
          this.editing.set(saved);
          this.images.set(saved.images);
          this.formError.set(
            getApiErrorMessage(err, 'The item was saved, but its images could not be uploaded.'),
          );
        },
      });
  }

  /** Hands the list what it needs to confirm and highlight the row just written.
   *  Returns to whichever portal this screen was mounted under: hardcoding
   *  /admin/cameras here sent a staff member into adminGuard on every save. */
  private returnToList(saved: Camera, created: boolean): void {
    void this.router.navigate([this.base], {
      state: { savedId: saved.id, savedName: saved.itemName, created },
    });
  }

  // ===== Images =====

  protected onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const chosen = Array.from(input.files ?? []);
    // Cleared so picking the same file twice in a row still fires a change event.
    input.value = '';
    if (!chosen.length) return;

    this.imageError.set('');

    const target = this.editing();
    if (!target) {
      // No id yet — hold them until the item is created.
      this.pendingFiles.update((files) => [...files, ...chosen]);
      return;
    }

    this.uploading.set(true);
    forkJoin(chosen.map((file) => this.service.uploadImage(target.id, file)))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.uploading.set(false)),
      )
      .subscribe({
        next: (uploaded) => this.images.update((current) => [...current, ...uploaded]),
        error: (err: unknown) =>
          this.imageError.set(getApiErrorMessage(err, 'Unable to upload the image.')),
      });
  }

  protected removePendingFile(index: number): void {
    this.pendingFiles.update((files) => files.filter((_, i) => i !== index));
  }

  protected removeImage(image: CameraImage): void {
    this.imageError.set('');
    this.service
      .deleteImage(image.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.images.update((current) => current.filter((x) => x.id !== image.id)),
        error: (err: unknown) =>
          this.imageError.set(getApiErrorMessage(err, 'Unable to remove the image.')),
      });
  }

  /** Object URL so a not-yet-uploaded file can still be previewed. */
  protected previewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  // ===== Validation display =====

  protected showError(field: string): boolean {
    return shouldShowError(this.form.get(field));
  }

  protected errorFor(field: string, label: string): string {
    return fieldErrorMessage(this.form.get(field), label);
  }
}
