import { AvatarComponent } from '../../../components/avatar/avatar.component';
import { ProfileLauncher } from '../../../components/profile-dialog/profile-launcher.service';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { PERMISSIONS } from '../../../models/auth.model';
import { AuthService } from '../../../services/auth.service';

const JOBS_PREFIX = '/technician/non-moi-jobs';

@Component({
  selector: 'app-technician-layout',
  standalone: true,
  imports: [AvatarComponent, RouterOutlet, RouterLink],
  templateUrl: './technician-layout.component.html',
  // Deliberately the staff portal's stylesheet: one sidebar look across every role.
  styleUrls: ['../../staff/layout/staff-layout.component.css', './technician-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicianLayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly profile = inject(ProfileLauncher);

  /** Keyboard users reach the profile page the same way a click does. */
  openProfilePage(url: string): void {
    void this.profileRouter.navigateByUrl(url);
  }
  private readonly profileRouter = inject(Router);
  private readonly router = inject(Router);

  /** On a phone the sidebar is a drawer behind the menu button. */
  protected readonly menuOpen = signal(false);

  /** Which link is lit — by URL prefix, so a DIA sub-page (an inspection form,
   *  a summary) still shows DIA Inspections as current. */
  protected readonly tab = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        this.menuOpen.set(false);
        return this.tabFor(this.router.url);
      }),
    ),
    { initialValue: this.tabFor(this.router.url) },
  );

  /** The portal shows only what this technician has been given access to. */
  protected readonly canInspect = computed(
    () => this.auth.can(PERMISSIONS.diaInspect) || this.auth.can(PERMISSIONS.diaView),
  );
  protected readonly canDoJobs = computed(() => this.auth.can(PERMISSIONS.nonMoiJobWork));
  protected readonly isProfile = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url.startsWith('/technician/profile'))),
    { initialValue: this.router.url.startsWith('/technician/profile') },
  );

  protected readonly initials = computed(() => {
    const parts = (this.auth.currentUser()?.fullName?.trim() || 'Technician').split(/\s+/).filter(Boolean);
    return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  });

  @HostListener('document:keydown.escape')
  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  private tabFor(url: string): 'dia' | 'jobs' {
    if (url.startsWith(JOBS_PREFIX)) return 'jobs';
    return 'dia';
  }
}
