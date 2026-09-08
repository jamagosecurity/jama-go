import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApprovalBellComponent } from '../../../components/approval-bell/approval-bell.component';
import { PERMISSIONS } from '../../../models/auth.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-staff-layout',
  standalone: true,
  imports: [ApprovalBellComponent, RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-layout.component.html',
  styleUrl: './staff-layout.component.css',
})
export class StaffLayoutComponent {
  readonly auth = inject(AuthService);

  /** Drives the DIA nav item. currentUser is a signal, so revoking the grant
   *  removes the link on the next session refresh without a reload. */
  readonly canUploadDia = computed(() => this.auth.can(PERMISSIONS.diaUpload));

  /**
   * Same for the BOQ screens. Hiding the link is a courtesy — the route guard
   * and every endpoint check the grant themselves.
   *
   * Either grant opens them: an approver has to reach a quotation to decide on
   * it, and gating the only link on the BUILD permission left an approve-only
   * account with a portal that led nowhere near the thing it was granted for.
   */
  readonly canSeeBoq = computed(
    () => this.auth.can(PERMISSIONS.boqManage) || this.auth.can(PERMISSIONS.boqApprove),
  );

  /**
   * Building specifically, which is what the storage calculator belongs to —
   * sizing an array is part of quoting for it, not part of deciding on one.
   */
  readonly canBuildBoq = computed(() => this.auth.can(PERMISSIONS.boqManage));

  /** And for the stock inventory. Without this the permission was grantable but
   *  invisible: nothing in the staff portal led to the screens it unlocks. */
  readonly canManageCameras = computed(() => this.auth.can(PERMISSIONS.cameraManage));

  /** Same shape as canSeeBoq, for the drawings module — either grant reaches
   *  it, since an approver has to open a drawing to decide on it too. */
  readonly canSeeDrawings = computed(
    () => this.auth.can(PERMISSIONS.drawingManage) || this.auth.can(PERMISSIONS.drawingApprove),
  );

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
