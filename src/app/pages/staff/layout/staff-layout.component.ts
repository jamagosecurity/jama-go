import { AvatarComponent } from '../../../components/avatar/avatar.component';
import { ProfileLauncher } from '../../../components/profile-dialog/profile-launcher.service';
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
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
export class StaffLayoutComponent implements OnInit, AfterViewInit {
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

  /** Desktop: the sidebar hidden so the page gets the full width. Remembered on this browser (shared with the admin console). */
  readonly collapsed = signal(StaffLayoutComponent.readCollapsed());

  toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try { localStorage.setItem('jg-sidebar-collapsed', next ? '1' : '0'); } catch { /* private window: just not remembered */ }
  }

  private static readCollapsed(): boolean {
    try { return typeof localStorage !== 'undefined' && localStorage.getItem('jg-sidebar-collapsed') === '1'; } catch { return false; }
  }

  // ===== Page name in the top bar (read from the page's own heading) =====
  readonly pageTitle = signal('');
  /** Collections lives under Non-MOI Jobs' address; only one of the two links should light up. */
  readonly onCollections = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    const content = (this.host.nativeElement as HTMLElement).querySelector('.staff-content');
    if (!content || typeof MutationObserver === 'undefined') return;
    let queued = false;
    const read = () => {
      queued = false;
      const text = (content.querySelector('h1')?.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (text !== this.pageTitle()) this.pageTitle.set(text);
    };
    const observer = new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(read); } });
    observer.observe(content, { childList: true, subtree: true, characterData: true });
    read();
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  // ===== Search screens (Ctrl K): only the screens this person can open =====
  readonly screens = computed(() => {
    const list: { label: string; group: string; url: string; query?: Record<string, string> }[] = [];
    if (this.canUploadDia()) list.push({ label: 'DIA Inspection', group: 'MOI', url: '/staff/dia' });
    if (this.canManageCameras()) list.push({ label: 'Moi Inventory', group: 'MOI', url: '/staff/cameras' });
    if (this.canIssueJobs()) list.push(
      { label: 'Non-MOI Jobs', group: 'Non-MOI', url: '/staff/non-moi-jobs' },
      { label: 'Issue a Non-MOI job', group: 'Non-MOI', url: '/staff/non-moi-jobs/new' },
      { label: 'Non-MOI Inventory', group: 'Non-MOI', url: '/staff/non-moi' },
      { label: 'Collections (cash & online)', group: 'Non-MOI', url: '/staff/non-moi-jobs/collections' },
    );
    if (this.canSeeBoq()) list.push({ label: 'Quotation', group: 'Quotations & documents', url: '/staff/boq' });
    if (this.canSeeDrawings()) list.push({ label: 'Drawings', group: 'Quotations & documents', url: '/staff/drawings' });
    if (this.canManageVip()) list.push({ label: 'VIP Clients', group: 'Quotations & documents', url: '/staff/vip' });
    if (this.canReadMail()) list.push({ label: 'Company mail', group: 'Communication', url: '/staff/mail' });
    list.push({ label: 'My profile', group: 'Account', url: '/staff/profile' });
    return list;
  });
  readonly screenQuery = signal('');
  readonly screenOpen = signal(false);
  readonly screenActive = signal(0);
  readonly screenMatches = computed(() => {
    const q = this.screenQuery().trim().toLowerCase();
    return q ? this.screens().filter((s) => (s.label + ' ' + s.group).toLowerCase().includes(q)) : this.screens();
  });

  @HostListener('document:keydown', ['$event'])
  onShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      document.querySelector<HTMLInputElement>('.staff-screen-search input')?.focus();
    }
  }

  onScreenKey(event: KeyboardEvent): void {
    const n = this.screenMatches().length;
    if (event.key === 'ArrowDown') { event.preventDefault(); this.screenActive.set(n ? (this.screenActive() + 1) % n : 0); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); this.screenActive.set(n ? (this.screenActive() - 1 + n) % n : 0); }
    else if (event.key === 'Enter') { const pick = this.screenMatches()[this.screenActive()]; if (pick) this.goScreen(pick); }
    else if (event.key === 'Escape') { this.screenOpen.set(false); (event.target as HTMLInputElement).blur(); }
  }

  goScreen(screen: { url: string; query?: Record<string, string> }): void {
    this.screenOpen.set(false);
    this.screenQuery.set('');
    (document.activeElement as HTMLElement | null)?.blur();
    void this.router.navigate([screen.url], { queryParams: screen.query });
  }

  closeScreensSoon(): void {
    setTimeout(() => this.screenOpen.set(false), 150);
  }

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
        this.onCollections.set((e as NavigationEnd).urlAfterRedirects.startsWith('/staff/non-moi-jobs/collections'));
      });
    this.revealCurrentGroup(this.router.url);
    this.onCollections.set(this.router.url.startsWith('/staff/non-moi-jobs/collections'));
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
