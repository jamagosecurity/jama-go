import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { DiaWriteRequest } from '../../../../models/dia.model';
import { DiaService } from '../../../../services/dia.service';
import { getApiErrorMessage } from '../../../../utils/api-error.util';
import {
  LATITUDE_LIMIT,
  LONGITUDE_LIMIT,
  formatCoordinates,
  looksLikeLink,
  mapPreviewUrl,
  parseCoordinates,
  toSitePin,
} from '../../../../utils/geo.util';
import { DIA_BASE_PATH } from '../dia-base-path';
import { DiaEmptyStateComponent, DiaSkeletonComponent } from '../shared/dia-shared.components';

const LOCATE_TIMEOUT_MS = 10_000;

function requiredTrimmed(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim().length ? null : { required: true };
}

/**
 * Coordinates are held as text rather than <input type="number"> so a pasted
 * "25.286106, 51.534817" can be split across the two fields instead of being
 * silently discarded by the browser, and so a scroll wheel over a focused field
 * cannot quietly move a site.
 */
function coordinate(limit: number): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value.trim();
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return { coordinate: true };
    return Math.abs(parsed) <= limit ? null : { coordinateRange: limit };
  };
}

/**
 * Group rules, mirroring SiteCoordinates on the API: a pin is either complete or
 * absent, and it is never (0, 0). Both are caught here so the admin is told
 * which box is wrong instead of getting a 400 back — and so a rejected pin is
 * never quietly dropped from an otherwise successful save.
 */
function sitePin(group: AbstractControl): ValidationErrors | null {
  const latitude = String(group.get('latitude')?.value ?? '').trim();
  const longitude = String(group.get('longitude')?.value ?? '').trim();
  if (!latitude !== !longitude) return { coordinatePair: latitude ? 'longitude' : 'latitude' };
  if (latitude && longitude && Number(latitude) === 0 && Number(longitude) === 0) {
    return { nullIsland: true };
  }
  return null;
}

@Component({
  selector: 'app-dia-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    DiaEmptyStateComponent,
    DiaSkeletonComponent,
  ],
  templateUrl: './dia-form.component.html',
  styleUrl: '../dia.styles.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly service = inject(DiaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  /** Portal this screen is mounted under — see DIA_BASE_PATH. */
  protected readonly base = inject(DIA_BASE_PATH);
  private readonly snackBar = inject(MatSnackBar);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = Boolean(this.id);
  protected readonly loading = signal(this.isEdit);
  protected readonly saving = signal(false);
  protected readonly locating = signal(false);
  protected readonly loadError = signal('');
  protected readonly saveError = signal('');
  protected readonly form = this.formBuilder.nonNullable.group(
    {
      diaNumber: ['', [Validators.required, requiredTrimmed, Validators.maxLength(100)]],
      clientNumber: ['', [Validators.required, requiredTrimmed, Validators.maxLength(100)]],
      clientName: ['', [Validators.required, requiredTrimmed, Validators.maxLength(200)]],
      clientLocation: ['', [Validators.required, requiredTrimmed, Validators.maxLength(300)]],
      latitude: ['', [coordinate(LATITUDE_LIMIT)]],
      longitude: ['', [coordinate(LONGITUDE_LIMIT)]],
    },
    { validators: sitePin },
  );

  /** Geolocation only exists in a browser, and only over HTTPS or on localhost. */
  protected readonly canLocate = this.isBrowser && 'geolocation' in navigator;

  ngOnInit(): void {
    if (this.id) this.load(this.id);
  }

  /** The pin as currently typed, or null while it is incomplete or invalid. */
  protected pin(): { latitude: number; longitude: number } | null {
    const { latitude, longitude } = this.form.getRawValue();
    return toSitePin(number(latitude), number(longitude));
  }

  /** Lets the admin check the pin on a map before committing the record. */
  protected previewUrl(): string {
    const pin = this.pin();
    return pin ? mapPreviewUrl(pin.latitude, pin.longitude) : '';
  }

  protected submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const pin = toSitePin(number(raw.latitude), number(raw.longitude));
    const request: DiaWriteRequest = {
      diaNumber: raw.diaNumber.trim(),
      clientNumber: raw.clientNumber.trim(),
      clientName: raw.clientName.trim(),
      clientLocation: raw.clientLocation.trim(),
      latitude: pin?.latitude ?? null,
      longitude: pin?.longitude ?? null,
    };
    this.saving.set(true);
    this.saveError.set('');
    this.form.disable();
    const operation = this.id ? this.service.update(this.id, request) : this.service.create(request);
    operation.pipe(finalize(() => {
      this.saving.set(false);
      this.form.enable();
    })).subscribe({
      next: () => {
        this.snackBar.open(`DIA ${this.isEdit ? 'updated' : 'created'} successfully.`, 'Dismiss', {
          duration: 3500,
        });
        void this.router.navigate([this.base, 'list']);
      },
      error: (error: unknown) =>
        this.saveError.set(getApiErrorMessage(error, `Unable to ${this.isEdit ? 'update' : 'create'} DIA.`)),
    });
  }

  /**
   * Admins pin sites by copying from a maps app, and what lands on the
   * clipboard is a whole link or a "lat, lng" pair rather than one number.
   * Pasting either into either box fills both, so nobody has to hand-split
   * coordinates — the commonest way to get a digit wrong.
   */
  protected pasteCoordinates(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    const pin = parseCoordinates(text);
    if (!pin) {
      // A shortened share link resolves to coordinates only once opened, so
      // dropping it into the box would leave a "not a number" error and no clue.
      if (looksLikeLink(text)) {
        event.preventDefault();
        this.snackBar.open(
          'That link carries no coordinates. Open it in Maps, long-press the pin, then copy the numbers.',
          'Dismiss',
          { duration: 6000 },
        );
      }
      return;
    }

    event.preventDefault();
    this.setPin(pin.latitude, pin.longitude);
    this.snackBar.open(`Pin set to ${formatCoordinates(pin.latitude, pin.longitude)}.`, 'Dismiss', {
      duration: 3000,
    });
  }

  /** For pinning a site while standing at its gate, on a phone or tablet. */
  protected useCurrentLocation(): void {
    if (!this.canLocate || this.locating()) return;
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locating.set(false);
        this.setPin(position.coords.latitude, position.coords.longitude);
        this.snackBar.open('Pin set to your current location.', 'Dismiss', { duration: 3000 });
      },
      (error) => {
        this.locating.set(false);
        this.snackBar.open(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Enter the coordinates manually.'
            : 'Could not read your location. Enter the coordinates manually.',
          'Dismiss',
          { duration: 5000 },
        );
      },
      { enableHighAccuracy: true, timeout: LOCATE_TIMEOUT_MS, maximumAge: 0 },
    );
  }

  protected clearPin(): void {
    this.form.patchValue({ latitude: '', longitude: '' });
    this.form.controls.latitude.markAsDirty();
    this.form.controls.longitude.markAsDirty();
  }

  protected retry(): void {
    if (this.id) this.load(this.id);
  }

  protected hasError(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  protected coordinateError(name: 'latitude' | 'longitude'): string {
    const control = this.form.controls[name];
    const label = name === 'latitude' ? 'Latitude' : 'Longitude';
    if (control.hasError('coordinate')) return `${label} must be a number.`;
    const limit = control.getError('coordinateRange') as number | undefined;
    return limit ? `${label} must be between -${limit} and ${limit}.` : '';
  }

  /**
   * Pin messages that belong to the pair rather than to one box: neither field
   * is wrong on its own, so Material has nothing to attach a mat-error to.
   */
  protected pinError(): string {
    const touched = this.form.controls.latitude.touched || this.form.controls.longitude.touched;
    if (!touched) return '';

    if (this.form.hasError('nullIsland')) {
      return '0, 0 is in the Atlantic — check the coordinates.';
    }
    const missing = this.form.getError('coordinatePair') as 'latitude' | 'longitude' | undefined;
    if (!missing) return '';
    return missing === 'latitude'
      ? 'Add a latitude too — a pin needs both halves.'
      : 'Add a longitude too — a pin needs both halves.';
  }

  private setPin(latitude: number, longitude: number): void {
    this.form.patchValue({ latitude: String(latitude), longitude: String(longitude) });
    this.form.controls.latitude.markAsDirty();
    this.form.controls.longitude.markAsDirty();
  }

  private load(id: string): void {
    this.loading.set(true);
    this.loadError.set('');
    this.service
      .getById(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (dia) =>
          this.form.setValue({
            diaNumber: dia.diaNumber,
            clientNumber: dia.clientNumber,
            clientName: dia.clientName,
            clientLocation: dia.clientLocation,
            latitude: dia.latitude == null ? '' : String(dia.latitude),
            longitude: dia.longitude == null ? '' : String(dia.longitude),
          }),
        error: (error: unknown) =>
          this.loadError.set(getApiErrorMessage(error, 'Unable to load this DIA record.')),
      });
  }
}

function number(value: string): number | null {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}
