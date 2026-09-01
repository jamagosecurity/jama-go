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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Boq, BoqListItem } from '../../../models/boq.model';
import { Camera } from '../../../models/camera.model';
import {
  BAY_OPTIONS,
  CalculateStorageRequest,
  DISK_SIZES,
  RAID_LEVELS,
  StorageDesign,
} from '../../../models/storage-design.model';
import { BoqService } from '../../../services/boq.service';
import { CameraService } from '../../../services/camera.service';
import { StorageDesignService } from '../../../services/storage-design.service';

/**
 * Bitrate assumed for a camera whose stock record carries none.
 *
 * A working figure so sizing is never blocked by a gap in the catalogue — not a
 * measurement. It stays editable per row, and any row using it is flagged, so
 * nobody mistakes the assumption for something the item actually specified.
 *
 * The real fix is filling the bitrate in on the stock item, which is what the
 * on-screen warning asks for: do that once and every future quotation sizes
 * itself without anyone touching this.
 */
const DEFAULT_BITRATE_MBPS = 2.5;

/**
 * Disk capacity in TB, read out of a stock item's name.
 *
 * A stock item has no capacity field — "Surveillance Hard Drive 16TB" carries it
 * only in the text. Anything that does not state a size returns 0 and is dropped,
 * because a disk of unknown capacity cannot be sized against and guessing one
 * would put a fabricated number into a purchase order.
 */
function capacityFromName(text: string): number {
  const match = /(\d+)\s*TB\b/i.exec(text);
  return match ? Number(match[1]) : 0;
}

/**
 * Channel count of a recorder, read out of its name — "32-Channel 4K Network
 * Video Recorder" is 32. Zero when the name does not say, which drops the item
 * rather than guessing a capacity it may not have.
 */
function channelsFromName(text: string): number {
  const match = /(\d+)\s*[-\s]?channel/i.exec(text);
  return match ? Number(match[1]) : 0;
}

/** A camera group on screen: a stock item, how many, and the bitrate to size it at. */
interface CameraRow {
  key: string;
  label: string;
  count: number;
  bitrateMbps: number | null;
  /** True when the stock item carries no bitrate, so the row needs one typed in. */
  needsBitrate: boolean;
}

interface AnprRow {
  key: string;
  label: string;
  count: number;
  kilobytesPerImage: number;
  imagesPerEvent: number;
  eventsPerDay: number;
}

/**
 * Sizes the recording array for a quotation.
 *
 * The camera groups come from a quotation's own lines, so the thing being
 * priced and the thing being sized are the same list — the workbook this
 * replaces required both to be typed twice and kept in step by hand.
 *
 * The arithmetic is entirely server-side. This screen collects inputs and
 * renders the answer; it never re-derives a terabyte locally, so the figure on
 * screen and the figure the API would give anyone else cannot disagree.
 */
@Component({
  selector: 'app-storage-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './storage-calculator.component.html',
  styleUrl: './storage-calculator.component.css',
})
export class StorageCalculatorComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly storage = inject(StorageDesignService);
  private readonly boqs = inject(BoqService);
  private readonly cameras = inject(CameraService);

  /**
   * The page is mounted in both shells — /staff/storage and
   * /admin/storage/calculator — so "back" has to lead somewhere that exists in
   * whichever one the reader is standing in. There is no admin quotations
   * screen; an admin came from the storage reference page.
   */
  private readonly inAdminShell = this.router.url.startsWith('/admin');
  protected readonly backLink = this.inAdminShell ? '/admin/storage' : '/staff/boq';
  protected readonly backLabel = this.inAdminShell ? '← Storage sizing' : '← All quotations';

  protected readonly raidLevels = RAID_LEVELS;
  protected readonly diskSizes = DISK_SIZES;
  protected readonly bayOptions = BAY_OPTIONS;

  /** Named on screen wherever the assumption is mentioned, so the figure and the
   *  wording can never disagree. */
  protected readonly defaultBitrate = DEFAULT_BITRATE_MBPS;

  protected readonly quotations = signal<BoqListItem[]>([]);
  protected readonly loadedQuotation = signal<Boq | null>(null);
  protected readonly loadingQuotation = signal(false);

  /**
   * Disks the catalogue actually sells, with their prices, so the sizing can
   * cost each option instead of guessing which is better value.
   *
   * Capacity is read out of the item name because a stock item has no capacity
   * field — a "Surveillance Hard Drive 16TB" says so only in its name. That is a
   * stopgap: a disk whose name omits the size is skipped rather than guessed at,
   * and the sizing falls back to the standard list.
   */
  private readonly stockedDisks = signal<{ terabytes: number; pricePerDisk: number | null }[]>([]);

  /**
   * Recorders the catalogue sells, by channel count and price.
   *
   * The enclosure price has to be in the ranking or it recommends the wrong disk:
   * more groups means more chassis, and a size needing 5 groups can lose to one
   * needing 3 even while its disks are cheaper. Leaving the field blank quietly
   * produced that wrong answer, so it is filled in from stock rather than typed.
   */
  private readonly stockedRecorders = signal<{ channels: number; price: number }[]>([]);

  protected readonly cameraRows = signal<CameraRow[]>([]);
  protected readonly anprRows = signal<AnprRow[]>([]);

  /**
   * Recorders the QUOTATION prices, not ones the catalogue suggests.
   *
   * The MOI sheet states the NVR being supplied, so it has to come off the
   * document being submitted. Reading it from the catalogue instead put a
   * cost-optimised suggestion on the sheet — a 16-channel recorder against 106
   * cameras — which is a claim about equipment nobody is buying.
   */
  protected readonly recorderRows = signal<{ label: string; channels: number; count: number }[]>([]);
  protected readonly design = signal<StorageDesign | null>(null);
  protected readonly calculating = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly quotationControl = new FormControl<string>('', { nonNullable: true });

  protected readonly form = this.formBuilder.nonNullable.group({
    retentionDays: [120, [Validators.required, Validators.min(1), Validators.max(3650)]],
    // One, meaning none applied. The MOI sheet uses no redundancy factor — its
    // per-camera figure is bitrate x time — so anything above 1 makes the
    // submission disagree with a reviewer checking it by hand.
    redundancy: [1, [Validators.required, Validators.min(1), Validators.max(3)]],
    filesystemFactor: [0.9, [Validators.required, Validators.min(0.5), Validators.max(1)]],
    // Empty weighs all three levels per array. A small stills volume is cheapest
    // mirrored and a large recording array cheapest striped, so one level for
    // both over-buys at one end.
    raidLevel: [''],
    failoverDays: [30, [Validators.min(0), Validators.max(3650)]],
    failoverCameras: [0, [Validators.min(0)]],
    // MOI submission columns. Codec and FPS explain how the bitrate was arrived
    // at; motion scales the footage, so 50 genuinely halves the storage.
    recordingCodec: ['H.264', Validators.required],
    fps: [15, [Validators.required, Validators.min(1), Validators.max(60)]],
    motionPercent: [100, [Validators.required, Validators.min(1), Validators.max(100)]],
    hddType: ['SATA', Validators.required],
    // What the array recommendation is built from. Not a proposed array —
    // the size of disk to buy, and how many bays there are to put them in.
    // Empty means "let the server choose". Pinning a size is an override, not
    // the normal path — the right disk is an outcome of the requirement.
    recommendDiskTerabytes: [''],
    // The ANPR array gets its own choice. Both default to empty, meaning "let
    // the server choose" — a pinned size is an override, not the normal path.
    anprDiskTerabytes: [''],
    baysPerGroup: [12, Validators.required],
    hotSpareDisks: [1, [Validators.required, Validators.min(0), Validators.max(8)]],
    // Charged once per RAID group. Blank means chassis cost is left out, which
    // biases the recommendation towards many small disks — see the comparison.
    enclosurePrice: [''],
  });

  /**
   * Live values from two form controls the header and CTA read back.
   *
   * toSignal, not computed(): a computed that reads FormControl.value takes no
   * reactive dependency on it, so it would evaluate once and never update.
   */
  private readonly raidLevelSignal = toSignal(this.form.controls.raidLevel.valueChanges, {
    initialValue: this.form.controls.raidLevel.value,
  });
  private readonly retentionSignal = toSignal(this.form.controls.retentionDays.valueChanges, {
    initialValue: this.form.controls.retentionDays.value,
  });
  private readonly enclosurePriceSignal = toSignal(this.form.controls.enclosurePrice.valueChanges, {
    initialValue: this.form.controls.enclosurePrice.value,
  });

  protected readonly raidLevelValue = computed(() => this.raidLevelSignal());
  protected readonly retentionValue = computed(() => this.retentionSignal());

  // ===== MOI submission sheet =====
  //
  // The sheet states one resolution, codec, fps and bitrate for the whole
  // system, because the projects it was designed for use one camera type
  // throughout. A mixed job has no single figure, so the bitrate shown is the
  // weighted average and the resolution says "mixed" rather than picking one
  // row's value and presenting it as the system's.

  /** Today, as the sheet's date. dd/MM/yyyy — the format the reference uses. */
  protected readonly today = new Date().toLocaleDateString('en-GB');

  /**
   * The recorder the sheet names, taken from the quotation.
   *
   * Null when the quotation prices none — the sheet then says so rather than
   * borrowing a model from the catalogue, because a submission must describe the
   * equipment being supplied.
   */
  protected readonly sheetRecorder = computed(() => {
    const rows = this.recorderRows();
    if (rows.length === 0) return null;
    const channels = rows.reduce((n, r) => n + r.channels * r.count, 0);
    const units = rows.reduce((n, r) => n + r.count, 0);
    return { label: rows.length === 1 ? rows[0].label : `${units} recorders`, channels, units };
  });

  /**
   * True when the quoted recorders cannot take every camera.
   *
   * Worth saying out loud on a submission: the sheet would otherwise state a
   * channel count below the camera count and leave the reader to notice.
   */
  protected readonly recorderShortfall = computed(() => {
    const rec = this.sheetRecorder();
    if (!rec) return 0;
    return Math.max(0, this.cameraCount() - rec.channels);
  });

  /** Arrays are lettered A, B, C on the sheet, not numbered. */
  protected arrayLetter(n: number): string {
    return String.fromCharCode(64 + n);
  }

  /** Cameras weighted by count, so 30 domes and 1 outlier does not read as the
   *  midpoint of two numbers. */
  protected readonly sheetBitrate = computed(() => {
    const rows = this.cameraRows().filter((r) => (r.bitrateMbps ?? 0) > 0);
    const total = rows.reduce((n, r) => n + r.count, 0);
    if (!total) return 0;
    return rows.reduce((n, r) => n + r.bitrateMbps! * r.count, 0) / total;
  });

  /** One resolution when every camera agrees, otherwise "Mixed" — asserting a
   *  single figure over a mixed system would be a claim the design cannot make. */
  protected readonly sheetResolution = computed(() => {
    const rates = new Set(
      this.cameraRows().filter((r) => (r.bitrateMbps ?? 0) > 0).map((r) => r.bitrateMbps),
    );
    if (rates.size === 0) return '—';
    return rates.size === 1 ? '2MP' : 'Mixed';
  });

  /** Storage one camera fills, from the design's own figures rather than
   *  recomputed here — the server owns the arithmetic. */
  protected readonly perCameraTerabytes = computed(() => {
    const d = this.design();
    if (!d || !d.cameraCount) return 0;
    return d.videoTerabytes / d.cameraCount;
  });

  /** MOI "Total Proposed storage": data disks at label size, before parity and
   *  hot spares, which the row beneath adds. */
  protected readonly proposedDataTerabytes = computed(() => {
    const d = this.design();
    return d ? d.recommended.dataDisks * d.recommended.diskTerabytes : 0;
  });

  /** MOI "Total Proposed storage" for the ANPR array: data disks at label size,
   *  before parity and hot spares — the same reading the primary summary uses. */
  protected readonly proposedAnprDataTerabytes = computed(() => {
    const d = this.design();
    return d ? d.recommendedAnpr.dataDisks * d.recommendedAnpr.diskTerabytes : 0;
  });

  protected readonly anprCameraCount = computed(() =>
    this.anprRows().reduce((n, r) => n + r.count, 0),
  );

  protected readonly anprSnapshotsPerDay = computed(() => this.anprRows()[0]?.eventsPerDay ?? 0);
  protected readonly anprSnapshotKb = computed(() => this.anprRows()[0]?.kilobytesPerImage ?? 0);

  /** Per camera, from the design's ANPR total rather than recomputed. */
  protected readonly anprPerCamera = computed(() => {
    const d = this.design();
    const n = this.anprCameraCount();
    return d && n ? d.anprRequiredTerabytes / n : 0;
  });

  /** Cameras across every row — the headline count, not the number of rows. */
  protected readonly cameraCount = computed(() =>
    this.cameraRows().reduce((total, row) => total + row.count, 0),
  );

  /**
   * Rows still sizing at the assumed default because their stock item carries no
   * bitrate. Worth saying out loud — the array is being sized on our number, not
   * the camera's — but not worth blocking on, which is why this is separate from
   * unpricedRows below.
   */
  protected readonly assumedRows = computed(() =>
    this.cameraRows().filter((row) => row.needsBitrate && (row.bitrateMbps ?? 0) > 0),
  );

  /**
   * Rows that genuinely cannot be sized. Only reachable by clearing a bitrate by
   * hand: every row now arrives with either the item's figure or the default.
   */
  protected readonly unpricedRows = computed(() =>
    this.cameraRows().filter((row) => !row.bitrateMbps || row.bitrateMbps <= 0),
  );

  /**
   * The recorder line-up that covers this job's cameras most cheaply, and what
   * one of those boxes costs.
   *
   * A job with more cameras than any single recorder holds is not un-pricable —
   * it is several recorders. 106 cameras is 7 sixteen-channel boxes at 17,150,
   * or 2 sixty-four-channel at 18,400; the cheap line-up wins and its UNIT price
   * is what a RAID group's enclosure costs.
   *
   * Requiring one box to hold every camera meant every job over 64 cameras got
   * no chassis price at all, which silently biased the disk choice towards many
   * small disks — the exact error this whole comparison exists to stop.
   */
  protected readonly suggestedEnclosure = computed(() => {
    const needed = this.cameraCount();
    const recorders = this.stockedRecorders();
    if (needed <= 0 || recorders.length === 0) return null;

    return recorders
      .map((r) => ({
        channels: r.channels,
        price: r.price,
        count: Math.ceil(needed / r.channels),
        lineUpCost: Math.ceil(needed / r.channels) * r.price,
      }))
      .sort((a, b) => a.lineUpCost - b.lineUpCost || a.count - b.count)[0];
  });

  /** What the ranking will actually charge per group. The typed value wins; the
   *  catalogue fills in when nobody typed one. */
  protected readonly effectiveEnclosurePrice = computed(() => {
    const typed = this.enclosurePriceSignal();
    if (typed) return Number(typed);
    return this.suggestedEnclosure()?.price ?? null;
  });

  protected readonly canCalculate = computed(
    () =>
      this.form.valid &&
      this.unpricedRows().length === 0 &&
      (this.cameraRows().length > 0 || this.anprRows().length > 0),
  );

  ngOnInit(): void {
    this.boqs
      .list({ pageSize: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => this.quotations.set(page.items),
        error: () => this.error.set('Unable to load your quotations.'),
      });

    // Arriving from a quotation's own screen: ?quotation=<id> loads it straight in.
    const preset = this.route.snapshot.queryParamMap.get('quotation');
    if (preset) {
      this.quotationControl.setValue(preset);
      this.loadQuotation(preset);
    }
  }

  // ===== Loading a quotation =====

  protected onQuotationChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (!id) {
      this.loadedQuotation.set(null);
      this.cameraRows.set([]);
      return;
    }
    this.loadQuotation(id);
  }

  private loadQuotation(id: string): void {
    this.loadingQuotation.set(true);
    this.error.set(null);

    this.boqs
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (quotation) => {
          this.loadedQuotation.set(quotation);
          this.buildRowsFrom(quotation);
          this.loadingQuotation.set(false);
        },
        error: () => {
          this.error.set('Unable to load that quotation.');
          this.loadingQuotation.set(false);
        },
      });
  }

  /**
   * Turns the quotation's lines into camera groups.
   *
   * Cameras only. A quotation prices the whole job — cable, switches, the
   * recorder itself — and none of that fills a disk. Anything outside the CCTV
   * category is left out and reported, rather than silently sized as if it
   * recorded video.
   *
   * ANPR cameras are split off into their own block: they store number-plate
   * stills, not a continuous stream, so sizing them by bitrate would be wrong
   * by an order of magnitude.
   *
   * The same stock item can appear in several sections, so quantities are summed
   * per item rather than one row per line — the array does not care which floor
   * a camera is on.
   */
  private buildRowsFrom(quotation: Boq): void {
    const byItem = new Map<string, { label: string; count: number }>();

    for (const section of quotation.sections) {
      for (const line of section.lines) {
        if (!line.cameraId) continue;

        const existing = byItem.get(line.cameraId);
        if (existing) {
          existing.count += line.quantity;
        } else {
          byItem.set(line.cameraId, {
            label: this.describe(line.brand, line.itemName),
            count: line.quantity,
          });
        }
      }
    }

    const ids = [...byItem.keys()];
    if (ids.length === 0) {
      this.cameraRows.set([]);
      this.anprRows.set([]);
      this.recorderRows.set([]);
      this.design.set(null);
      return;
    }

    // Neither the bitrate nor the category is on the quotation line — both are
    // properties of the stock item — so the catalogue is read for them.
    this.cameras
      .list({ pageSize: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const catalogue = new Map<string, Camera>(page.items.map((item) => [item.id, item]));

          // Same page of the catalogue also tells us which disks are sellable and
          // what they cost, so the array is costed from real stock rather than a
          // list of sizes that includes disks nobody carries.
          this.stockedDisks.set(
            page.items
              .filter((item) => item.category === 'Storage')
              .map((item) => ({
                terabytes: capacityFromName(`${item.itemName} ${item.modelNo ?? ''}`),
                pricePerDisk: item.rate ?? null,
              }))
              .filter((disk): disk is { terabytes: number; pricePerDisk: number | null } =>
                disk.terabytes > 0,
              ),
          );

          this.stockedRecorders.set(
            page.items
              .filter((item) => item.category === 'Storage' && item.rate)
              .map((item) => ({
                channels: channelsFromName(`${item.itemName} ${item.modelNo ?? ''}`),
                price: item.rate as number,
              }))
              .filter((r) => r.channels > 0),
          );

          const cameras: CameraRow[] = [];
          const anpr: AnprRow[] = [];
          const recorders: { label: string; channels: number; count: number }[] = [];

          ids.forEach((id, index) => {
            const line = byItem.get(id)!;
            const item = catalogue.get(id);

            // Anything that is not a camera is dropped without comment. A
            // quotation prices the whole job — brackets, switches, conduit — and
            // none of it fills a disk, so listing what was left out only buries
            // the cameras under things nobody sizes.
            //
            // An item missing from the catalogue page is dropped on the same
            // terms: sizing storage for something we cannot identify would put a
            // number in front of a client that nothing backs up.
            // A recorder is not a camera and fills no disk, but the sheet has to
            // name it, so it is kept aside rather than dropped with the brackets
            // and conduit.
            const channels = item ? channelsFromName(item.itemName) : 0;
            if (channels > 0) {
              recorders.push({ label: line.label, channels, count: line.count });
              return;
            }

            // KPOI cameras record like any other, so they size like any other.
            // Filtering on Cctv alone dropped them silently and undersized the
            // array — the one failure mode this screen must not have.
            if (!item || (item.category !== 'Cctv' && item.category !== 'Kpoi')) return;

            // Matched loosely because the type is free text now. An exact
            // 'Anpr' test silently failed on "ANPR" or "ANPR Camera", and the
            // camera was then sized as continuous video — 3.09 TB against the
            // 0.78 TB it actually needs, which quietly overstates the array.
            if (/anpr|number\s*plate|lpr/i.test(item.type ?? '')) {
              anpr.push({
                key: `anpr-${index}-${id}`,
                label: line.label,
                count: line.count,
                // Dahua's own defaults until someone measures the real lane.
                kilobytesPerImage: 500,
                imagesPerEvent: 2,
                eventsPerDay: 7000,
              });
              return;
            }

            cameras.push({
              key: `cam-${index}-${id}`,
              label: line.label,
              count: line.count,
              // Defaulted rather than left blank, so a quotation can always be
              // sized. needsBitrate stays true either way: the row is usable but
              // the figure is ours, not the item's, and the screen says so.
              bitrateMbps: item.bitrateMbps ?? DEFAULT_BITRATE_MBPS,
              needsBitrate: item.bitrateMbps === null,
            });
          });

          this.cameraRows.set(cameras);
          this.anprRows.set(anpr);
          this.recorderRows.set(recorders);
          this.design.set(null);
        },
        error: () => this.error.set('Unable to read bitrates from the stock catalogue.'),
      });
  }

  /**
   * Brand and item name, without saying the brand twice — most item names
   * already begin with it ("Hikvision DS-2CD2183G0-I Dome").
   */
  private describe(brand: string | null, itemName: string): string {
    if (!brand) return itemName;
    return itemName.toLowerCase().startsWith(brand.toLowerCase())
      ? itemName
      : `${brand} ${itemName}`;
  }

  // ===== Row editing =====

  protected setCameraBitrate(index: number, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    const valid = Number.isFinite(value) && value > 0;

    this.cameraRows.update((rows) =>
      rows.map((row, i) =>
        i === index
          ? {
              ...row,
              bitrateMbps: valid ? value : null,
              // Typing a figure makes it theirs, so the "assumed" flag clears.
              // Clearing the field puts the row back to needing one.
              needsBitrate: valid ? false : row.needsBitrate,
            }
          : row,
      ),
    );
    this.design.set(null);
  }

  protected setCameraCount(index: number, event: Event): void {
    const value = Math.max(1, Math.round(Number((event.target as HTMLInputElement).value) || 1));
    this.cameraRows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, count: value } : row)),
    );
    this.design.set(null);
  }

  protected removeCameraRow(index: number): void {
    this.cameraRows.update((rows) => rows.filter((_, i) => i !== index));
    this.design.set(null);
  }

  protected addAnprRow(): void {
    this.anprRows.update((rows) => [
      ...rows,
      {
        key: `anpr-${Date.now()}`,
        label: 'ANPR',
        count: 1,
        // Dahua's own defaults: a plate crop plus an overview shot, half a
        // megabyte each, on a busy lane.
        kilobytesPerImage: 500,
        imagesPerEvent: 2,
        eventsPerDay: 7000,
      },
    ]);
    this.design.set(null);
  }

  protected setAnpr(index: number, field: keyof AnprRow, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = field === 'label' ? raw : Math.max(0, Number(raw) || 0);

    this.anprRows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
    this.design.set(null);
  }

  protected removeAnprRow(index: number): void {
    this.anprRows.update((rows) => rows.filter((_, i) => i !== index));
    this.design.set(null);
  }


  /**
   * The calculation request for what is on screen.
   *
   * Shared by Calculate and by the MOI sheet download so the two send the same
   * thing — built twice, they would drift and the document would stop matching
   * the screen it came from.
   */
  private buildRequest(): CalculateStorageRequest {
    const raw = this.form.getRawValue();
    return {
      retentionDays: raw.retentionDays,
      redundancy: raw.redundancy,
      filesystemFactor: raw.filesystemFactor,
      raidLevel: raw.raidLevel ? Number(raw.raidLevel) : null,
      failoverDays: raw.failoverDays,
      failoverCameras: raw.failoverCameras,
      recordingCodec: raw.recordingCodec,
      fps: raw.fps,
      motionPercent: raw.motionPercent,
      hddType: raw.hddType,
      recommendDiskTerabytes: raw.recommendDiskTerabytes ? Number(raw.recommendDiskTerabytes) : null,
      anprDiskTerabytes: raw.anprDiskTerabytes ? Number(raw.anprDiskTerabytes) : null,
      enclosurePricePerGroup: this.effectiveEnclosurePrice(),
      candidateDisks: this.stockedDisks().length
        ? this.stockedDisks()
        : DISK_SIZES.map((terabytes) => ({ terabytes, pricePerDisk: null })),
      baysPerGroup: Number(raw.baysPerGroup),
      hotSpareDisks: raw.hotSpareDisks,
      cameras: this.cameraRows().map((row) => ({
        label: row.label,
        count: row.count,
        bitrateMbps: row.bitrateMbps!,
      })),
      anpr: this.anprRows().map((row) => ({
        label: row.label,
        count: row.count,
        kilobytesPerImage: row.kilobytesPerImage,
        imagesPerEvent: row.imagesPerEvent,
        eventsPerDay: row.eventsPerDay,
      })),
      // No proposed array. The disks and groups are the answer now, so there
      // is nothing for the caller to put forward and nothing to grade.
      groups: [],
    };
  }

  // ===== MOI sheet download =====

  protected readonly downloading = signal(false);

  /**
   * Downloads the MOI sheet for what is currently on screen.
   *
   * Sends the same inputs the Calculate button sends and lets the server work
   * the figures out again, rather than posting the numbers back — a document and
   * the screen that produced it must not be able to disagree.
   */
  protected downloadSheet(): void {
    if (!this.design() || this.downloading()) return;

    this.downloading.set(true);
    const rec = this.sheetRecorder();

    this.storage
      .downloadSheet({
        projectName: this.loadedQuotation()?.projectName ?? null,
        revisionNo: 'REV.00',
        recorderLabel: rec?.label ?? null,
        recorderChannels: rec?.channels ?? 0,
        design: this.buildRequest(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Storage Calculation - ${this.loadedQuotation()?.projectName ?? 'sheet'}.pdf`;
          link.click();
          // Revoked on the next tick: revoking synchronously can cancel the
          // download in some browsers before it has read the blob.
          setTimeout(() => URL.revokeObjectURL(url), 0);
          this.downloading.set(false);
        },
        error: () => {
          this.error.set('Unable to build the MOI sheet.');
          this.downloading.set(false);
        },
      });
  }

  // ===== Calculate =====

  protected calculate(): void {
    if (!this.canCalculate()) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.buildRequest();

    this.calculating.set(true);
    this.error.set(null);

    this.storage
      .calculate(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (design) => {
          this.design.set(design);
          this.calculating.set(false);
        },
        error: (err: { error?: { errors?: string[] } }) => {
          this.error.set(err.error?.errors?.[0] ?? 'Unable to calculate the storage design.');
          this.calculating.set(false);
        },
      });
  }
}
