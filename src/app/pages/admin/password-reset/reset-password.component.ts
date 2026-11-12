import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

/** Opened from the emailed link: sets a new password with the one-time code in the address. */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rp">
      <div class="rp-cover"><img src="/JamaGoLogo-navy.png" alt="Jama Go" /><p>Password help</p></div>
      @if (!email || !token) {
        <div class="rp-body">
          <h1>This link is incomplete</h1>
          <p class="lead">Open the link from the email again, or ask for a new one.</p>
          <a class="back" routerLink="/admin/forgot-password">Ask for a new link</a>
        </div>
      } @else if (done()) {
        <div class="rp-body">
          <h1>Password changed</h1>
          <p class="msg msg--ok" role="status">{{ done() }}</p>
          <a class="btn" style="display:grid;place-items:center;text-decoration:none" routerLink="/admin/login">Sign in</a>
        </div>
      } @else {
        <form class="rp-body" (submit)="$event.preventDefault(); save()">
          <h1>Set a new password</h1>
          <p class="lead">For <strong>{{ email }}</strong></p>
          <label><span>New password</span>
            <input type="password" name="new" autocomplete="new-password" [value]="pw()" (input)="pw.set($any($event.target).value)" />
          </label>
          <label><span>Confirm new password</span>
            <input type="password" name="confirm" autocomplete="new-password" [value]="confirm()" (input)="confirm.set($any($event.target).value)" />
          </label>
          <ul class="rules">
            <li [class.ok]="rules().length">8 or more characters</li>
            <li [class.ok]="rules().upper">An uppercase letter</li>
            <li [class.ok]="rules().lower">A lowercase letter</li>
            <li [class.ok]="rules().digit">A number</li>
            <li [class.ok]="rules().match">Both match</li>
          </ul>
          @if (error()) { <p class="msg msg--error" role="alert">{{ error() }}</p> }
          <button type="submit" class="btn" [disabled]="!ready() || saving()">{{ saving() ? 'Saving…' : 'Set new password' }}</button>
          <a class="back" routerLink="/admin/forgot-password">Ask for a new link</a>
        </form>
      }
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
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;
  protected readonly email = this.params.get('email') ?? '';
  protected readonly token = this.params.get('token') ?? '';

  protected readonly pw = signal('');
  protected readonly confirm = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly done = signal('');

  protected readonly rules = computed(() => {
    const value = this.pw();
    return { length: value.length >= 8, upper: /[A-Z]/.test(value), lower: /[a-z]/.test(value), digit: /[0-9]/.test(value), match: !!value && value === this.confirm() };
  });
  protected readonly ready = computed(() => Object.values(this.rules()).every(Boolean));

  protected save(): void {
    if (!this.ready() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.auth.resetPassword(this.email, this.token, this.pw()).subscribe({
      next: (message) => { this.saving.set(false); this.done.set(message); },
      error: (err: unknown) => { this.saving.set(false); this.error.set(getApiErrorMessage(err, 'Could not set the new password.')); },
    });
  }
}
