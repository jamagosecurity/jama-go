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

  /** Same for the BOQ screens. Hiding the link is a courtesy — the route guard
   *  and every endpoint check boq.manage themselves. */
  readonly canBuildBoq = computed(() => this.auth.can(PERMISSIONS.boqManage));

  /** And for the stock inventory. Without this the permission was grantable but
   *  invisible: nothing in the staff portal led to the screens it unlocks. */
  readonly canManageCameras = computed(() => this.auth.can(PERMISSIONS.cameraManage));

  readonly initials = computed(() => {
    const name = this.auth.currentUser()?.fullName?.trim() || 'Staff';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  });


  logout(): void {
    this.auth.logout();
  }
}
