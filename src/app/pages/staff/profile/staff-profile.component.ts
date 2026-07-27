import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminStaffMember } from '../../../models/staff.model';
import { AuthService } from '../../../services/auth.service';
import { StaffService } from '../../../services/staff.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

@Component({
  selector: 'app-staff-profile',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-profile.component.html',
  styleUrl: '../staff.styles.css',
})
export class StaffProfileComponent {
  readonly auth = inject(AuthService);
  private readonly staffService = inject(StaffService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<AdminStaffMember | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal(false);

  fullName = '';
  responsibility = '';

  constructor() {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);

    this.staffService
      .getMine()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.fullName = profile.fullName;
          this.responsibility = profile.responsibility ?? '';
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

    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);

    this.staffService
      .updateMine({ fullName: this.fullName.trim(), responsibility: this.responsibility.trim() })
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
