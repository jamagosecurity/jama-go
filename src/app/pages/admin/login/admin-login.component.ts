import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css',
})
export class AdminLoginComponent implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private introTimer?: ReturnType<typeof setTimeout>;
  private gsapCleanup?: () => void;

  email = '';
  password = '';
  rememberMe = false;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly showCinema = signal(true);

  readonly line1 = ['C', 'o', 'm', 'm', 'a', 'n', 'd', '\u00A0', 'y', 'o', 'u', 'r'];
  readonly line2 = ['s', 'e', 'c', 'u', 'r', 'i', 't', 'y', '\u00A0', 'f', 'r', 'o', 'm'];
  readonly line3 = ['o', 'n', 'e', '\u00A0', 'v', 'a', 'u', 'l', 't', '.'];
  readonly particles = Array.from({ length: 18 }, (_, i) => i);
  readonly rotatorWords = [
    'homes & villas.',
    'offices & retail.',
    'events & venues.',
    'what matters most.',
  ];

  ngAfterViewInit(): void {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      this.showCinema.set(false);
      void this.enhanceWithGsap();
      return;
    }

    // Cinema is CSS-driven so the page is never blank. Auto-dismiss, then enhance with GSAP.
    this.introTimer = setTimeout(() => {
      this.showCinema.set(false);
      void this.enhanceWithGsap();
    }, 2200);
  }

  ngOnDestroy(): void {
    if (this.introTimer) {
      clearTimeout(this.introTimer);
    }
    this.gsapCleanup?.();
  }

  skipIntro(): void {
    if (this.introTimer) {
      clearTimeout(this.introTimer);
    }
    this.showCinema.set(false);
    void this.enhanceWithGsap();
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  forgotPassword(): void {
    this.error.set('Contact your administrator to reset access credentials.');
  }

  spawnRipple(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement | null;
    if (!btn) {
      return;
    }
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
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
          const panel = this.host.nativeElement.querySelector('.panel-inner');
          panel?.classList.add('is-shake');
          setTimeout(() => panel?.classList.remove('is-shake'), 450);
        },
      });
  }

  private async enhanceWithGsap(): Promise<void> {
    try {
      const { gsap } = await import('gsap');
      const root = this.host.nativeElement;
      const listeners: Array<() => void> = [];

      const ctx = gsap.context(() => {
        gsap.from('.login-reveal', {
          y: 26,
          opacity: 0,
          duration: 0.6,
          stagger: 0.07,
          ease: 'power3.out',
        });
        gsap.from('.brand-logo', {
          scale: 0.55,
          rotation: -10,
          opacity: 0,
          duration: 0.9,
          ease: 'back.out(1.8)',
        });
        gsap.to('.brand-logo', {
          y: -5,
          duration: 2.6,
          delay: 1,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
        gsap.from('.char', {
          yPercent: 100,
          opacity: 0,
          duration: 0.6,
          stagger: 0.02,
          ease: 'power4.out',
        });
        gsap.from('.stat-item', {
          y: 18,
          opacity: 0,
          duration: 0.5,
          stagger: 0.09,
          delay: 0.35,
          ease: 'power3.out',
        });
        gsap.from('.login-shell', {
          y: 40,
          opacity: 0,
          scale: 0.965,
          duration: 0.9,
          ease: 'expo.out',
        });
        gsap.to('.ring-a', {
          rotation: 360,
          duration: 28,
          repeat: -1,
          ease: 'none',
          transformOrigin: '50% 50%',
        });
        gsap.to('.ring-b', {
          rotation: -360,
          duration: 36,
          repeat: -1,
          ease: 'none',
          transformOrigin: '50% 50%',
        });
        gsap.to('.shield', {
          y: -6,
          duration: 2.4,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });

        // Rotating tagline words
        const words = gsap.utils.toArray<HTMLElement>('.rotator-word');
        if (words.length > 1) {
          gsap.set(words, { yPercent: 105, opacity: 0, position: 'absolute' });
          gsap.set(words[0], { yPercent: 0, opacity: 1 });

          const cycle = gsap.timeline({ repeat: -1, delay: 1.2 });
          words.forEach((word, i) => {
            const next = words[(i + 1) % words.length];
            cycle
              .to(word, { yPercent: -105, opacity: 0, duration: 0.55, ease: 'power3.in' }, `+=1.9`)
              .fromTo(
                next,
                { yPercent: 105, opacity: 0 },
                { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out' },
                '<0.08',
              );
          });
        }

        const card = root.querySelector<HTMLElement>('.login-shell');
        const visual = root.querySelector<HTMLElement>('.visual-core');
        const signin = root.querySelector<HTMLElement>('.signin');

        // Subtle 3D tilt on the whole card
        if (card) {
          const tiltX = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3.out' });
          const tiltY = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3.out' });
          gsap.set(card, { transformPerspective: 1400 });

          const onCardMove = (e: PointerEvent): void => {
            if (window.innerWidth < 940) {
              return;
            }
            const r = card.getBoundingClientRect();
            tiltX(((e.clientX - r.left) / r.width - 0.5) * 3.5);
            tiltY(((e.clientY - r.top) / r.height - 0.5) * -3.5);
          };
          const onCardLeave = (): void => {
            tiltX(0);
            tiltY(0);
          };

          card.addEventListener('pointermove', onCardMove);
          card.addEventListener('pointerleave', onCardLeave);
          listeners.push(() => {
            card.removeEventListener('pointermove', onCardMove);
            card.removeEventListener('pointerleave', onCardLeave);
          });
        }

        // Magnetic sign-in button
        if (signin) {
          const magX = gsap.quickTo(signin, 'x', { duration: 0.4, ease: 'power3.out' });
          const magY = gsap.quickTo(signin, 'y', { duration: 0.4, ease: 'power3.out' });

          const onBtnMove = (e: PointerEvent): void => {
            if (window.innerWidth < 900) {
              return;
            }
            const r = signin.getBoundingClientRect();
            magX((e.clientX - (r.left + r.width / 2)) * 0.16);
            magY((e.clientY - (r.top + r.height / 2)) * 0.16);
          };
          const onBtnLeave = (): void => {
            gsap.to(signin, { x: 0, y: 0, duration: 0.55, ease: 'elastic.out(1, 0.45)' });
          };

          signin.addEventListener('pointermove', onBtnMove);
          signin.addEventListener('pointerleave', onBtnLeave);
          listeners.push(() => {
            signin.removeEventListener('pointermove', onBtnMove);
            signin.removeEventListener('pointerleave', onBtnLeave);
          });
        }

        // Scene parallax
        if (visual) {
          const parX = gsap.quickTo(visual, 'x', { duration: 1, ease: 'power3.out' });
          const parY = gsap.quickTo(visual, 'y', { duration: 1, ease: 'power3.out' });

          const onSceneMove = (e: PointerEvent): void => {
            if (window.innerWidth < 960) {
              return;
            }
            parX((e.clientX / window.innerWidth - 0.5) * 22);
            parY((e.clientY / window.innerHeight - 0.5) * 16);
          };

          window.addEventListener('pointermove', onSceneMove);
          listeners.push(() => window.removeEventListener('pointermove', onSceneMove));
        }
      }, root);

      this.gsapCleanup = () => {
        listeners.forEach((off) => off());
        ctx.revert();
      };
    } catch {
      // UI already visible — GSAP is optional enhancement only.
    }
  }
}
