import { AvatarComponent } from '../../../components/avatar/avatar.component';
import { ProfileLauncher } from '../../../components/profile-dialog/profile-launcher.service';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApprovalBellComponent } from '../../../components/approval-bell/approval-bell.component';
import { PERMISSIONS } from '../../../models/auth.model';
import { AuthService } from '../../../services/auth.service';
import { NonMoiJobBadgeService } from '../../../services/non-moi-job-badge.service';

@Component({
  selector: 'app-staff-layout',
  standalone: true,
  imports: [ApprovalBellComponent, AvatarComponent, RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-layout.component.html',
  styleUrl: './staff-layout.component.css',
})
export class StaffLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly profile = inject(ProfileLauncher);

  /** Keyboard users reach the profile page the same way a click does. */
  openProfilePage(url: string): void {
    void this.profileRouter.navigateByUrl(url);
  }
  private readonly profileRouter = inject(Router);
  /** Finished Non-MOI jobs waiting for this person to close — the red number beside Non-MOI Jobs. */
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
    inventory: /^\/staff\/(cameras|non-moi)(\/|\?|$)/,
    quotation: /^\/staff\/boq(\/|\?|$)/,
    drawings: /^\/staff\/drawings(\/|\?|$)/,
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
    if (this.canIssueJobs()) this.jobBadge.start();
    // Picking a page in the drawer should land on that page, not leave the
    // drawer covering it.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe((e) => {
        this.menuOpen.set(false);
        if (this.canIssueJobs()) this.jobBadge.refresh();
        this.revealCurrentGroup((e as NavigationEnd).urlAfterRedirects);
      });
    this.revealCurrentGroup(this.router.url);
  }

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

  /** Same shape as canManageCameras — vip.manage was grantable to a staff
   *  account with no staff-portal link leading to it. */
  readonly canManageVip = computed(() => this.auth.can(PERMISSIONS.vipManage));

  /** Same shape as canSeeBoq, for the drawings module — either grant reaches
   *  it, since an approver has to open a drawing to decide on it too. */
  readonly canSeeDrawings = computed(
    () => this.auth.can(PERMISSIONS.drawingManage) || this.auth.can(PERMISSIONS.drawingApprove),
  );

  /** Drives the nav subtitle only — the Maintenance link itself has no
   *  permission guard, since every staff account can log and track its own
   *  tickets the same as a client can. */
  readonly canManageMaintenance = computed(() => this.auth.can(PERMISSIONS.maintenanceManage));

  /** The Non-MOI Jobs link: its own grant now, which maintenance.manage implies. */
  readonly canIssueJobs = computed(() => this.auth.can(PERMISSIONS.nonMoiJobManage));

  /** The Company mail link — read-only for staff. */
  readonly canReadMail = computed(() => this.auth.can(PERMISSIONS.mailRead));

  readonly initials = computed(() => {
    const name = this.auth.currentUser()?.fullName?.trim() || 'Staff';
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
