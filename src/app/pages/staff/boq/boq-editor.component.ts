import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { BOQ_SECTION_TITLES, BOQ_STATUSES, Boq, BoqStatus, SaveBoqRequest } from '../../../models/boq.model';
import {
  CAMERA_TYPES,
  Camera,
  CameraBrandCount,
  CameraType,
  PRODUCT_CATEGORIES,
  ProductCategory,
  cameraTypeLabel,
  matchCameraBrand,
} from '../../../models/camera.model';
import { BoqService } from '../../../services/boq.service';
import { CameraService } from '../../../services/camera.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { downloadBlob } from '../../../utils/download.util';
import { fieldErrorMessage, shouldShowError } from '../../../utils/form-validators.util';

/** A line while it is being built. The rate is shown but never sent. */
interface DraftLine {
  key: string;
  cameraId: string;
  itemName: string;
  modelNo: string | null;
  brand: string | null;
  uom: string;
  quantity: number;
  /** Catalogue price, for the running total only — the server sets the real one. */
  unitRate: number;
  /**
   * Thumbnail and blurb, so the table on screen shows the same nine columns the
   * client's PDF does. Neither is sent on save and neither is copied onto the
   * line server-side: both are how the stock item looks today, unlike the price,
   * which is fixed at the moment of quoting.
   */
  imageUrl: string | null;
  description: string | null;
  /** Kept apart from the English rather than concatenated: it has to be rendered
   *  right-to-left, and joining them would make that impossible. */
  descriptionAr: string | null;
}

/**
 * One expandable group in the picker, and the catalogue it draws from.
 *
 * The groups ARE the quotation's sections: opening "NVR Storage" and clicking an
 * item puts that item in the NVR Storage section, creating it if the quotation
 * does not have one yet. That is the whole point — staff browse by section and
 * select, rather than filtering a flat list and then remembering where it goes.
 *
 * Membership is derived from the stock item's product category. Deriving it
 * means an item can never be filed in two places, and adding stock needs no
 * second decision — but it does mean the mapping below has to stay exhaustive,
 * which is what `Other stock` at the end is for.
 */
interface PickerGroup {
  /** A section title, or the catch-all label. */
  title: string;
  categories: ProductCategory[];
  /** Cctv splits in two: number-plate cameras belong under KPOI, not the main
   *  system, so one group takes only ANPR and the other takes everything else. */
  anprOnly?: boolean;
  excludeAnpr?: boolean;
  /** The catch-all cannot guess a section, so its rows carry a chooser. */
  unsorted?: boolean;
}

interface DraftSection {
  key: string;
  title: string;
  lines: DraftLine[];
}

/**
 * Builds a bill of quantities from the stock catalogue.
 *
 * Staff choose items and quantities. Rates are shown so the total means
 * something, but they are read-only here and are not part of what gets sent —
 * the server prices every line from the catalogue. See BoqWriter on the API.
 */
@Component({
  selector: 'app-boq-editor',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boq-editor.component.html',
  styleUrl: './boq.css',
})
export class BoqEditorComponent implements OnInit {
  private readonly service = inject(BoqService);
  private readonly cameras = inject(CameraService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = BOQ_STATUSES;
  protected readonly sectionTitles = BOQ_SECTION_TITLES;

  /** In the order the document prints them, so browsing follows the quotation. */
  protected readonly pickerGroups: readonly PickerGroup[] = [
    { title: 'Main CCTV System', categories: ['Cctv'], excludeAnpr: true },
    { title: 'Camera Accessories', categories: ['Accessory'] },
    { title: 'NVR & Storage', categories: ['Storage'] },
    { title: 'Monitors and Work Stations', categories: ['Monitor'] },
    { title: 'Switch & Components', categories: ['Network'] },
    { title: 'Rack & UPS', categories: ['PowerSupply'] },
    { title: 'Key Point of Interest Camera (KPOI)', categories: ['Cctv'], anprOnly: true },
    { title: 'Passive Components & Cables', categories: ['Cable'] },
    // Alarm panels are part of the access & security system on a real job.
    { title: 'Access Control System', categories: ['AccessControl', 'Alarm'] },
    // Nothing may be unreachable: stock filed under "Other" would otherwise be
    // impossible to quote, which is the same trap the staff permission list fell
    // into. These rows carry a section chooser instead of guessing.
    { title: 'Other stock', categories: ['Other'], unsorted: true },
  ];

  /**
   * The whole catalogue, read once and partitioned per section here.
   *
   * Nine sections each fetching their own slice was nine requests for a list
   * that fits in one, and the brand/model dropdowns have to be populated before
   * a staff member opens them, not after.
   */
  protected readonly allStock = signal<Camera[]>([]);
  protected readonly stockLoading = signal(true);

  /**
   * Where each section's cascade has got to: brand chosen, then model.
   * Keyed by section title, so nine cascades run independently.
   */
  protected readonly choice = signal<Record<string, { brand: string; model: string }>>({});

  /** The section chosen for an unfiled item, which has no heading of its own. */
  protected readonly unsortedSection = signal('');

  /** Quantity typed into a section's entry row before the line is added. */
  protected readonly newQty = signal<Record<string, number>>({});

  protected qtyFor(title: string): number {
    return this.newQty()[title] ?? 1;
  }

  protected setNewQty(title: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.newQty.update((current) => ({
      ...current,
      [title]: Number.isFinite(value) && value > 0 ? value : 1,
    }));
  }

  /** The single item the entry row's brand and model resolve to, if exactly one
   *  does. Null while the row is still being filled in, or while two body types
   *  share a model number and the description has yet to decide. */
  protected resolved(title: string): Camera | null {
    const matches = this.matchesIn(title);
    return matches.length === 1 ? matches[0] : null;
  }
  protected readonly brandLogo = matchCameraBrand;

  protected readonly boq = signal<Boq | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly downloading = signal(false);
  protected readonly formError = signal('');

  protected readonly sections = signal<DraftSection[]>(
    BOQ_SECTION_TITLES.map((title, index) => ({
      key: `section-${index}`,
      title,
      lines: [],
    })),
  );

  /** Which section a picked item is added to. */
  protected readonly activeSection = signal(0);

  /**
   * The picker is filtered down rather than scrolled: the catalogue will not
   * stay short, and a staff member looking for one dome should not have to read
   * past every bullet to find it.
   */
  protected readonly pickerControl = new FormControl('', { nonNullable: true });
  protected readonly categoryControl = new FormControl<ProductCategory | ''>('', { nonNullable: true });
  protected readonly brandControl = new FormControl('', { nonNullable: true });
  protected readonly typeControl = new FormControl<CameraType | ''>('', { nonNullable: true });

  protected readonly categories = PRODUCT_CATEGORIES;
  protected readonly cameraTypes = CAMERA_TYPES;
  protected readonly typeLabel = cameraTypeLabel;
  /** Read from the catalogue, since brand is free text. */
  protected readonly brandOptions = signal<CameraBrandCount[]>([]);

  protected readonly pickerResults = signal<Camera[]>([]);
  protected readonly pickerBusy = signal(false);
  protected readonly pickerTotal = signal(0);

  /**
   * Mirrored into signals because a computed() that reads FormControl.value
   * takes no dependency on it — the control is not a signal, so the computed
   * evaluates once and caches forever, and the Clear button never appears.
   */
  private readonly pickerValue = toSignal(this.pickerControl.valueChanges, { initialValue: '' });
  private readonly categoryValue = toSignal(this.categoryControl.valueChanges, { initialValue: '' as ProductCategory | '' });
  private readonly brandValue = toSignal(this.brandControl.valueChanges, { initialValue: '' });
  private readonly typeValue = toSignal(this.typeControl.valueChanges, { initialValue: '' as CameraType | '' });

  protected readonly hasPickerFilters = computed(
    () =>
      !!this.pickerValue().trim() ||
      !!this.categoryValue() ||
      !!this.brandValue() ||
      !!this.typeValue(),
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    projectName: ['', [Validators.required, Validators.maxLength(200)]],
    siteLocation: ['', [Validators.maxLength(200)]],
    clientName: ['', [Validators.maxLength(200)]],
    contactNumber: ['', [Validators.maxLength(40)]],
    issueDate: [new Date().toISOString().slice(0, 10), Validators.required],
    status: this.formBuilder.nonNullable.control<BoqStatus>('Draft', Validators.required),
    notes: ['', [Validators.maxLength(2000)]],
  });

  protected readonly isEditing = computed(() => this.boq() !== null);

  /** Mirrors the server's arithmetic so the figure moves as quantities change.
   *  The server recomputes on save and its answer is what gets stored. */
  protected readonly total = computed(() =>
    this.sections().reduce(
      (sum, section) => sum + section.lines.reduce((s, l) => s + this.lineTotal(l), 0),
      0,
    ),
  );

  /**
   * How a unit is written on screen. The enum member stays "Piece" — it is the
   * stored value — so only the printed form changes, and it matches the PDF.
   */
  protected unit(uom: string): string {
    return uom.toLowerCase() === 'piece' ? 'pcs' : uom;
  }

  protected lineTotal(line: DraftLine): number {
    return Math.round(line.quantity * line.unitRate * 100) / 100;
  }

  protected sectionTotal(section: DraftSection): number {
    return section.lines.reduce((sum, line) => sum + this.lineTotal(line), 0);
  }

  ngOnInit(): void {
    this.loadCatalogue();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') this.loadBoq(id);

    this.pickerControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.searchCatalogue());

    // The dropdowns need no debounce — one change is one deliberate choice.
    this.categoryControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.searchCatalogue());

    this.brandControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.searchCatalogue());

    this.typeControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.searchCatalogue());

    this.cameras
      .brands()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (brands) => this.brandOptions.set(brands), error: () => {} });

    // Seeded so the picker opens with stock listed rather than an empty box.
    this.searchCatalogue();
  }

  private loadBoq(id: string): void {
    this.loading.set(true);
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (boq) => {
          this.boq.set(boq);
          this.form.reset({
            projectName: boq.projectName,
            siteLocation: boq.siteLocation ?? '',
            clientName: boq.clientName ?? '',
            contactNumber: boq.contactNumber ?? '',
            issueDate: boq.issueDate,
            status: boq.status,
            notes: boq.notes ?? '',
          });
          // Merged into the nine, not swapped for them: a saved quotation
          // holds only the sections it uses, and the editor shows all of them.
          const saved = new Map(boq.sections.map((section) => [section.title, section]));

          this.sections.set(
            BOQ_SECTION_TITLES.map((title, index) => {
              const section = saved.get(title);

              return {
                key: `section-${index}`,
                title,
                lines: (section?.lines ?? []).map((line, lineIndex) => ({
                  key: `saved-line-${line.id}-${lineIndex}`,
                  cameraId: line.cameraId ?? '',
                  itemName: line.itemName,
                  modelNo: line.modelNo,
                  brand: line.brand,
                  uom: line.uom,
                  quantity: line.quantity,
                  unitRate: line.unitRate,
                  // Filled in once the catalogue arrives — see attachCatalogueDetail.
                  imageUrl: null,
                  description: null,
                  descriptionAr: null,
                })),
              };
            }),
          );

          this.attachCatalogueDetail();
        },
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to load the quotation.')),
      });
  }

  /**
   * Fills in the thumbnail and blurb for lines restored from a saved quotation.
   *
   * A saved line carries only what was copied at quoting time — name, model,
   * brand, rate — so the picture and description have to come back from the
   * catalogue. Read separately from the picker's list, which is filtered and
   * paged and so cannot be relied on to contain this quotation's items.
   *
   * Best-effort: if it fails, the table simply shows a dash where the picture
   * would be, exactly as it does for an item that has no photo.
   */
  private attachCatalogueDetail(): void {
    this.cameras
      .list({ pageSize: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const catalogue = new Map(page.items.map((item) => [item.id, item]));

          this.sections.update((current) =>
            current.map((section) => ({
              ...section,
              lines: section.lines.map((line) => {
                const item = catalogue.get(line.cameraId);
                if (!item) return line;

                return {
                  ...line,
                  imageUrl: item.images[0]?.url ?? null,
                  description: item.descriptionEn,
                  descriptionAr: item.descriptionAr,
                };
              }),
            })),
          );
        },
      });
  }

  private searchCatalogue(): void {
    this.pickerBusy.set(true);
    this.cameras
      .list({
        pageNumber: 1,
        // Enough that a narrowed list is complete; the count below says when
        // there is more behind it.
        pageSize: 24,
        search: this.pickerControl.value.trim() || undefined,
        category: this.categoryControl.value || undefined,
        brand: this.brandControl.value || undefined,
        type: this.typeControl.value || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.pickerBusy.set(false)))
      .subscribe({
        next: (page) => {
          this.pickerResults.set(page.items);
          this.pickerTotal.set(page.totalCount);
        },
        error: () => {
          this.pickerResults.set([]);
          this.pickerTotal.set(0);
        },
      });
  }

  // ===== Picker groups =====

  /**
   * Reads the catalogue in pages until it is exhausted.
   *
   * The API caps a page at 100, so a real inventory needs more than one call;
   * looping here keeps every section's dropdowns complete rather than showing
   * whichever hundred items came back first.
   */
  private loadCatalogue(page = 1, gathered: Camera[] = []): void {
    this.cameras
      .list({ pageNumber: page, pageSize: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          const items = [...gathered, ...result.items];

          if (page < result.totalPages) {
            this.loadCatalogue(page + 1, items);
            return;
          }

          this.allStock.set(items);
          this.stockLoading.set(false);
        },
        error: () => {
          this.allStock.set(gathered);
          this.stockLoading.set(false);
        },
      });
  }

  /** The catalogue rule for a section, so a section block can open its own stock. */
  protected groupFor(title: string): PickerGroup | undefined {
    return this.pickerGroups.find((group) => group.title === title);
  }

  /** Stock that belongs to no section — quotable, but only once told where. */
  protected readonly unsortedGroup = this.pickerGroups.find((group) => group.unsorted)!;

  /** The stock that belongs under a heading, by the group's category rule. */
  protected itemsIn(title: string): Camera[] {
    const group = this.groupFor(title);
    if (!group) return [];

    return this.allStock().filter((item) => {
      if (!group.categories.includes(item.category)) return false;
      if (group.anprOnly) return item.type === 'Anpr';
      if (group.excludeAnpr) return item.type !== 'Anpr';
      return true;
    });
  }

  // ===== Brand → model → description =====

  /** Distinct brands under a heading, so the first dropdown is never empty of
   *  meaning: every brand listed has at least one item behind it. */
  protected brandsIn(title: string): string[] {
    return [...new Set(this.itemsIn(title).map((item) => item.brand))].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  /** Models for the brand already chosen. Empty until one is. */
  /**
   * Stands for "this brand's items that carry no model number".
   *
   * Without it those items had no way through the Model step, so the row tried
   * to resolve them the moment a brand was picked — which committed a line
   * before the staff member had chosen anything, and reset the row out from
   * under them.
   */
  protected readonly noModel = '__no-model__';

  protected modelsIn(title: string): string[] {
    const brand = this.choice()[title]?.brand;
    if (!brand) return [];

    const mine = this.itemsIn(title).filter((item) => item.brand === brand);

    const numbered = [...new Set(mine.filter((item) => item.modelNo).map((item) => item.modelNo))].sort(
      (a, b) => a.localeCompare(b),
    );

    return mine.some((item) => !item.modelNo) ? [...numbered, this.noModel] : numbered;
  }

  protected modelLabel(model: string): string {
    return model === this.noModel ? 'No model number' : model;
  }

  /**
   * The items behind the chosen brand and model.
   *
   * Usually one, but brand and model alone do not identify a stock item — the
   * catalogue's unique key is brand, type and model — so a dome and a bullet
   * sharing a model number both land here, and the description picks between
   * them. Items with no model number appear as soon as their brand is chosen,
   * since there is nothing for the middle step to offer.
   */
  protected matchesIn(title: string): Camera[] {
    const chosen = this.choice()[title];
    if (!chosen?.brand) return [];

    const mine = this.itemsIn(title).filter((item) => item.brand === chosen.brand);

    // A brand holding one item needs no second question.
    if (mine.length === 1) return mine;

    // Otherwise nothing resolves until the model step has been answered — that
    // step is what the staff member is there to make.
    if (!chosen.model) return [];

    return chosen.model === this.noModel
      ? mine.filter((item) => !item.modelNo)
      : mine.filter((item) => item.modelNo === chosen.model);
  }

  protected setBrand(title: string, event: Event): void {
    const brand = (event.target as HTMLSelectElement).value;
    // Model and description belong to the old brand — clearing them stops a
    // stale pair being submitted.
    this.choice.update((current) => ({ ...current, [title]: { brand, model: '' } }));

    // A brand whose items carry no model number is already unambiguous, so
    // there is nothing left to ask.
    this.commitIfResolved(title);
  }

  protected setModel(title: string, event: Event): void {
    const model = (event.target as HTMLSelectElement).value;
    this.choice.update((current) => ({
      ...current,
      [title]: { brand: current[title]?.brand ?? '', model },
    }));

    this.commitIfResolved(title);
  }

  /**
   * Writes the line the moment brand and model identify one item.
   *
   * There is no Add button: filling the row IS adding it. Nothing is lost by
   * committing early — quantity is edited on the saved line like any other, and
   * the row can be removed — whereas a button asks for a second click that
   * confirms something the staff member has already said.
   *
   * Does nothing while two body types share a model number: the description
   * dropdown is still deciding, and guessing between them would put the wrong
   * camera on a client's quotation.
   */
  private commitIfResolved(title: string): void {
    const matches = this.matchesIn(title);
    if (matches.length !== 1) return;

    const section = title === this.unsortedGroup.title ? this.unsortedSection() : title;
    if (!section) return;

    this.addToSection(section, matches[0], 1);
    this.choice.update((current) => ({ ...current, [title]: { brand: '', model: '' } }));
  }

  /**
   * Adds the one item the brand and model already identify.
   *
   * Brand and model settle it on almost every row, so making the description a
   * third dropdown asked for a choice that had only one answer. It is shown as
   * text with this button instead; the dropdown is kept only for the rare model
   * number shared by two body types, where the description really does decide.
   */
  protected addMatch(title: string): void {
    const matches = this.matchesIn(title);
    if (matches.length !== 1) return;

    const section = title === this.unsortedGroup.title ? this.unsortedSection() : title;
    if (!section) return;

    this.addToSection(section, matches[0], this.qtyFor(title));

    // Back to an empty entry row, ready for the next item.
    this.choice.update((current) => ({ ...current, [title]: { brand: '', model: '' } }));
    this.newQty.update((current) => ({ ...current, [title]: 1 }));
  }

  /** The last step: choosing a description is choosing the item. */
  protected pickItem(title: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const item = this.allStock().find((x) => x.id === select.value);
    select.value = '';

    if (!item) return;

    const section = title === this.unsortedGroup.title ? this.unsortedSection() : title;
    if (!section) return;

    this.addToSection(section, item, this.qtyFor(title));
    // Reset so the next item starts from the brand, rather than looking as
    // though the one just added is still pending.
    this.choice.update((current) => ({ ...current, [title]: { brand: '', model: '' } }));
    this.newQty.update((current) => ({ ...current, [title]: 1 }));
  }

  /** A line already on the quotation, so the dropdown can say so. */
  protected alreadyAdded(item: Camera): boolean {
    return this.sections().some((section) =>
      section.lines.some((line) => line.cameraId === item.id),
    );
  }

  /** How many of a group's items are already on the quotation, so a browsed
   *  group shows at a glance what has been taken from it. */
  protected pickedFrom(title: string): number {
    const chosen = new Set(
      this.sections().flatMap((section) => section.lines.map((line) => line.cameraId)),
    );
    return this.itemsIn(title).filter((item) => chosen.has(item.id)).length;
  }

  protected setUnsortedSection(event: Event): void {
    this.unsortedSection.set((event.target as HTMLSelectElement).value);
  }

  /**
   * Adds an item into the section the group stands for, creating that section
   * if the quotation has none — the whole point of browsing by section.
   *
   * `sectionTitle` is passed rather than read from the group so the catch-all
   * can supply whatever the staff chose in its row.
   */
  protected addToSection(sectionTitle: string, item: Camera, quantity = 1): void {
    let index = this.sections().findIndex((section) => section.title === sectionTitle);

    if (index < 0) {
      this.sections.update((current) => [
        ...current,
        { key: `section-${sectionTitle}-${Date.now()}`, title: sectionTitle, lines: [] },
      ]);
      index = this.sections().length - 1;
    }

    this.activeSection.set(index);
    this.addFromCatalogue(item, quantity);
  }

  /** The catch-all's per-row chooser. */
  protected addUnsorted(item: Camera, event: Event): void {
    const title = (event.target as HTMLSelectElement).value;
    if (!title) return;

    this.addToSection(title, item);
    (event.target as HTMLSelectElement).value = '';
  }

  protected clearPickerFilters(): void {
    this.pickerControl.setValue('');
    this.categoryControl.setValue('');
    this.brandControl.setValue('');
    this.typeControl.setValue('');
  }

  // ===== Sections =====

  protected addSection(): void {
    this.sections.update((current) => [
      ...current,
      { key: `section-${Date.now()}`, title: this.nextUnusedTitle(), lines: [] },
    ]);
    this.activeSection.set(this.sections().length - 1);
  }

  protected removeSection(index: number): void {
    this.sections.update((current) => current.filter((_, i) => i !== index));
    if (this.activeSection() >= this.sections().length) {
      this.activeSection.set(Math.max(0, this.sections().length - 1));
    }
  }

  /** The first heading not already on the quotation, so adding sections in
   *  order needs no picking. Falls back to the first once all four are used. */
  private nextUnusedTitle(): string {
    const used = new Set(this.sections().map((s) => s.title));
    return BOQ_SECTION_TITLES.find((t) => !used.has(t)) ?? BOQ_SECTION_TITLES[0];
  }

  protected renameSection(index: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sections.update((current) =>
      current.map((section, i) => (i === index ? { ...section, title: value } : section)),
    );
  }

  protected selectSection(index: number): void {
    this.activeSection.set(index);
  }

  // ===== Lines =====

  protected addFromCatalogue(item: Camera, quantity = 1): void {
    const target = this.activeSection();
    const existing = this.sections()[target]?.lines.findIndex((l) => l.cameraId === item.id) ?? -1;

    if (existing >= 0) {
      // Already in this section — bump the quantity rather than duplicating.
      const current = this.sections()[target].lines[existing];
      this.setQuantity(target, existing, current.quantity + quantity);
      return;
    }

    this.sections.update((current) =>
      current.map((section, i) =>
        i !== target
          ? section
          : {
              ...section,
              lines: [
                ...section.lines,
                {
                  key: `line-${item.id}-${Date.now()}`,
                  cameraId: item.id,
                  itemName: item.itemName,
                  modelNo: item.modelNo || null,
                  brand: item.brand,
                  uom: item.uom,
                  quantity,
                  unitRate: item.rate ?? 0,
                  imageUrl: item.images[0]?.url ?? null,
                  description: item.descriptionEn,
                  descriptionAr: item.descriptionAr,
                },
              ],
            },
      ),
    );
  }

  protected setQuantity(sectionIndex: number, lineIndex: number, value: number): void {
    // A cleared box reads as 0 rather than NaN, which would poison the total.
    const quantity = Number.isFinite(value) && value > 0 ? value : 0;
    this.sections.update((current) =>
      current.map((section, i) =>
        i !== sectionIndex
          ? section
          : {
              ...section,
              lines: section.lines.map((line, j) =>
                j === lineIndex ? { ...line, quantity } : line,
              ),
            },
      ),
    );
  }

  protected onQuantityInput(sectionIndex: number, lineIndex: number, event: Event): void {
    this.setQuantity(sectionIndex, lineIndex, Number((event.target as HTMLInputElement).value));
  }

  protected removeLine(sectionIndex: number, lineIndex: number): void {
    this.sections.update((current) =>
      current.map((section, i) =>
        i !== sectionIndex
          ? section
          : { ...section, lines: section.lines.filter((_, j) => j !== lineIndex) },
      ),
    );
  }

  // ===== Save =====

  protected save(event: Event): void {
    event.preventDefault();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const sections = this.sections();
    // All nine headings are on screen at all times so the editor reads like the
    // document; only the ones with lines are part of the quotation. An empty
    // heading is a section not used on this job, not an error.
    const filled = sections.filter((section) => section.lines.length > 0);

    if (!filled.length) {
      this.formError.set('Choose at least one item.');
      return;
    }
    if (filled.some((s) => s.lines.some((l) => l.quantity <= 0))) {
      this.formError.set('Every line needs a quantity greater than zero.');
      return;
    }

    const raw = this.form.getRawValue();
    const request: SaveBoqRequest = {
      projectName: raw.projectName.trim(),
      siteLocation: raw.siteLocation.trim() || null,
      clientName: raw.clientName.trim() || null,
      contactNumber: raw.contactNumber.trim() || null,
      issueDate: raw.issueDate,
      status: raw.status,
      notes: raw.notes.trim() || null,
      // Item and quantity only. The rate is the server's to decide.
      sections: filled.map((section) => ({
        title: section.title.trim(),
        lines: section.lines.map((line) => ({ cameraId: line.cameraId, quantity: line.quantity })),
      })),
    };

    const existing = this.boq();
    const save$ = existing ? this.service.update(existing.id, request) : this.service.create(request);

    this.saving.set(true);
    this.formError.set('');

    save$
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (saved) => {
          this.boq.set(saved);
          // A new BOQ has just been given its number and id, so move the URL onto
          // it — a refresh must not land back on /new.
          if (!existing) void this.router.navigate(['/staff/boq', saved.id]);
        },
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to save the quotation.')),
      });
  }

  protected download(): void {
    const boq = this.boq();
    if (!boq) return;

    this.downloading.set(true);
    this.service
      .downloadPdf(boq.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.downloading.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, `${boq.boqNumber}.pdf`),
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to download the PDF.')),
      });
  }

  protected showError(field: string): boolean {
    return shouldShowError(this.form.get(field));
  }

  protected errorFor(field: string, label: string): string {
    return fieldErrorMessage(this.form.get(field), label);
  }
}
