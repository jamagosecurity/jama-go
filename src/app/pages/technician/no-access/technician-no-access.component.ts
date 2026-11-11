import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../../services/auth.service';

/**
 * What a technician sees when none of the portal's sections has been given to them yet. Better than being thrown back to
 * the public website, which looks like the portal is broken.
 */
@Component({
  selector: 'app-technician-no-access',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="na">
      <h1>Your account is ready — nothing is switched on yet</h1>
      <p>
        You are signed in as <strong>{{ auth.currentUser()?.fullName }}</strong>
        ({{ auth.currentUser()?.email }}), but the administrator has not given this account access to any section yet.
      </p>
      <p>Please ask the administrator to open your profile in <strong>Staff</strong> and tick what you should be able to do.
        Then sign out and sign in again.</p>
      <p class="na-hint">Are you an administrator? Sign out here, then sign in at <strong>/admin/login</strong> with your administrator account.</p>
      <button type="button" class="na-btn" (click)="auth.logout()">Sign out</button>
    </section>
  `,
  styles: `
    .na { max-width: 620px; margin: 8vh auto 0; padding: 36px 34px; background: #fff; border: 1px solid #e3e0d8; border-radius: 14px; color: #14305f; }
    h1 { margin: 0 0 14px; font-family: Georgia, "Times New Roman", serif; font-weight: 400; font-size: 1.6rem; line-height: 1.3; }
    p { margin: 0 0 12px; line-height: 1.7; color: #000; }
    .na-hint { color: #6b7280; font-size: 0.9rem; }
    .na-btn { margin-top: 10px; min-height: 48px; padding: 0 28px; border: 0; border-radius: 999px; background: linear-gradient(145deg, #e8383f 0%, #d21319 55%, #a40f14 100%); color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
  `,
})
export class TechnicianNoAccessComponent {
  protected readonly auth = inject(AuthService);
}
