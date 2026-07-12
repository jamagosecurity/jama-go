import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChildren,
  QueryList,
  AfterViewInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { LogoComponent } from '../logo/logo.component';
import { NAV_ITEMS } from '../../data/nav.data';
import {
  isNavDropdown,
  NavDropdownItem,
  NavItem,
  NavLink,
} from '../../models/nav.model';
import {
  CLOSE_DELAY_MS,
  DESKTOP_MQ,
  isPointerInSafeZone,
} from '../../utils/mega-menu.utils';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [LogoComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly navItems = NAV_ITEMS;

  mobileOpen = false;
  activePath = '/';
  activeHash = '';
  openDropdown: string | null = null;
  isDesktopNav = true;

  @ViewChildren('dropdownEl') dropdownEls!: QueryList<ElementRef<HTMLElement>>;

  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private dropdownMap = new Map<string, HTMLElement>();
  private mediaQuery = window.matchMedia(DESKTOP_MQ);
  private onHashChange = () => this.syncNavState();
  private onMediaChange = (e: MediaQueryListEvent) => {
    this.isDesktopNav = e.matches;
  };
  private onMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
  private onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.closeDropdown();
  };
  private readonly navSub;

  constructor(private readonly router: Router) {
    this.navSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.syncNavState());
  }

  ngOnInit(): void {
    this.syncNavState();
    this.isDesktopNav = this.mediaQuery.matches;
    window.addEventListener('hashchange', this.onHashChange);
    this.mediaQuery.addEventListener('change', this.onMediaChange);
    document.addEventListener('keydown', this.onKeyDown);
  }

  ngAfterViewInit(): void {
    this.rebuildDropdownMap();
    this.dropdownEls.changes.subscribe(() => this.rebuildDropdownMap());
    document.addEventListener('mousemove', this.onMouseMove, { passive: true });
    document.addEventListener('pointerdown', this.onPointerDown);
  }

  ngOnDestroy(): void {
    this.cancelClose();
    this.navSub.unsubscribe();
    window.removeEventListener('hashchange', this.onHashChange);
    this.mediaQuery.removeEventListener('change', this.onMediaChange);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerdown', this.onPointerDown);
  }

  isDropdown(item: NavItem): item is NavDropdownItem {
    return isNavDropdown(item);
  }

  asColumns(children: NavLink[] | NavLink[][]): NavLink[][] {
    return children as NavLink[][];
  }

  asLinks(children: NavLink[] | NavLink[][]): NavLink[] {
    return children as NavLink[];
  }

  flattenChildren(children: NavLink[] | NavLink[][]): NavLink[] {
    if (Array.isArray(children[0])) {
      return (children as NavLink[][]).flat();
    }
    return children as NavLink[];
  }

  isActive(href: string): boolean {
    if (href === '/contact') return this.activePath === '/contact';
    if (href === '/') return this.activePath === '/' && !this.activeHash;
    if (href.startsWith('/#')) return this.activePath === '/' && this.activeHash === href.slice(1);
    return false;
  }

  childIsActive(item: NavDropdownItem): boolean {
    const siblings = this.flattenChildren(item.children);
    return siblings.some((c) => this.isMegaLinkActive(c, siblings));
  }

  isMegaLinkActive(child: NavLink, siblings: NavLink[]): boolean {
    if (!this.isActive(child.href)) return false;
    const duplicates = siblings.filter((item) => item.href === child.href);
    return duplicates.length === 1;
  }

  onDropdownEnter(label: string): void {
    if (!this.isDesktopNav) return;
    this.cancelClose();
    this.openDropdown = label;
  }

  onDropdownLeave(): void {
    if (!this.isDesktopNav) return;
    this.scheduleClose();
  }

  onDropdownBlur(event: FocusEvent, label: string): void {
    if (!this.isDesktopNav) return;
    const current = event.currentTarget as HTMLElement;
    if (!current.contains(event.relatedTarget as Node)) {
      this.scheduleClose();
    }
  }

  toggleMobileDropdown(label: string): void {
    this.openDropdown = this.openDropdown === label ? null : label;
  }

  closeMobile(): void {
    this.mobileOpen = false;
    this.closeDropdown();
  }

  toggleMobileMenu(): void {
    this.mobileOpen = !this.mobileOpen;
  }

  private syncNavState(): void {
    const [path, hash = ''] = this.router.url.split('#');
    this.activePath = path || '/';
    this.activeHash = hash ? `#${hash}` : window.location.hash;
  }

  private rebuildDropdownMap(): void {
    this.dropdownMap.clear();
    this.dropdownEls.forEach((ref) => {
      const label = ref.nativeElement.dataset['label'];
      if (label) this.dropdownMap.set(label, ref.nativeElement);
    });
  }

  private cancelClose(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private closeDropdown(): void {
    this.cancelClose();
    this.openDropdown = null;
  }

  private scheduleClose(): void {
    this.cancelClose();
    this.closeTimer = setTimeout(() => {
      this.openDropdown = null;
      this.closeTimer = null;
    }, CLOSE_DELAY_MS);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.openDropdown || !this.isDesktopNav) return;
    const activeEl = this.dropdownMap.get(this.openDropdown);
    if (!activeEl) return;
    if (isPointerInSafeZone(e.clientX, e.clientY, activeEl)) {
      this.cancelClose();
    }
  }

  private handlePointerDown(e: PointerEvent): void {
    if (!this.openDropdown || !this.isDesktopNav) return;
    const activeEl = this.dropdownMap.get(this.openDropdown);
    if (activeEl && !activeEl.contains(e.target as Node)) {
      this.closeDropdown();
    }
  }
}
