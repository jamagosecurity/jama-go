import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  WritableSignal,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

interface ExperienceItem {
  role: string;
  company: string;
  type: string;
  period: string;
  location: string;
  accent: string;
}

interface FocusItem {
  title: string;
  desc: string;
  accent: string;
  icon: string;
}

/** Not in lib.dom yet, and only Chromium ships it — hence every field optional. */
interface NetworkInformation {
  readonly saveData?: boolean;
  readonly effectiveType?: string;
}

/** Effective types where a 3.4 MB decorative download is not defensible. */
const METERED_CONNECTIONS = new Set(['slow-2g', '2g', '3g']);

/** Below this the 16:9 clip crops down to a strip; the poster reads better. */
const HERO_VIDEO_MIN_WIDTH = 900;

@Component({
  selector: 'app-sifeddine-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sifeddine-landing.component.html',
  styleUrl: './sifeddine-landing.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SifeddineLandingComponent implements OnInit {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly years = signal(0);
  protected readonly connections = signal(0);
  protected readonly roles = signal(0);
  protected readonly countries = signal(0);

  /** Whether the hero clip has been attached to the DOM at all. */
  protected readonly heroVideo = signal(false);
  /** Flips on the first decoded frame, which is what fades the clip in. */
  protected readonly heroVideoPlaying = signal(false);

  private readonly heroVideoEl = viewChild<ElementRef<HTMLVideoElement>>('heroVideoEl');

  /**
   * Starts the clip the moment @if puts it in the DOM.
   *
   * The `muted` in the template is not enough on its own: Angular applies it
   * with setAttribute, and the muted IDL property is only seeded from that
   * attribute by the HTML parser — never for an element built at runtime. The
   * element therefore counts as unmuted, autoplay policy refuses it, and the
   * poster is all anyone ever sees. Setting the property directly is the fix;
   * play() is then called explicitly rather than trusting the attribute.
   */
  private readonly startHeroVideo = effect(() => {
    const video = this.heroVideoEl()?.nativeElement;
    if (!video) return;

    video.muted = true;
    // A refusal here is a valid outcome, not a failure: the poster is already
    // the designed fallback, so there is nothing to recover or report.
    void video.play().catch(() => undefined);
  });

  protected readonly skills: string[] = [
    'Business Development',
    'National Sales Management',
    'Business Marketing',
    'Client Relations',
    'Negotiation',
    'Market Expansion',
    'Lead Generation',
    'Account Management',
    'Team Leadership',
    'Strategic Partnerships',
  ];

  protected readonly focus: FocusItem[] = [
    {
      title: 'Security Solutions Consulting',
      desc: 'Advising businesses on tailored surveillance, access-control and safety equipment that fit their real-world risk.',
      accent: '#2594d2',
      icon: 'shield',
    },
    {
      title: 'Client Partnerships',
      desc: 'Building trusted, long-term relationships with organisations across Qatar and the wider Gulf.',
      accent: '#f6993d',
      icon: 'handshake',
    },
    {
      title: 'Market Growth',
      desc: 'Spotting new opportunities and expanding Jama Go’s footprint through sharp, data-led outreach.',
      accent: '#16a34a',
      icon: 'trend',
    },
    {
      title: 'Tenders & Proposals',
      desc: 'Preparing competitive commercial proposals and guiding deals from first contact to signature.',
      accent: '#7c3aed',
      icon: 'doc',
    },
    {
      title: 'Sales Strategy',
      desc: 'National sales management and go-to-market planning that turns pipelines into predictable revenue.',
      accent: '#0d9488',
      icon: 'target',
    },
    {
      title: 'Cross-Border Experience',
      desc: 'Bridging markets and cultures across Qatar and Türkiye with a genuinely international perspective.',
      accent: '#e11d48',
      icon: 'globe',
    },
  ];

  protected readonly experience: ExperienceItem[] = [
    {
      role: 'Business Development Specialist',
      company: 'Jama Go Security Equipment',
      type: 'Full-time',
      period: 'Sep 2024 — Present',
      location: 'Doha, Qatar',
      accent: '#2594d2',
    },
    {
      role: 'General Manager',
      company: 'Espoir Clinic',
      type: 'Self-employed',
      period: 'Oct 2021 — Aug 2024',
      location: 'Istanbul, Türkiye',
      accent: '#7c3aed',
    },
    {
      role: 'Sales Manager',
      company: 'DR Bayer Clinics',
      type: 'Contract',
      period: 'Jan 2018 — Jul 2021',
      location: '3 yrs 7 mos',
      accent: '#f6993d',
    },
  ];

  ngOnInit(): void {
    this.countTo(this.years, 7, 1400);
    this.countTo(this.roles, 3, 1200);
    this.countTo(this.countries, 2, 1000);
    this.countTo(this.connections, 128, 1700);
    this.attachHeroVideo();
  }

  protected onHeroVideoPlaying(): void {
    this.heroVideoPlaying.set(true);
  }

  /**
   * The hero clip is ~3.4 MB, so it never belongs in the initial page load:
   * the markup ships without it and it is attached once the browser is idle,
   * past LCP. Even then it is only worth the bytes where all three hold —
   * motion is welcome, the viewport is wide enough for a 16:9 crop to survive,
   * and the connection is neither metered nor slow. Everywhere else the poster
   * still stays put and nothing is downloaded.
   */
  private attachHeroVideo(): void {
    if (!this.isBrowser) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < HERO_VIDEO_MIN_WIDTH) return;

    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType && METERED_CONNECTIONS.has(connection.effectiveType)) return;

    const attach = (): void => this.heroVideo.set(true);
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(attach, { timeout: 3000 });
    } else {
      // Older Safari has no idle callback; a fixed delay clears LCP well enough.
      window.setTimeout(attach, 1200);
    }
  }

  private countTo(target: WritableSignal<number>, end: number, duration: number): void {
    // Prerendering has no requestAnimationFrame. Land on the final figure so
    // the static HTML shows the real number rather than a zero that only the
    // animation would have corrected.
    if (!this.isBrowser) {
      target.set(end);
      return;
    }

    const start = performance.now();
    const step = (now: number): void => {
      const progress = Math.min(1, (now - start) / duration);
      // ease-in-out for a premium feel
      const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
      target.set(Math.round(end * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
