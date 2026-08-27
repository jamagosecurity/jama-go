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
import {
  CAMERA_TYPES,
  Camera,
  CameraType,
  CameraTypeCount,
  brandInitials,
  cameraTypeLabel,
  matchCameraBrand,
} from '../../models/camera.model';
import { CameraService } from '../../services/camera.service';
import { getApiErrorMessage } from '../../utils/api-error.util';

/**
 * The public camera catalogue.
 *
 * READ ONLY, on purpose. Prices are fixed in the admin panel; this page shows
 * what is in stock and what it costs and offers no way to change either. The
 * API agrees — its write routes require camera.manage, so a visitor could not
 * edit a price even by calling it directly.
 *
 * Laid out one section per camera type: open Bullet to see every bullet camera,
 * open ANPR to see the ANPR ones. Each section loads its own items the first
 * time it is opened rather than the page fetching the whole catalogue up front.
 */
@Component({
  selector: 'app-camera-catalogue',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './camera-catalogue.component.html',
  styleUrl: './camera-catalogue.component.css',
})
export class CameraCatalogueComponent implements OnInit {
  private readonly service = inject(CameraService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly typeLabel = cameraTypeLabel;
  protected readonly brandLogo = matchCameraBrand;
  protected readonly brandInitials = brandInitials;

  protected readonly counts = signal<CameraTypeCount[]>([]);
  protected readonly loadingCounts = signal(true);
  protected readonly error = signal('');

  /** Which sections are open. */
  protected readonly open = signal<ReadonlySet<CameraType>>(new Set());

  /** Items per type, filled the first time a section is opened. */
  protected readonly itemsByType = signal<Record<string, Camera[]>>({});
  protected readonly loadingTypes = signal<ReadonlySet<CameraType>>(new Set());

  /** Only types that actually have stock get a section — an empty "Fisheye"
   *  heading is a dead end for someone browsing. */
  protected readonly sections = computed(() => {
    const counts = this.counts();
    return CAMERA_TYPES.map((option) => ({
      type: option.value,
      label: option.label,
      count: counts.find((c) => c.type === option.value),
    })).filter((section) => (section.count?.itemCount ?? 0) > 0);
  });

  protected readonly totalItems = computed(() =>
    this.counts().reduce((sum, c) => sum + c.itemCount, 0),
  );

  ngOnInit(): void {
    this.loadCounts();
  }

  private loadCounts(): void {
    this.loadingCounts.set(true);
    this.error.set('');

    this.service
      .typeCounts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (counts) => {
          this.counts.set(counts);
          this.loadingCounts.set(false);

          // Open the first section that has anything in it, so the page never
          // greets a visitor with nothing but closed headings.
          const first = this.sections()[0];
          if (first) this.toggle(first.type);
        },
        error: (err: unknown) => {
          this.error.set(getApiErrorMessage(err, 'Unable to load the catalogue.'));
          this.loadingCounts.set(false);
        },
      });
  }

  protected isOpen(type: CameraType): boolean {
    return this.open().has(type);
  }

  protected isLoading(type: CameraType): boolean {
    return this.loadingTypes().has(type);
  }

  protected itemsFor(type: CameraType): Camera[] {
    return this.itemsByType()[type] ?? [];
  }

  protected toggle(type: CameraType): void {
    const open = new Set(this.open());

    if (open.has(type)) {
      open.delete(type);
      this.open.set(open);
      return;
    }

    open.add(type);
    this.open.set(open);

    // Fetched once and kept: reopening a section should be instant.
    if (this.itemsByType()[type]) return;
    this.loadType(type);
  }

  private loadType(type: CameraType): void {
    this.loadingTypes.update((current) => new Set(current).add(type));

    this.service
      .list({ pageNumber: 1, pageSize: 100, type })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.itemsByType.update((current) => ({ ...current, [type]: page.items }));
          this.clearLoading(type);
        },
        error: (err: unknown) => {
          this.error.set(getApiErrorMessage(err, 'Unable to load that section.'));
          this.clearLoading(type);
        },
      });
  }

  private clearLoading(type: CameraType): void {
    this.loadingTypes.update((current) => {
      const next = new Set(current);
      next.delete(type);
      return next;
    });
  }

  /** Rate less its discount — what the item actually sells for. Null when no
   *  price has been set, which shows as "On request" rather than as zero. */
  protected sellingPrice(item: Camera): number | null {
    if (item.rate === null) return null;
    const discount = item.discount ?? 0;
    return Math.round(item.rate * (1 - discount / 100) * 100) / 100;
  }

  protected retry(): void {
    this.loadCounts();
  }
}
