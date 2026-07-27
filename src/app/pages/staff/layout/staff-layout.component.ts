import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PERMISSIONS } from '../../../models/auth.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-staff-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-layout.component.html',
  styleUrl: './staff-layout.component.css',
})
export class StaffLayoutComponent {
  readonly auth = inject(AuthService);

  /** Drives the DIA nav item. currentUser is a signal, so revoking the grant
   *  removes the link on the next session refresh without a reload. */
  readonly canUploadDia = computed(() => this.auth.can(PERMISSIONS.diaUpload));

  readonly initials = computed(() => {
    const name = this.auth.currentUser()?.fullName?.trim() || 'Staff';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  });

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  });

  logout(): void {
    this.auth.logout();
  }
}
