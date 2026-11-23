import { AvatarComponent } from '../../../components/avatar/avatar.component';
import { ProfileLauncher } from '../../../components/profile-dialog/profile-launcher.service';
import { AfterViewInit, Component, ChangeDetectionStrategy, DestroyRef, ElementRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApprovalBellComponent } from '../../../components/approval-bell/approval-bell.component';
import { PERMISSIONS } from '../../../models/auth.model';
import { AuthService } from '../../../services/auth.service';
import { NonMoiJobBadgeService } from '../../../services/non-moi-job-badge.service';
import { MoiJobBadgeService } from '../../../services/moi-job-badge.service';
import { ClientRegistrationService } from '../../../services/client-registration.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [ApprovalBellComponent, AvatarComponent, RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit, AfterViewInit {
  readonly auth = inject(AuthService);
  readonly profile = inject(ProfileLauncher);

  /** Keyboard users reach the profile page the same way a click does. */
  openProfilePage(url: string): void {
    void this.profileRouter.navigateByUrl(url);
  }
  private readonly profileRouter = inject(Router);
  /** Drives the waiting-count badge on the Client Registrations row. */
  readonly registrations = inject(ClientRegistrationService);
  /** Finished Non-MOI jobs waiting for this administrator to close — the red number beside Non-MOI Jobs. */
  readonly jobBadge = inject(NonMoiJobBadgeService);
  /** Finished MOI jobs waiting to be billed — the red number beside MOI Jobs. */
  readonly moiJobBadge = inject(MoiJobBadgeService);
  readonly canMoiJobs = computed(() => this.auth.can(PERMISSIONS.moiJobManage));
  readonly canAccounts = computed(() => this.auth.can(PERMISSIONS.accountsManage));
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** On a phone the sidebar is a drawer behind the menu button; on a desktop
   *  it is always on screen and this is never set. */
  readonly menuOpen = signal(false);

  /** Desktop: the sidebar folded down to its icons. Remembered on this browser only. */
  readonly collapsed = signal(AdminLayoutComponent.readCollapsed());

  toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try { localStorage.setItem('jg-sidebar-collapsed', next ? '1' : '0'); } catch { /* private window: just not remembered */ }
  }

  private static readCollapsed(): boolean {
    try { return typeof localStorage !== 'undefined' && localStorage.getItem('jg-sidebar-collapsed') === '1'; } catch { return false; }
  }

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

  // ===== Page name in the top bar =====
  /** The open page's title, read from its heading so it is always exactly what the page calls itself
   *  (including changing ones like "Approved by the client"). The heading stays in the page for screen readers. */
  readonly pageTitle = signal('');
  private readonly host = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    const content = (this.host.nativeElement as HTMLElement).querySelector('.admin-content');
    if (!content || typeof MutationObserver === 'undefined') return;
    let queued = false;
    const read = () => {
      queued = false;
      const h1 = content.querySelector('h1');
      const text = (h1?.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (text !== this.pageTitle()) this.pageTitle.set(text);
    };
    const observer = new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(read); } });
    observer.observe(content, { childList: true, subtree: true, characterData: true });
    read();
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  ngOnInit(): void {
    this.registrations.refreshPendingCount();
    this.jobBadge.start();
    if (this.canMoiJobs()) this.moiJobBadge.start();

    // Picking a page in the drawer should land on that page, not leave the
    // drawer covering it.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe((e) => {
        this.menuOpen.set(false);
        this.jobBadge.refresh();
        if (this.canMoiJobs()) this.moiJobBadge.refresh();
        this.revealCurrentGroup((e as NavigationEnd).urlAfterRedirects);
      });
    this.revealCurrentGroup(this.router.url);
  }

  /** VIP nav is permission-gated; admins hold vip.manage implicitly. */
  readonly canManageVip = computed(() => this.auth.can(PERMISSIONS.vipManage));

  // ===== Search screens (Ctrl K) =====
  /** Every screen the sidebar offers, so any of them can be reached by typing its name. */
  readonly screens = computed(() => {
    const list: { label: string; group: string; url: string; query?: Record<string, string> }[] = [];
    if (this.auth.isSuperAdmin()) list.push({ label: 'Dashboard', group: 'Overview', url: '/admin/dashboard' });
    list.push(
      { label: 'Staff', group: 'People', url: '/admin/staff' },
      { label: 'Add staff', group: 'People', url: '/admin/staff/new' },
      { label: 'Contacts', group: 'People', url: '/admin/contacts' },
      { label: 'Company mail', group: 'People', url: '/admin/mail' },
      { label: 'Client Registrations', group: 'People', url: '/admin/client-registrations' },
      { label: 'DIA Inspection', group: 'MOI', url: '/admin/dia' },
      { label: 'Moi Inventory', group: 'MOI', url: '/admin/cameras' },
      { label: 'MOI Jobs', group: 'MOI', url: '/admin/moi-jobs' },
      { label: 'Issue an MOI job', group: 'MOI', url: '/admin/moi-jobs/new' },
      { label: 'MOI Services (price list)', group: 'MOI', url: '/admin/moi-services' },
      { label: 'Non-MOI Jobs', group: 'Non-MOI', url: '/admin/non-moi-jobs' },
      { label: 'Issue a Non-MOI job', group: 'Non-MOI', url: '/admin/non-moi-jobs/new' },
      { label: 'Collections (cash & online)', group: 'Non-MOI', url: '/admin/collections' },
      { label: 'Non-MOI Inventory', group: 'Non-MOI', url: '/admin/non-moi' },
      { label: 'Cash handover', group: 'Accounts', url: '/admin/cash-handover' },
      { label: 'Uber bills (approve & pay back)', group: 'Accounts', url: '/admin/uber-claims' },
      { label: 'Quotation', group: 'Quotations & documents', url: '/admin/boq' },
      { label: 'Quotations approved', group: 'Quotations & documents', url: '/admin/boq/decisions', query: { status: 'Approved' } },
      { label: 'Quotations rejected', group: 'Quotations & documents', url: '/admin/boq/decisions', query: { status: 'Rejected' } },
      { label: 'Drawings', group: 'Quotations & documents', url: '/admin/drawings' },
      { label: 'Drawings approved', group: 'Quotations & documents', url: '/admin/drawings/decisions', query: { status: 'Approved' } },
      { label: 'Drawings rejected', group: 'Quotations & documents', url: '/admin/drawings/decisions', query: { status: 'Rejected' } },
    );
    if (this.canManageVip()) list.push({ label: 'VIP Clients', group: 'Quotations & documents', url: '/admin/vip' });
    list.push({ label: 'My profile', group: 'Account', url: '/admin/profile' }, { label: 'Public site', group: 'Account', url: '/' });
    return list;
  });
  readonly screenQuery = signal('');
  readonly screenOpen = signal(false);
  readonly screenActive = signal(0);
  readonly screenMatches = computed(() => {
    const q = this.screenQuery().trim().toLowerCase();
    const all = this.screens();
    return q ? all.filter((s) => (s.label + ' ' + s.group).toLowerCase().includes(q)) : all;
  });

  @HostListener('document:keydown', ['$event'])
  onShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      document.querySelector<HTMLInputElement>('.admin-screen-search input')?.focus();
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
