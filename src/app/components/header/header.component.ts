import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
import { DESKTOP_MQ } from '../../utils/mega-menu.utils';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [LogoComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {
  readonly navItems = NAV_ITEMS;

  mobileOpen = false;
  activePath = '/';
  activeHash = '';
  openDropdown: string | null = null;
  isDesktopNav = true;

  /**
   * Resolved in ngOnInit rather than as a field initialiser: the home page is
   * prerendered at build time, where there is no window and a field initialiser
   * would run during that render and crash the build.
   */
  private mediaQuery: MediaQueryList | null = null;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private onHashChange = () => this.syncNavState();
  private onMediaChange = (e: MediaQueryListEvent) => {
    this.isDesktopNav = e.matches;
    if (e.matches) this.openDropdown = null;
  };
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
    // Prerender renders the desktop nav, which is also the sensible default
    // before hydration on a phone: it is the markup that matches the CSS at
    // any width, and the real match is applied the moment we are in a browser.
    if (!this.isBrowser) return;

    this.mediaQuery = window.matchMedia(DESKTOP_MQ);
    this.isDesktopNav = this.mediaQuery.matches;
    window.addEventListener('hashchange', this.onHashChange);
    this.mediaQuery.addEventListener('change', this.onMediaChange);
    document.addEventListener('keydown', this.onKeyDown);
  }

  ngOnDestroy(): void {
    this.navSub.unsubscribe();
    if (!this.isBrowser) return;

    window.removeEventListener('hashchange', this.onHashChange);
    this.mediaQuery?.removeEventListener('change', this.onMediaChange);
    document.removeEventListener('keydown', this.onKeyDown);
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

  onDropdownMouseDown(event: MouseEvent): void {
    if (this.isDesktopNav) event.preventDefault();
  }

  onDropdownEnter(label: string): void {
    if (this.isDesktopNav) return;
    this.openDropdown = label;
  }

  onDropdownLeave(): void {
    if (this.isDesktopNav) return;
    this.openDropdown = null;
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

  isDropdownOpen(label: string): boolean {
    return !this.isDesktopNav && this.openDropdown === label;
  }

  private syncNavState(): void {
    const [path, hash = ''] = this.router.url.split('#');
    this.activePath = path || '/';
    // The router URL is the source of truth; window.location is only consulted
    // for a hash the router did not see, and only when there is a window.
    this.activeHash = hash ? `#${hash}` : this.isBrowser ? window.location.hash : '';
  }

  private closeDropdown(): void {
    this.openDropdown = null;
  }
}
