import { Component, ChangeDetectionStrategy, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApprovalBellComponent } from '../../../components/approval-bell/approval-bell.component';
import { PERMISSIONS } from '../../../models/auth.model';
import { AuthService } from '../../../services/auth.service';
import { NonMoiJobBadgeService } from '../../../services/non-moi-job-badge.service';
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
  /** Finished Non-MOI jobs waiting for this administrator to close — the red number beside Non-MOI Jobs. */
  readonly jobBadge = inject(NonMoiJobBadgeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** On a phone the sidebar is a drawer behind the menu button; on a desktop
   *  it is always on screen and this is never set. */
  readonly menuOpen = signal(false);

  /** Which sidebar groups (Inventory, Quotation, Drawings) show their sub-links.
   *  The group you are working in opens itself; the arrow opens or closes the rest. */
  readonly openGroups = signal<ReadonlySet<string>>(new Set());
  private readonly groupRoutes: Record<string, RegExp> = {
    inventory: /^\/admin\/(cameras|non-moi)(\/|\?|$)/,
    quotation: /^\/admin\/boq(\/|\?|$)/,
    drawings: /^\/admin\/drawings(\/|\?|$)/,
  };

  isOpen(key: string): boolean {
    return this.openGroups().has(key);
  }

  toggleGroup(key: string): void {
    this.openGroups.update((open) => {
      const next = new Set(open);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  private revealCurrentGroup(url: string): void {
    const current = Object.keys(this.groupRoutes).filter((key) => this.groupRoutes[key].test(url));
    if (current.length) this.openGroups.update((open) => new Set([...open, ...current]));
  }

  ngOnInit(): void {
    this.registrations.refreshPendingCount();
    this.jobBadge.start();

    // Picking a page in the drawer should land on that page, not leave the
    // drawer covering it.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe((e) => {
        this.menuOpen.set(false);
        this.jobBadge.refresh();
        this.revealCurrentGroup((e as NavigationEnd).urlAfterRedirects);
      });
    this.revealCurrentGroup(this.router.url);
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

  @HostListener('document:keydown.escape')
  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
  }
}
