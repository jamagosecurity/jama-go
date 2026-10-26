import { Component, ChangeDetectionStrategy, OnInit, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApprovalBellComponent } from '../../../components/approval-bell/approval-bell.component';
import { PERMISSIONS } from '../../../models/auth.model';
import { AuthService } from '../../../services/auth.service';
import { ClientRegistrationService } from '../../../services/client-registration.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [ApprovalBellComponent, RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  /** Drives the waiting-count badge on the Client Registrations row. */
  readonly registrations = inject(ClientRegistrationService);

  ngOnInit(): void {
    this.registrations.refreshPendingCount();
  }

  /** VIP nav is permission-gated; admins hold vip.manage implicitly. */
  readonly canManageVip = computed(() => this.auth.can(PERMISSIONS.vipManage));

  readonly initials = computed(() => {
    const name = this.auth.currentUser()?.fullName?.trim() || 'Admin';
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
