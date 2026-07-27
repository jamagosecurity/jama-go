import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

@Component({
  selector: 'app-staff-change-password',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-change-password.component.html',
  styleUrl: '../staff.styles.css',
})
export class StaffChangePasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal(false);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  /** Client-side mirror of the server's password policy, for immediate feedback. */
  get passwordProblem(): string | null {
    if (!this.newPassword) {
      return null;
    }
    if (this.newPassword.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (!/[A-Z]/.test(this.newPassword)) {
      return 'Password must include an uppercase letter.';
    }
    if (!/[a-z]/.test(this.newPassword)) {
      return 'Password must include a lowercase letter.';
    }
    if (!/[0-9]/.test(this.newPassword)) {
      return 'Password must include a number.';
    }
    if (this.currentPassword && this.newPassword === this.currentPassword) {
      return 'New password must be different from your current password.';
    }
    return null;
  }

  get mismatch(): boolean {
    return !!this.confirmPassword && this.newPassword !== this.confirmPassword;
  }

  get canSubmit(): boolean {
    return (
      !this.saving()
      && !!this.currentPassword
      && !!this.newPassword
      && !this.passwordProblem
      && !this.mismatch
      && this.newPassword === this.confirmPassword
    );
  }

  submit(event: Event): void {
    event.preventDefault();

    if (!this.canSubmit) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);

    this.auth
      .changePassword({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.saved.set(true);
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        },
        error: (error: unknown) =>
          this.error.set(getApiErrorMessage(error, 'Could not change your password.')),
      });
  }
}
