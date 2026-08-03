import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import {
  fieldErrorMessage,
  fieldsDiffer,
  fieldsMatch,
  shouldShowError,
  strongPassword,
} from '../../../utils/form-validators.util';

@Component({
  selector: 'app-staff-change-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-change-password.component.html',
  styleUrl: '../staff.styles.css',
})
export class StaffChangePasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal(false);

  /**
   * The password policy used to be spelled out a fourth time here, as a getter
   * returning a string. It now comes from the shared strongPassword validator,
   * which is the single client-side mirror of Common/PasswordRules on the API.
   */
  readonly form = this.formBuilder.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, strongPassword]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [
        fieldsMatch('newPassword', 'confirmPassword'),
        fieldsDiffer('newPassword', 'currentPassword'),
      ],
    },
  );

  private static readonly LABELS: Record<string, string> = {
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirmation',
  };

  showError(name: string): boolean {
    return shouldShowError(this.form.get(name));
  }

  errorFor(name: string): string {
    return fieldErrorMessage(
      this.form.get(name),
      StaffChangePasswordComponent.LABELS[name] ?? 'This field',
    );
  }

  /** Group-level problems, shown once the user has engaged with the fields. */
  get formProblem(): string | null {
    if (!this.form.touched && !this.form.dirty) return null;
    if (this.form.hasError('fieldsMismatch')) return 'The two passwords do not match.';
    if (this.form.hasError('fieldsIdentical')) {
      return 'New password must be different from your current password.';
    }
    return null;
  }

  submit(event: Event): void {
    event.preventDefault();
    if (this.saving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);

    const value = this.form.getRawValue();

    this.auth
      .changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.saved.set(true);
          this.form.reset();
        },
        error: (error: unknown) =>
          this.error.set(getApiErrorMessage(error, 'Could not change your password.')),
      });
  }
}
