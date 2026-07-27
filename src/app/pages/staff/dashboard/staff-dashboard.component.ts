import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { StaffService } from '../../../services/staff.service';
import { AdminStaffMember } from '../../../models/staff.model';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-dashboard.component.html',
  styleUrl: '../staff.styles.css',
})
export class StaffDashboardComponent {
  private readonly staffService = inject(StaffService);
  readonly auth = inject(AuthService);

  readonly profile = signal<AdminStaffMember | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.staffService.getMine().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('We could not load your profile right now.');
        this.loading.set(false);
      },
    });
  }
}
