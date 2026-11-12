import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

/** "Forgot password": asks for the email and sends a one-time link to set a new password. */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rp">
      <div class="rp-cover"><img src="/JamaGoLogo-navy.png" alt="Jama Go" /><p>Password help</p></div>
      <form class="rp-body" (submit)="$event.preventDefault(); send()">
        <h1>Forgot your password?</h1>
        <p class="lead">Enter the email you sign in with. We will send you a link to set a new password.</p>
        <label>
          <span>Email</span>
          <input type="email" name="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value)" placeholder="name@jamago.qa" />
        </label>
        @if (error()) { <p class="msg msg--error" role="alert">{{ error() }}</p> }
        @if (sent()) { <p class="msg msg--ok" role="status">{{ sent() }}</p> }
        <button type="submit" class="btn" [disabled]="!email().trim() || sending()">{{ sending() ? 'Sending…' : 'Send reset link' }}</button>
        <a class="back" routerLink="/admin/login">Back to sign in</a>
      </form>
    </div>
  `,
  styles: `
    :host { display: grid; place-items: center; min-height: 100vh; padding: 24px 16px; background: radial-gradient(120% 120% at 0% 0%, rgba(165, 164, 148, 0.18), transparent 50%), linear-gradient(160deg, #eef2fa, #f8f9fc); }
    .rp { width: 100%; max-width: 480px; overflow: hidden; border: 1px solid rgba(143, 141, 119, 0.35); border-radius: 26px; background: #fff; box-shadow: 0 30px 60px -36px rgba(13, 32, 64, 0.6); color: #14305f; }
    .rp-cover { padding: 26px 28px 22px; background: linear-gradient(135deg, #0e244e, #163d7a); box-shadow: inset 0 -3px 0 #b5b4a8; }
    .rp-cover img { height: 34px; filter: brightness(0) invert(1); }
    .rp-cover p { margin: 12px 0 0; color: rgba(236, 235, 228, 0.85); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; }
    .rp-body { display: grid; gap: 16px; padding: 26px 28px 28px; }
    h1 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-weight: 400; font-size: 1.7rem; }
    .lead { margin: 0; color: #5d6b86; line-height: 1.6; }
    label { display: grid; gap: 6px; }
    label span { font-size: 0.74rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #5d6b86; }
    input { box-sizing: border-box; width: 100%; height: 50px; padding: 0 16px; border: 1px solid rgba(26, 55, 103, 0.2); border-radius: 14px; font: inherit; font-size: 1rem; color: #14305f; }
    input:focus { outline: none; border-color: #1d4589; box-shadow: 0 0 0 4px rgba(29, 69, 137, 0.14); }
    .btn { min-height: 50px; border: 0; border-radius: 999px; background: linear-gradient(135deg, #14305f, #1d4589); color: #fff; font: inherit; font-weight: 800; font-size: 1rem; cursor: pointer; box-shadow: 0 14px 24px -14px rgba(20, 48, 95, 0.9); }
    .btn:disabled { background: #cfd3dc; box-shadow: none; cursor: default; }
    .msg { margin: 0; padding: 12px 14px; border-radius: 12px; font-weight: 600; line-height: 1.5; }
    .msg--ok { background: #e7f5f1; color: #0f6b5f; }
    .msg--error { background: #fdecec; color: #9f1217; }
    .back { justify-self: center; color: #1d4589; font-weight: 700; text-decoration: none; }
    .rules { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .rules li { padding: 5px 12px; border-radius: 999px; background: #f2f4f8; color: #7a8296; font-size: 0.8rem; font-weight: 600; }
    .rules li.ok { background: #e7f5f1; color: #0f6b5f; }
`,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  protected readonly email = signal('');
  protected readonly sending = signal(false);
  protected readonly sent = signal('');
  protected readonly error = signal('');

  protected send(): void {
    const email = this.email().trim();
    if (!email || this.sending()) return;
    this.sending.set(true);
    this.error.set('');
    this.sent.set('');
    this.auth.forgotPassword(email).subscribe({
      next: (message) => { this.sending.set(false); this.sent.set(message); },
      error: (err: unknown) => { this.sending.set(false); this.error.set(getApiErrorMessage(err, 'Could not send the link. Please try again.')); },
    });
  }
}
