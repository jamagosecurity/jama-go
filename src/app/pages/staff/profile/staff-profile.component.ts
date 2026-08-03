import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminStaffMember } from '../../../models/staff.model';
import { AuthService } from '../../../services/auth.service';
import { StaffService } from '../../../services/staff.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { fieldErrorMessage, shouldShowError } from '../../../utils/form-validators.util';

@Component({
  selector: 'app-staff-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-profile.component.html',
  styleUrl: '../staff.styles.css',
})
export class StaffProfileComponent {
  readonly auth = inject(AuthService);
  private readonly staffService = inject(StaffService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<AdminStaffMember | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    responsibility: ['', [Validators.maxLength(1000)]],
  });

  private static readonly LABELS: Record<string, string> = {
    fullName: 'Full name',
    responsibility: 'Responsibility',
  };

  showError(name: string): boolean {
    return shouldShowError(this.form.get(name));
  }

  errorFor(name: string): string {
    return fieldErrorMessage(
      this.form.get(name),
      StaffProfileComponent.LABELS[name] ?? 'This field',
    );
  }

  constructor() {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);
    // Disabled through the control rather than a [disabled] binding, which
    // Angular warns about on a reactive control and which fights the form state.
    this.form.disable({ emitEvent: false });

    this.staffService
      .getMine()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.form.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.form.patchValue({
            fullName: profile.fullName,
            responsibility: profile.responsibility ?? '',
          });
          // Reloaded after a successful save, so the form is clean again and
          // stale validation messages should not linger.
          this.form.markAsPristine();
          this.form.markAsUntouched();
        },
        error: (error: unknown) =>
          this.error.set(getApiErrorMessage(error, 'Could not load your profile.')),
      });
  }

  save(event: Event): void {
    event.preventDefault();

    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);

    const value = this.form.getRawValue();

    this.staffService
      .updateMine({ fullName: value.fullName.trim(), responsibility: value.responsibility.trim() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.saved.set(true);
          // Refresh the cached session so the portal header shows the new name.
          this.auth.validateSession().subscribe({ error: () => undefined });
          this.loadProfile();
        },
        error: (error: unknown) =>
          this.error.set(getApiErrorMessage(error, 'Could not save your profile.')),
      });
  }
}
