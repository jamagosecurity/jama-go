import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, map, startWith } from 'rxjs';
import { AppSelectComponent } from '../../../components/app-select/app-select.component';
import { JobTechnician, NonMoiJob } from '../../../models/non-moi-job.model';
import { NonMoiJobService } from '../../../services/non-moi-job.service';
import { GeoService } from '../../../services/geo.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { minTrimmed, notBlank, phoneNumber } from '../../../utils/form-validators.util';
import {
  LATITUDE_LIMIT,
  LONGITUDE_LIMIT,
  formatCoordinates,
  isMapsLink,
  looksLikeLink,
  mapPreviewUrl,
  parseCoordinates,
  toSitePin,
} from '../../../utils/geo.util';
import { NON_MOI_JOBS_BASE_PATH } from './non-moi-jobs-base-path';

const DESCRIPTION_MAX = 2000;
const LOCATE_TIMEOUT_MS = 15_000;

/** Held as text, not type=number, so a pasted pair can be split across the two
 *  boxes and a scroll wheel cannot quietly move a site — as on the DIA form. */
function coordinate(limit: number): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value.trim();
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return { coordinate: true };
    return Math.abs(parsed) <= limit ? null : { coordinateRange: limit };
  };
}

/** A pin is complete or absent, and never (0, 0) — SiteCoordinates on the API. */
function sitePin(group: AbstractControl): ValidationErrors | null {
  const latitude = String(group.get('latitude')?.value ?? '').trim();
  const longitude = String(group.get('longitude')?.value ?? '').trim();
  if (!latitude !== !longitude) return { coordinatePair: latitude ? 'longitude' : 'latitude' };
  if (latitude && longitude && Number(latitude) === 0 && Number(longitude) === 0) return { nullIsland: true };
  return null;
}

type Field = 'customerName' | 'customerNumber' | 'customerEmail' | 'location' | 'descriptionEn' | 'descriptionAr' | 'assignedToId';

/** Issues or edits one Non-MOI job: who the customer is, where, what to do (in
 *  English and Arabic), and which technician gets it. */
@Component({
  selector: 'app-non-moi-job-editor',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AppSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './non-moi-job-editor.component.html',
  styleUrl: './non-moi-job-editor.component.css',
})
export class NonMoiJobEditorComponent implements OnInit {
  private readonly jobs = inject(NonMoiJobService);
  private readonly geo = inject(GeoService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly base = inject(NON_MOI_JOBS_BASE_PATH);

  protected readonly descriptionMax = DESCRIPTION_MAX;
  protected readonly canLocate = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  private readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly isEditing = signal(!!this.id);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly locating = signal(false);
  protected readonly formError = signal('');
  protected readonly pinNote = signal('');
  protected readonly technicians = signal<JobTechnician[]>([]);

  /** Only technicians with a working login can see a job in their portal, so
   *  only they are offered. */
  protected readonly technicianOptions = computed(() =>
    this.technicians().map((t) => ({ value: t.adminUserId, label: t.fullName })),
  );

  /** The Staff page lives in the admin portal only. */
  protected readonly canLinkStaff = this.base.startsWith('/admin');

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      customerName: ['', [notBlank, minTrimmed(2), Validators.maxLength(200)]],
      customerNumber: ['', [notBlank, phoneNumber, Validators.maxLength(30)]],
      customerEmail: ['', [Validators.email, Validators.maxLength(320)]],
      location: ['', [notBlank, minTrimmed(3), Validators.maxLength(300)]],
      latitude: ['', [coordinate(LATITUDE_LIMIT)]],
      longitude: ['', [coordinate(LONGITUDE_LIMIT)]],
      descriptionEn: ['', [notBlank, minTrimmed(3), Validators.maxLength(DESCRIPTION_MAX)]],
      descriptionAr: ['', Validators.maxLength(DESCRIPTION_MAX)],
      assignedToId: ['', Validators.required],
    },
    { validators: sitePin },
  );

  /** The form as typed, for the pin's own state and the character counters. */
  protected readonly values = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  );

  /** A usable pin, only once both halves are typed and valid. */
  protected readonly pin = computed(() => {
    const { latitude, longitude } = this.values();
    return latitude.trim() && longitude.trim() ? toSitePin(Number(latitude), Number(longitude)) : null;
  });

  ngOnInit(): void {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.form.valid) this.formError.set('');
    });

    this.jobs
      .technicians()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (staff) => {
          this.technicians.set(staff);
          this.loadJob();
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.formError.set(getApiErrorMessage(err, 'Could not load the technicians.'));
        },
      });
  }

  /** The list is small and already what the list page reads, so the one job is
   *  picked out of it rather than fetched on its own. */
  private loadJob(): void {
    if (!this.id) {
      this.loading.set(false);
      return;
    }
    this.jobs
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (all) => {
          const job = all.find((j) => j.id === this.id);
          if (!job) {
            this.formError.set('This job no longer exists — it may have been deleted.');
            return;
          }
          // A technician who has since left still has to show as the current
          // assignee, rather than leaving the field blank.
          if (!this.technicians().some((t) => t.adminUserId === job.assignedToId)) {
            this.technicians.update((t) => [
              ...t,
              { adminUserId: job.assignedToId, fullName: `${job.assignedToName} (no longer available)` },
            ]);
          }
          this.form.setValue({
            customerName: job.customerName,
            customerNumber: job.customerNumber,
            customerEmail: job.customerEmail ?? '',
            location: job.location,
            latitude: job.latitude == null ? '' : String(job.latitude),
            longitude: job.longitude == null ? '' : String(job.longitude),
            descriptionEn: job.descriptionEn,
            descriptionAr: job.descriptionAr ?? '',
            assignedToId: job.assignedToId,
          });
        },
        error: (err: unknown) => this.formError.set(getApiErrorMessage(err, 'Could not load this job.')),
      });
  }

  // ===== Site pin =====

  protected previewUrl(): string {
    const pin = this.pin();
    return pin ? mapPreviewUrl(pin.latitude, pin.longitude) : '';
  }

  /** What lands on the clipboard from a maps app is a whole link or a "lat, lng"
   *  pair, so pasting either into either box fills both. */
  protected pasteCoordinates(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    const pin = parseCoordinates(text);
    if (!pin) {
      // A phone's short share link holds no coordinates until it is opened: the server opens it for us.
      if (isMapsLink(text)) {
        event.preventDefault();
        this.resolveLink(text);
        return;
      }
      if (looksLikeLink(text)) {
        event.preventDefault();
        this.pinNote.set('That link carries no coordinates. Open it in Maps, long-press the pin, then copy the numbers.');
      }
      return;
    }
    event.preventDefault();
    this.setPin(pin.latitude, pin.longitude);
    this.pinNote.set(`Pin set to ${formatCoordinates(pin.latitude, pin.longitude)}.`);
  }

  /** Pasting a maps link into the location box pins the site too, so the link is never left sitting in the address. */
  protected pasteLocation(event: ClipboardEvent): void {
    const text = (event.clipboardData?.getData('text') ?? '').trim();
    if (!looksLikeLink(text)) return;     // ordinary address text pastes as usual

    const pin = parseCoordinates(text);
    if (pin) {
      event.preventDefault();
      this.setPin(pin.latitude, pin.longitude);
      this.pinNote.set(`Pin set to ${formatCoordinates(pin.latitude, pin.longitude)} from the link.`);
    } else if (isMapsLink(text)) {
      event.preventDefault();
      this.resolveLink(text);
    }
  }

  private resolveLink(url: string): void {
    this.pinNote.set('Reading the map link…');
    this.geo.resolve(url).subscribe({
      next: (pin) => {
        this.setPin(pin.latitude, pin.longitude);
        this.pinNote.set(`Pin set to ${formatCoordinates(pin.latitude, pin.longitude)}.`);
      },
      error: (error: unknown) => this.pinNote.set(getApiErrorMessage(error, 'Could not read that link.')),
    });
  }

  protected useCurrentLocation(): void {
    if (!this.canLocate || this.locating()) return;
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locating.set(false);
        this.setPin(position.coords.latitude, position.coords.longitude);
        this.pinNote.set('Pin set to your current location.');
      },
      (error) => {
        this.locating.set(false);
        this.pinNote.set(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Enter the coordinates manually.'
            : 'Could not read your location. Enter the coordinates manually.',
        );
      },
      { enableHighAccuracy: true, timeout: LOCATE_TIMEOUT_MS, maximumAge: 0 },
    );
  }

  protected clearPin(): void {
    this.form.patchValue({ latitude: '', longitude: '' });
    this.pinNote.set('');
  }

  private setPin(latitude: number, longitude: number): void {
    const pin = toSitePin(latitude, longitude);
    if (!pin) return;
    this.form.patchValue({ latitude: String(pin.latitude), longitude: String(pin.longitude) });
    this.form.controls.latitude.markAsDirty();
    this.form.controls.longitude.markAsDirty();
  }

  protected coordinateError(name: 'latitude' | 'longitude'): string {
    const control = this.form.controls[name];
    if (!control.touched && !control.dirty) return '';
    const label = name === 'latitude' ? 'Latitude' : 'Longitude';
    if (control.hasError('coordinate')) return `${label} must be a number.`;
    const limit = control.getError('coordinateRange') as number | undefined;
    return limit ? `${label} must be between -${limit} and ${limit}.` : '';
  }

  /** Messages that belong to the pair rather than to one box. */
  protected pinError(): string {
    const touched = this.form.controls.latitude.touched || this.form.controls.longitude.touched;
    if (!touched) return '';
    if (this.form.hasError('nullIsland')) return '0, 0 is in the Atlantic — check the coordinates.';
    const missing = this.form.getError('coordinatePair') as 'latitude' | 'longitude' | undefined;
    if (!missing) return '';
    return missing === 'latitude' ? 'Add the latitude too — a pin needs both.' : 'Add the longitude too — a pin needs both.';
  }

  // ===== Validation display + save =====

  protected showError(field: Field): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  protected errorFor(field: Field, label: string): string {
    const errors = this.form.controls[field].errors ?? {};
    if (errors['required']) return `${label} is required.`;
    if (errors['phone']) return `${label} must be a valid phone number — 6 to 15 digits, e.g. +974 5550 1234.`;
    if (errors['minlength']) return `${label} must be at least ${errors['minlength'].requiredLength} characters.`;
    if (errors['maxlength']) return `${label} must be ${errors['maxlength'].requiredLength} characters or fewer.`;
    return `Check the ${label.toLowerCase()}.`;
  }

  protected save(event: Event): void {
    event.preventDefault();
    if (this.saving()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.formError.set('Fix the highlighted fields first.');
      return;
    }

    const value = this.form.getRawValue();
    const pin = toSitePin(Number(value.latitude), Number(value.longitude));
    const payload = {
      customerName: value.customerName.trim(),
      customerNumber: value.customerNumber.trim(),
      customerEmail: value.customerEmail.trim() || null,
      location: value.location.trim(),
      latitude: value.latitude.trim() && pin ? pin.latitude : null,
      longitude: value.longitude.trim() && pin ? pin.longitude : null,
      descriptionEn: value.descriptionEn.trim(),
      descriptionAr: value.descriptionAr.trim() || null,
      assignedToId: value.assignedToId,
    };

    this.saving.set(true);
    this.formError.set('');
    const request = this.id ? this.jobs.update(this.id, payload) : this.jobs.create(payload);

    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => this.returnToList(saved, !this.id),
      error: (err: unknown) => this.formError.set(getApiErrorMessage(err, 'Could not save this job.')),
    });
  }

  /** Back to the list, which confirms and highlights the row just written. */
  private returnToList(saved: NonMoiJob, created: boolean): void {
    void this.router.navigate([this.base], {
      state: { savedId: saved.id, savedName: `${saved.jobNumber} (${saved.assignedToName})`, created },
    });
  }
}
