import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { BOQ_SECTION_TITLES, Boq, SaveBoqRequest } from '../../../models/boq.model';
import {
  Camera,
  CameraBrandCount,
  CameraType,
  PRODUCT_CATEGORIES,
  ProductCategory,
  cameraTypeLabel,
  matchCameraBrand,
  unitLabel,
} from '../../../models/camera.model';
import { PERMISSIONS } from '../../../models/auth.model';
import { AuthService } from '../../../services/auth.service';
import { BoqService } from '../../../services/boq.service';
import { BOQ_BASE_PATH, BOQ_STORAGE_PATH } from './boq-base-path';
import { CameraService } from '../../../services/camera.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { downloadBlob } from '../../../utils/download.util';
import { fieldErrorMessage, shouldShowError } from '../../../utils/form-validators.util';

/** A line while it is being built. */
interface DraftLine {
  key: string;
  /** The saved line's id, or null for one added in this sitting. Sent back so a
   *  line whose stock item has been deleted can still be kept — it has no
   *  cameraId left to name it by. */
  id: string | null;
  /** Null once the stock item behind the line has been deleted; the copied name,
   *  rate and unit below are then all that describes it. */
  cameraId: string | null;
  itemName: string;
  modelNo: string | null;
  brand: string | null;
  /** Form factor, shown beside brand and model — the server copies it onto the
   *  saved line from the catalogue, the same way it copies those two. */
  type: string | null;
  uom: string;
  quantity: number;
  /** The rate this line is priced at. Starts at the catalogue rate and can be
   *  typed over — the total follows it. */
  unitRate: number;
  /** The catalogue rate, kept beside it so the list price is still on screen
   *  after someone types over it — and so "reset" has something to reset to. */
  catalogueRate: number;
  /**
   * Thumbnail and blurb, so the table on screen shows the same nine columns the
   * client's PDF does. Neither is sent on save and neither is copied onto the
   * line server-side: both are how the stock item looks today, unlike the price,
   * which is fixed at the moment of quoting.
   */
  imageUrl: string | null;
  /**
   * What the business pays for the item, per unit.
   *
   * Null for an account not entitled to see it — the API blanks it on the way
   * out rather than sending it and trusting the screen to hide it. Also null on
   * a line whose stock item has been deleted, and on stock nobody has costed.
   */
  supplierCost: number | null;
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
}

interface DraftSection {
  key: string;
  title: string;
  lines: DraftLine[];
}

/**
 * Builds a bill of quantities from the stock catalogue.
 *
 * Staff choose items, quantities and rates. A rate starts at the catalogue
 * price and may be typed over for a negotiated job; the catalogue figure is
 * kept beside it, so a discount stays visible instead of vanishing into the
 * agreed number. See BoqWriter on the API.
 */
@Component({
  selector: 'app-boq-editor',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink],
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
  private readonly auth = inject(AuthService);

  /** Whichever portal mounted these routes — see BOQ_BASE_PATH. Every internal
   *  link is built from these two rather than written out, so the same screens
   *  keep an administrator in /admin and a staff member in /staff. */
  protected readonly basePath = inject(BOQ_BASE_PATH);
  protected readonly storagePath = inject(BOQ_STORAGE_PATH);

  protected readonly sectionTitles = BOQ_SECTION_TITLES;

  /** In the order the document prints them, so browsing follows the quotation. */
  /**
   * One category per section, in document order.
   *
   * This used to be a translation table — "Power supply" into "Rack & UPS", KPOI
   * faked as the ANPR half of Cctv — because categories and sections were named
   * differently. They are the same list now, so the mapping is one to one and
   * there is nothing left to drift.
   *
   * KPOI and ANPR are their own categories rather than filters over Cctv. A
   * submission counts each separately from the main system, and number-plate
   * cameras are sized on a page of their own. ANPR used to sit under Main CCTV
   * and be told apart by its free-text type — which held only for as long as
   * everyone spelled that type the same way.
   */
  protected readonly pickerGroups: readonly PickerGroup[] = [
    { title: 'Main CCTV System', categories: ['Cctv'] },
    { title: 'Camera Accessories', categories: ['Accessory'] },
    { title: 'NVR & Storage', categories: ['Storage'] },
    { title: 'VMS & Server', categories: ['VmsServer'] },
    { title: 'Monitors and Work Stations', categories: ['Monitor'] },
    { title: 'Switch & Components', categories: ['Network'] },
    { title: 'Rack & UPS', categories: ['PowerSupply'] },
    { title: 'Key Point of Interest Camera (KPOI)', categories: ['Kpoi'] },
    { title: 'Automatic Number Plate Recognition (ANPR)', categories: ['Anpr'] },
    { title: 'Passive Components & Cables', categories: ['Cable'] },
    { title: 'Access Control System', categories: ['AccessControl'] },
    { title: 'Service', categories: ['Service'] },
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
  protected readonly choice = signal<Record<string, { brand: string; type: string; model: string }>>({});

  /** The section chosen for an unfiled item, which has no heading of its own. */

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

  /**
   * What the last save actually did, named — "Saved" alone leaves the reader
   * checking the figures to see whether anything happened.
   *
   * A save used to finish in silence: the button went back to reading "Save
   * changes" and nothing else moved, which is indistinguishable from a save that
   * never happened.
   */
  protected readonly savedNotice = signal('');
  private savedNoticeTimer: ReturnType<typeof setTimeout> | null = null;

  // ===== Approval =====

  /**
   * Whether this account may decide on a quotation.
   *
   * Drives which buttons are drawn and nothing else. The API refuses an approve
   * or reject from an account without the grant whatever the screen was showing
   * — see AuthorizationPolicies and the Boqs endpoints — so this is about not
   * offering an action that would fail, never about keeping anybody out.
   */
  protected readonly canApprove = computed(() => this.auth.can(PERMISSIONS.boqApprove));

  /** Where the saved document stands. A quotation not yet saved is a draft. */
  protected readonly status = computed(() => this.boq()?.status ?? 'Draft');

  /**
   * Whether the finished PDF can be produced at all yet.
   *
   * Mirrors BoqVisibility.CanDownload on the server exactly: even the
   * document's own author gets nothing before Approved, because that
   * download is the one file that could go straight to a client and skip
   * the approval step entirely — the whole reason this check exists. The
   * API enforces the real boundary regardless of what this screen offers;
   * this is only about not drawing a button that would come back refused.
   */
  protected readonly canDownload = computed(() => this.status() === 'Approved' || this.canApprove());

  /** Sending an approved document out is a decision above even an
   *  approver's grant — only the super administrator sees this. */
  protected readonly canShare = computed(() => this.status() === 'Approved' && this.auth.isSuperAdmin());

  /**
   * Whether the lines may still be changed, as the SERVER says — an approved or
   * submitted quotation is read-only, and the editor asks rather than working it
   * out, so the two cannot disagree about it.
   *
   * The super administrator is the exception, and the server agrees: somebody
   * has to be able to correct a signed-off document, and the alternative is
   * deleting and rebuilding it, which loses the number and the trail with it.
   */
  protected readonly isEditable = computed(
    () => (this.boq()?.isEditable ?? true) || this.auth.isSuperAdmin(),
  );

  /** Editing something already decided. Worth saying out loud — the approval on
   *  screen was given for the lines as they were, not as they are becoming. */
  protected readonly isAmending = computed(
    () => this.isEditing() && !(this.boq()?.isEditable ?? true) && this.auth.isSuperAdmin(),
  );

  protected readonly canSubmit = computed(() =>
    this.isEditing() && this.isEditable() && !this.saving() && !this.deciding());

  /** Only a quotation actually waiting on somebody can be answered. */
  protected readonly canDecide = computed(() =>
    this.canApprove() && this.status() === 'Submitted' && !this.deciding());

  protected readonly deciding = signal(false);
  protected readonly rejecting = signal(false);
  protected readonly rejectReason = signal('');
  protected readonly rejectError = signal('');

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
   * The lump sum agreed off the quotation, as typed.
   *
   * A signal rather than a form control because the figures below it are
   * computed, and the total has to move under the discount as lines are added.
   */
  protected readonly discount = signal(0);

  /** Never below zero and never more than the lines it comes off — the server
   *  refuses both, and the footer should not show a figure it will reject. */
  protected readonly discountApplied = computed(() =>
    Math.min(Math.max(this.discount(), 0), this.total()),
  );

  /** What the customer pays, which is what the document ends on. */
  protected readonly grandTotal = computed(() => this.total() - this.discountApplied());

  /** Typing 5,000 off a 500 quotation is a mistake worth saying out loud rather
   *  than silently clamping — the saved figure would not be the one on screen. */
  protected readonly discountTooLarge = computed(
    () => this.discount() > this.total() && this.total() > 0,
  );

  protected onDiscountInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.discount.set(Number.isFinite(value) ? value : 0);
  }

  /**
   * How a unit is written on screen. The stored enum name stays put, so only
   * the printed form changes; the mapping lives with the dropdown it has to
   * agree with rather than being spelled out a second time here.
   */
  protected unit(uom: string): string {
    return unitLabel(uom);
  }

  protected lineTotal(line: DraftLine): number {
    return Math.round(line.quantity * line.unitRate * 100) / 100;
  }

  protected sectionTotal(section: DraftSection): number {
    return section.lines.reduce((sum, line) => sum + this.lineTotal(line), 0);
  }

  ngOnInit(): void {
    this.loadCatalogue();

    this.destroyRef.onDestroy(() => {
      if (this.savedNoticeTimer) clearTimeout(this.savedNoticeTimer);
      this.clearCostTimer();
    });

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
            notes: boq.notes ?? '',
          });
          this.seedSections(boq);
        },
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to load the quotation.')),
      });
  }

  /**
   * Puts the rows on screen in step with a saved document — on load, and again
   * after every save.
   *
   * Re-seeding after a save is not cosmetic. The server rewrites a BOQ by
   * replacing its lines, so each save mints fresh line ids; rows still holding
   * the previous ones are refused the next time round with "a line is no longer
   * on this BOQ", which is true but unhelpful when nothing has actually moved.
   */
  private seedSections(boq: Boq): void {
    this.discount.set(boq.specialDiscount);

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
            id: line.id,
            // Kept as null, not blanked to '': an empty string is not a
            // guid, and posting one back made the whole document
            // unsaveable with a 500 from the JSON reader.
            cameraId: line.cameraId,
            itemName: line.itemName,
            modelNo: line.modelNo,
            brand: line.brand,
            type: line.type,
            uom: line.uom,
            quantity: line.quantity,
            unitRate: line.unitRate,
            catalogueRate: line.catalogueRate,
            // Filled in once the catalogue arrives — see attachCatalogueDetail.
            imageUrl: null,
            supplierCost: null,
            description: null,
            descriptionAr: null,
          })),
        };
      }),
    );

    this.attachCatalogueDetail();
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
                const item = line.cameraId ? catalogue.get(line.cameraId) : undefined;
                if (!item) return line;

                return {
                  ...line,
                  imageUrl: item.images[0]?.url ?? null,
                  // Null unless this account may see it — the API decides, not
                  // this screen.
                  supplierCost: item.supplierCost,
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

  /** The stock that belongs under a heading, by the group's category rule. */
  protected itemsIn(title: string): Camera[] {
    const group = this.groupFor(title);
    if (!group) return [];

    return this.allStock().filter((item) => group.categories.includes(item.category));
  }

  // ===== Brand → model → description =====

  /** Distinct brands under a heading, so the first dropdown is never empty of
   *  meaning: every brand listed has at least one item behind it. */
  protected brandsIn(title: string): string[] {
    return [...new Set(this.itemsIn(title).map((item) => item.brand))].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  /**
   * Types stocked in this section, for the brand already chosen.
   *
   * Derived from the items actually filed under the section rather than from a
   * list, so a section holding only domes offers only "Dome" — asking a staff
   * member to choose between form factors nobody stocks is a question with a
   * wrong answer available.
   */
  protected typesIn(title: string): string[] {
    const brand = this.choice()[title]?.brand;
    if (!brand) return [];

    return [
      ...new Set(
        this.itemsIn(title)
          .filter((item) => item.brand === brand && !!item.type)
          .map((item) => item.type),
      ),
    ].sort((a, b) => a.localeCompare(b));
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

  /**
   * Models for the brand AND type already chosen.
   *
   * Deliberately empty until both are answered. Listing every model a brand
   * makes the moment the brand is picked offered domes, bullets and ANPR
   * together — the reader then had to know which model was which form factor,
   * which is the question the type step exists to answer.
   */
  protected modelsIn(title: string): string[] {
    const chosen = this.choice()[title];
    if (!chosen?.brand) return [];

    // A brand whose items carry no type at all has nothing to wait for.
    if (!chosen.type && this.typesIn(title).length) return [];

    const mine = this.narrow(title, chosen.brand, chosen.type);

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
  /** Items in this section for a brand, narrowed by type when one is chosen. */
  private narrow(title: string, brand: string, type?: string): Camera[] {
    return this.itemsIn(title).filter(
      (item) => item.brand === brand && (!type || item.type === type),
    );
  }

  protected matchesIn(title: string): Camera[] {
    const chosen = this.choice()[title];
    if (!chosen?.brand) return [];

    // The type is part of the question, not an optional refinement: resolving on
    // the brand alone committed a line before the reader had said which form
    // factor they wanted.
    if (!chosen.type && this.typesIn(title).length) return [];

    const mine = this.narrow(title, chosen.brand, chosen.type);

    // Brand and type holding one item between them need no third question.
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
    this.choice.update((current) => ({ ...current, [title]: { brand, type: '', model: '' } }));

    // A brand whose items carry no model number is already unambiguous, so
    // there is nothing left to ask.
    this.commitIfResolved(title);
  }

  protected setType(title: string, event: Event): void {
    const type = (event.target as HTMLSelectElement).value;
    // The model belonged to the old type, so it goes with it.
    this.choice.update((current) => ({
      ...current,
      [title]: { brand: current[title]?.brand ?? '', type, model: '' },
    }));

    this.commitIfResolved(title);
  }

  protected setModel(title: string, event: Event): void {
    const model = (event.target as HTMLSelectElement).value;
    this.choice.update((current) => ({
      ...current,
      [title]: {
        brand: current[title]?.brand ?? '',
        type: current[title]?.type ?? '',
        model,
      },
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

    const section = title;

    this.addToSection(section, matches[0], 1);
    this.choice.update((current) => ({ ...current, [title]: { brand: '', type: '', model: '' } }));
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

    const section = title;

    this.addToSection(section, matches[0], this.qtyFor(title));

    // Back to an empty entry row, ready for the next item.
    this.choice.update((current) => ({ ...current, [title]: { brand: '', type: '', model: '' } }));
    this.newQty.update((current) => ({ ...current, [title]: 1 }));
  }

  /** The last step: choosing a description is choosing the item. */
  protected pickItem(title: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const item = this.allStock().find((x) => x.id === select.value);
    select.value = '';

    if (!item) return;

    const section = title;

    this.addToSection(section, item, this.qtyFor(title));
    // Reset so the next item starts from the brand, rather than looking as
    // though the one just added is still pending.
    this.choice.update((current) => ({ ...current, [title]: { brand: '', type: '', model: '' } }));
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
                  id: null,
                  cameraId: item.id,
                  itemName: item.itemName,
                  modelNo: item.modelNo || null,
                  brand: item.brand,
                  type: item.type || null,
                  uom: item.uom,
                  quantity,
                  // A new line starts at the catalogue price. Both fields hold
                  // it, so the line reads as "no discount" until somebody makes
                  // one — rather than as a discount down from nothing.
                  unitRate: item.rate ?? 0,
                  catalogueRate: item.rate ?? 0,
                  supplierCost: item.supplierCost,
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

  /**
   * Whether this line goes out at anything other than the catalogue price.
   *
   * Compared in fils rather than on the raw numbers: 57 and 57.000000001 are the
   * same price to everyone except a floating-point comparison, and treating that
   * as a discount would mark untouched lines and post a pointless override.
   */
  protected isRepriced(line: DraftLine): boolean {
    return Math.round(line.unitRate * 100) !== Math.round(line.catalogueRate * 100);
  }

  /**
   * Zero is a legitimate price — an item included at no charge — so it is kept
   * rather than bounced back to the catalogue rate. Only a cleared or nonsense
   * box falls back, and negatives are refused: a line that subtracts from the
   * total is a discount pretending to be equipment.
   */
  protected setRate(sectionIndex: number, lineIndex: number, value: number): void {
    const unitRate = Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : 0;
    this.sections.update((current) =>
      current.map((section, i) =>
        i !== sectionIndex
          ? section
          : {
              ...section,
              lines: section.lines.map((line, j) =>
                j === lineIndex ? { ...line, unitRate } : line,
              ),
            },
      ),
    );
  }

  protected onRateInput(sectionIndex: number, lineIndex: number, event: Event): void {
    this.setRate(sectionIndex, lineIndex, Number((event.target as HTMLInputElement).value));
  }

  /** Puts a repriced line back on the catalogue price. */
  protected resetRate(sectionIndex: number, lineIndex: number): void {
    const line = this.sections()[sectionIndex]?.lines[lineIndex];
    if (line) this.setRate(sectionIndex, lineIndex, line.catalogueRate);
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
    if (this.discountTooLarge()) {
      this.formError.set('The discount cannot be more than the quotation total.');
      return;
    }

    const raw = this.form.getRawValue();
    const request: SaveBoqRequest = {
      projectName: raw.projectName.trim(),
      siteLocation: raw.siteLocation.trim() || null,
      clientName: raw.clientName.trim() || null,
      contactNumber: raw.contactNumber.trim() || null,
      issueDate: raw.issueDate,
      notes: raw.notes.trim() || null,
      specialDiscount: this.discountApplied(),
      sections: filled.map((section) => ({
        title: section.title.trim(),
        lines: section.lines.map((line) => ({
          id: line.id,
          cameraId: line.cameraId,
          quantity: line.quantity,
          // Null unless this line was actually repriced. Sending the catalogue
          // rate back as an "override" would pin today's price onto the line
          // forever: re-saving an untouched quotation after an admin corrected
          // the catalogue would silently keep the old figure, and it would look
          // like somebody had chosen it.
          unitRate: this.isRepriced(line) ? line.unitRate : null,
        })),
      })),
    };

    const existing = this.boq();
    const save$ = existing ? this.service.update(existing.id, request) : this.service.create(request);

    this.saving.set(true);
    this.formError.set('');
    this.savedNotice.set('');

    save$
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (saved) => {
          this.boq.set(saved);
          // Back in step with what the server actually wrote — the rates it
          // recalculated, and the line ids it minted, which the next save has
          // to quote.
          this.seedSections(saved);
          // The payable figure, not the pre-discount one: that is what the
          // document ends on and what the reader is checking against.
          this.noteSaved(
            existing
              ? `Saved. ${saved.boqNumber} now comes to ${this.money(saved.grandTotal)} ﷼.`
              : `Saved as ${saved.boqNumber}, coming to ${this.money(saved.grandTotal)} ﷼.`,
          );
          // A new BOQ has just been given its number and id, so move the URL onto
          // it — a refresh must not land back on /new.
          if (!existing) void this.router.navigate([this.basePath, saved.id]);
        },
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to save the quotation.')),
      });
  }

  // ===== Approval actions =====

  /**
   * Hands the quotation to an approver.
   *
   * Saved first when there is anything unsaved: submitting shows somebody the
   * stored document, and sending them a version that differs from what is on
   * screen is how a decision gets taken on the wrong figures.
   */
  protected submitForApproval(): void {
    const existing = this.boq();
    if (!existing || !this.canSubmit()) return;

    this.formError.set('');
    this.deciding.set(true);

    this.service
      .submit(existing.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deciding.set(false)))
      .subscribe({
        next: (saved) => this.applyDecision(saved, 'Sent for approval.'),
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to submit this quotation.')),
      });
  }

  protected approve(): void {
    const existing = this.boq();
    if (!existing || !this.canDecide()) return;

    this.formError.set('');
    this.deciding.set(true);

    this.service
      .approve(existing.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deciding.set(false)))
      .subscribe({
        next: (saved) => this.applyDecision(saved, `Approved. ${saved.boqNumber} is now agreed.`),
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to approve this quotation.')),
      });
  }

  protected openReject(): void {
    this.rejectReason.set('');
    this.rejectError.set('');
    this.rejecting.set(true);
  }

  protected closeReject(): void {
    this.rejecting.set(false);
  }

  protected onRejectReasonInput(event: Event): void {
    this.rejectReason.set((event.target as HTMLTextAreaElement).value);
    if (this.rejectError()) this.rejectError.set('');
  }

  /**
   * Rejects with the reason given.
   *
   * The reason is checked here so the approver is told before the round trip,
   * and again by the server, which is the check that counts — a rejection
   * nobody explained leaves the person reworking it guessing.
   */
  protected confirmReject(): void {
    const existing = this.boq();
    if (!existing) return;

    const reason = this.rejectReason().trim();
    if (reason.length < 5) {
      this.rejectError.set('Say what needs changing — at least a few words.');
      return;
    }

    this.rejectError.set('');
    this.deciding.set(true);

    this.service
      .reject(existing.id, reason)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deciding.set(false)))
      .subscribe({
        next: (saved) => {
          this.rejecting.set(false);
          this.applyDecision(saved, `Rejected. ${saved.boqNumber} has gone back for changes.`);
        },
        error: (err: unknown) =>
          this.rejectError.set(getApiErrorMessage(err, 'Unable to reject this quotation.')),
      });
  }

  /** Everything a decision changes: the document, the rows, and what to say. */
  private applyDecision(saved: Boq, message: string): void {
    this.boq.set(saved);
    this.seedSections(saved);
    this.noteSaved(message);
  }

  /** How a step reads in the history. */
  protected stepLabel(action: string): string {
    switch (action) {
      case 'Created': return 'Created';
      case 'Submitted': return 'Submitted for approval';
      case 'Approved': return 'Approved';
      case 'Rejected': return 'Rejected';
      case 'Amended': return 'Amended after the decision';
      default: return action;
    }
  }

  // ===== Supplier cost =====

  /**
   * Whether this account may see what stock costs.
   *
   * Its own grant, held by nobody until an administrator gives it — managing the
   * catalogue and knowing the buying price are different jobs. It only decides
   * whether the button is drawn: the API blanks the figures for anyone else, so
   * a screen that showed the column anyway would show a column of dashes.
   */
  protected readonly canSeeCost = computed(() => this.auth.can(PERMISSIONS.cameraCost));

  /**
   * Revealed on request and taken away again.
   *
   * A quotation is built in front of customers and on shared screens, so cost
   * is off by default and does not stay up: it closes itself after
   * COST_VISIBLE_MS, which is what makes it safe to use in a meeting rather than
   * something to remember to hide.
   */
  protected readonly costVisible = signal(false);
  protected readonly costSecondsLeft = signal(0);
  private costTimer: ReturnType<typeof setInterval> | null = null;

  /** Long enough to read a column of figures, short enough to be gone before
   *  the laptop is turned round. */
  private static readonly COST_VISIBLE_MS = 30_000;

  protected toggleCost(): void {
    if (this.costVisible()) {
      this.hideCost();
      return;
    }

    this.costVisible.set(true);
    this.costSecondsLeft.set(BoqEditorComponent.COST_VISIBLE_MS / 1000);

    this.clearCostTimer();
    this.costTimer = setInterval(() => {
      const left = this.costSecondsLeft() - 1;
      if (left <= 0) {
        this.hideCost();
        return;
      }
      this.costSecondsLeft.set(left);
    }, 1000);
  }

  protected hideCost(): void {
    this.costVisible.set(false);
    this.costSecondsLeft.set(0);
    this.clearCostTimer();
  }

  private clearCostTimer(): void {
    if (this.costTimer) clearInterval(this.costTimer);
    this.costTimer = null;
  }

  /** What a whole section costs the business. Lines nobody has costed count as
   *  zero, so this reads as "at least this much" rather than refusing to add up. */
  protected sectionCost(section: DraftSection): number {
    return section.lines.reduce((sum, line) => sum + (this.lineCost(line) ?? 0), 0);
  }

  /** What the line costs the business, against what it is being sold for. */
  protected lineCost(line: DraftLine): number | null {
    return line.supplierCost === null ? null : line.supplierCost * line.quantity;
  }

  /** Margin on the line as a percentage of the selling price, or null when
   *  either half is unknown — a made-up margin is worse than none. */
  protected lineMargin(line: DraftLine): number | null {
    const cost = this.lineCost(line);
    const sell = this.lineTotal(line);
    if (cost === null || sell <= 0) return null;
    return ((sell - cost) / sell) * 100;
  }

  private money(value: number): string {
    return value.toLocaleString('en-QA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Shows what the save did, then takes it away again — a confirmation left
   * standing beside figures the reader has since changed reads as though those
   * changes were saved too.
   */
  private noteSaved(message: string): void {
    if (this.savedNoticeTimer) clearTimeout(this.savedNoticeTimer);
    this.savedNotice.set(message);
    this.savedNoticeTimer = setTimeout(() => this.savedNotice.set(''), 6000);
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

  // ===== Share (super admin, approved only) =====

  /**
   * Neither wa.me nor mailto: can attach a file on the sender's behalf — that
   * is not something either can do from a web page — so this triggers the
   * same clean download the button above does, and the message says the file
   * is waiting to be attached rather than implying it already is.
   */
  private shareMessage(boq: Boq): string {
    return [
      `Hello${boq.clientName ? ' ' + boq.clientName : ''},`,
      '',
      `Please find attached quotation ${boq.boqNumber}${boq.projectName ? ' for ' + boq.projectName : ''}.`,
      '(The PDF has just been downloaded to your computer — attach it here before sending.)',
      '',
      'Kind regards,',
      'Jama Go Security Equipment',
    ].join('\n');
  }

  protected shareWhatsApp(): void {
    const boq = this.boq();
    if (!boq || !this.canShare()) return;

    this.download();

    const digits = (boq.contactNumber ?? '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(this.shareMessage(boq));
    const url = digits
      ? `https://wa.me/${digits}?text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  protected shareEmail(): void {
    const boq = this.boq();
    if (!boq || !this.canShare()) return;

    this.download();

    const subject = encodeURIComponent(
      `Quotation ${boq.boqNumber}${boq.projectName ? ' — ' + boq.projectName : ''}`,
    );
    const body = encodeURIComponent(this.shareMessage(boq));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  protected showError(field: string): boolean {
    return shouldShowError(this.form.get(field));
  }

  protected errorFor(field: string, label: string): string {
    return fieldErrorMessage(this.form.get(field), label);
  }
}
