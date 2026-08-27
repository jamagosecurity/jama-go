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
  CalculateStorageRequest,
  DISK_SIZES,
  RAID_LEVELS,
  StorageDesign,
} from '../../../models/storage-design.model';
import { BoqService } from '../../../services/boq.service';
import { CameraService } from '../../../services/camera.service';
import { StorageDesignService } from '../../../services/storage-design.service';

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

interface GroupRow {
  key: string;
  label: string;
  totalDisks: number;
  diskTerabytes: number;
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

  protected readonly quotations = signal<BoqListItem[]>([]);
  protected readonly loadedQuotation = signal<Boq | null>(null);
  protected readonly loadingQuotation = signal(false);

  protected readonly cameraRows = signal<CameraRow[]>([]);
  protected readonly anprRows = signal<AnprRow[]>([]);
  protected readonly groupRows = signal<GroupRow[]>([
    { key: 'grp-1', label: 'GRP-1', totalDisks: 8, diskTerabytes: 16 },
  ]);

  /** Non-camera lines from the quotation, listed so their absence is visible. */
  protected readonly skipped = signal<string[]>([]);

  protected readonly design = signal<StorageDesign | null>(null);
  protected readonly calculating = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly quotationControl = new FormControl<string>('', { nonNullable: true });

  protected readonly form = this.formBuilder.nonNullable.group({
    retentionDays: [120, [Validators.required, Validators.min(1), Validators.max(3650)]],
    redundancy: [1.06, [Validators.required, Validators.min(1), Validators.max(3)]],
    filesystemFactor: [0.9, [Validators.required, Validators.min(0.5), Validators.max(1)]],
    raidLevel: [5, Validators.required],
    failoverDays: [30, [Validators.min(0), Validators.max(3650)]],
    failoverCameras: [0, [Validators.min(0)]],
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

  protected readonly raidLevelValue = computed(() => this.raidLevelSignal());
  protected readonly retentionValue = computed(() => this.retentionSignal());

  /** Cameras across every row — the headline count, not the number of rows. */
  protected readonly cameraCount = computed(() =>
    this.cameraRows().reduce((total, row) => total + row.count, 0),
  );

  /** Bar width. Clamped, so 400% coverage does not paint four bars wide. */
  protected coverageWidth(percent: number): number {
    return Math.max(0, Math.min(100, percent));
  }

  /** Rows that cannot be sized until someone gives them a bitrate. */
  protected readonly unpricedRows = computed(() =>
    this.cameraRows().filter((row) => !row.bitrateMbps || row.bitrateMbps <= 0),
  );

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
      this.skipped.set([]);
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

          const cameras: CameraRow[] = [];
          const anpr: AnprRow[] = [];
          const skipped: string[] = [];

          ids.forEach((id, index) => {
            const line = byItem.get(id)!;
            const item = catalogue.get(id);

            // An item missing from the catalogue page is not assumed to be a
            // camera: sizing storage for something we cannot identify would put
            // a number in front of a client that nothing backs up.
            if (!item || item.category !== 'Cctv') {
              skipped.push(line.label);
              return;
            }

            if (item.type === 'Anpr') {
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
              bitrateMbps: item.bitrateMbps ?? null,
              needsBitrate: item.bitrateMbps === null,
            });
          });

          this.cameraRows.set(cameras);
          this.anprRows.set(anpr);
          this.skipped.set(skipped);
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
    this.cameraRows.update((rows) =>
      rows.map((row, i) =>
        i === index ? { ...row, bitrateMbps: Number.isFinite(value) && value > 0 ? value : null } : row,
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

  protected addGroupRow(): void {
    this.groupRows.update((rows) => [
      ...rows,
      {
        key: `grp-${Date.now()}`,
        label: `GRP-${rows.length + 1}`,
        totalDisks: 8,
        diskTerabytes: rows.at(-1)?.diskTerabytes ?? 16,
      },
    ]);
    this.design.set(null);
  }

  protected setGroup(index: number, field: keyof GroupRow, event: Event): void {
    const raw = (event.target as HTMLInputElement | HTMLSelectElement).value;
    const value = field === 'label' ? raw : Math.max(0, Number(raw) || 0);

    this.groupRows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
    this.design.set(null);
  }

  protected removeGroupRow(index: number): void {
    this.groupRows.update((rows) => rows.filter((_, i) => i !== index));
    this.design.set(null);
  }

  // ===== Calculate =====

  protected calculate(): void {
    if (!this.canCalculate()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const request: CalculateStorageRequest = {
      retentionDays: raw.retentionDays,
      redundancy: raw.redundancy,
      filesystemFactor: raw.filesystemFactor,
      raidLevel: Number(raw.raidLevel),
      failoverDays: raw.failoverDays,
      failoverCameras: raw.failoverCameras,
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
      groups: this.groupRows().map((row) => ({
        label: row.label,
        totalDisks: row.totalDisks,
        diskTerabytes: row.diskTerabytes,
      })),
    };

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
