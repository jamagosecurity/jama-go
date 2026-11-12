import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { PrayerTime, formatMinutes, prayerTimes } from '../../../utils/prayer-times.util';
import { LiveMapComponent } from '../../../components/live-map/live-map.component';

const TIME_ZONE = 'Asia/Qatar';

/** The parts of "now" in Doha, whatever time zone the visitor's computer is in. */
function dohaNow(at: Date): { year: number; month: number; day: number; minutes: number; seconds: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), minutes: get('hour') * 60 + get('minute'), seconds: get('second') };
}

/**
 * The sign-in page: a live Doha panel (time, Hijri and Gregorian dates, today's prayer times and a countdown to the next
 * one) over an animated map of Qatar, beside the sign-in card. The sign-in itself is unchanged.
 */
@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, RouterLink, LiveMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css',
})
export class AdminLoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  email = '';
  password = '';

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  // ===== The live Doha panel =====

  protected readonly now = signal(new Date());

  private readonly doha = computed(() => dohaNow(this.now()));

  protected readonly clock = computed(() => {
    const text = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(this.now());
    const [time, period] = text.split(' ');
    return { time, period };
  });

  protected readonly gregorian = computed(() =>
    new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(this.now()));

  protected readonly hijri = computed(() => {
    try {
      return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric' }).format(this.now());
    } catch {
      return '';
    }
  });

  protected readonly prayers = computed<readonly PrayerTime[]>(() => {
    const { year, month, day } = this.doha();
    return prayerTimes({ year, month, day });
  });

  /** The next prayer today, or Fajr tomorrow once Isha has passed. */
  protected readonly next = computed(() => {
    const { minutes, seconds, year, month, day } = this.doha();
    const nowSeconds = minutes * 60 + seconds;
    const today = this.prayers();
    let target = today.find((p) => p.minutes * 60 > nowSeconds);
    let secondsLeft: number;
    if (target) {
      secondsLeft = target.minutes * 60 - nowSeconds;
    } else {
      const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
      target = prayerTimes({ year: tomorrow.getUTCFullYear(), month: tomorrow.getUTCMonth() + 1, day: tomorrow.getUTCDate() })[0];
      secondsLeft = 24 * 3600 - nowSeconds + target.minutes * 60;
    }
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;
    return {
      prayer: target,
      at: formatMinutes(target.minutes),
      countdown: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    };
  });

  protected stateOf(prayer: PrayerTime): 'past' | 'next' | 'later' {
    if (this.next().prayer.key === prayer.key && this.next().prayer.minutes === prayer.minutes) return 'next';
    const { minutes } = this.doha();
    return prayer.minutes <= minutes ? 'past' : 'later';
  }

  protected readonly formatMinutes = formatMinutes;

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  // ===== Sign-in (unchanged behaviour) =====

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  forgotPassword(): void {
    void this.router.navigate(['/admin/forgot-password']);
  }

  submit(event: Event): void {
    event.preventDefault();
    if (this.loading()) {
      return;
    }

    const email = this.email.trim();
    const password = this.password;

    if (!email || !password) {
      this.error.set('Email and password are required.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auth
      .login({ email, password })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          void this.router.navigate([this.auth.landingRoute(response.user)]);
        },
        error: (err: unknown) => {
          this.error.set(getApiErrorMessage(err, 'Invalid email or password.'));
          const card = this.host.nativeElement.querySelector('.lg-card');
          card?.classList.add('is-shake');
          setTimeout(() => card?.classList.remove('is-shake'), 450);
        },
      });
  }
}
