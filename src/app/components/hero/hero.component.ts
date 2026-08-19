import { Component, ChangeDetectionStrategy, OnDestroy, afterNextRender, signal } from '@angular/core';

/**
 * The Qatar outline is drawn in this user space. Every marker, route and ring
 * below is expressed in it, and the HTML labels are positioned by converting
 * the same numbers to a percentage of it — so the SVG and the labels sitting
 * on top of it cannot drift apart when the stage is resized.
 */
const MAP_W = 400;
const MAP_H = 720;

/**
 * A simplified Qatar coastline, traced from real longitude/latitude and mapped
 * with  x = (lon - 50.70) * 400,  y = (26.25 - lat) * 400.  Simplified because
 * it is read at a glance behind a headline, not navigated by.
 */
const QATAR_PATH =
  'M200 40 L280 60 Q332 92 340 132 L332 228 Q364 250 360 280 L352 340 ' +
  'Q338 358 330 380 L368 432 Q366 470 360 504 L372 620 Q310 646 240 652 ' +
  'L60 660 Q40 592 32 520 L20 380 Q26 330 40 292 L100 200 Q124 150 128 100 Z';

interface MarkerSeed {
  name: string;
  x: number;
  y: number;
  /** Doha is the hub: every route springs from it and the sweep is centred on it. */
  hub?: boolean;
  /**
   * West-coast markers stay unlabelled. Their labels would land under the
   * headline column, and the dot alone still reads as coverage.
   */
  quiet?: boolean;
}

const MARKER_SEEDS: MarkerSeed[] = [
  { name: 'Ras Laffan', x: 340, y: 140 },
  { name: 'Al Khor', x: 322, y: 232 },
  { name: 'Lusail', x: 316, y: 326 },
  { name: 'Doha', x: 330, y: 378, hub: true },
  { name: 'Al Wakrah', x: 362, y: 434 },
  { name: 'Mesaieed', x: 344, y: 506 },
  { name: 'Dukhan', x: 34, y: 330, quiet: true },
  { name: 'Zekreet', x: 46, y: 286, quiet: true },
];

export interface SiteMarker extends MarkerSeed {
  leftPct: string;
  topPct: string;
}

@Component({
  selector: 'app-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './hero.component.html',
})
export class HeroComponent implements OnDestroy {
  readonly mapW = MAP_W;
  readonly mapH = MAP_H;
  readonly qatarPath = QATAR_PATH;

  readonly markers: SiteMarker[] = MARKER_SEEDS.map((seed) => ({
    ...seed,
    leftPct: `${(seed.x / MAP_W) * 100}%`,
    topPct: `${(seed.y / MAP_H) * 100}%`,
  }));

  /** Routes out of Doha, bowed away from the coast so they stay readable. */
  readonly routes: string[] = [
    'M330 378 Q392 250 340 140',
    'M330 378 Q374 300 322 232',
    'M330 378 Q358 348 316 326',
    'M330 378 Q386 400 362 434',
    'M330 378 Q396 440 344 506',
    'M330 378 Q180 300 34 330',
  ];

  /** Straight from the service list on the contact page — no invented claims. */
  readonly capabilities: string[] = [
    'CCTV Surveillance',
    'Access Control',
    'Intruder Alarms',
    'Intercom Systems',
    'Gate Barriers',
    'Smart Locks',
    'AMC & Maintenance',
    'Free Site Surveys',
  ];

  /**
   * The one genuinely live thing in this hero, and the reason it is allowed to
   * say "now": the real clock in the showroom's timezone. Everything else on
   * the stage is a capability or a place we cover, never invented telemetry.
   *
   * Null until the browser fills it in. The home page is prerendered, so a
   * build-time value would be baked into the HTML and then contradicted at
   * hydration; afterNextRender never runs on the server, which avoids that.
   */
  readonly qatarTime = signal<string | null>(null);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    afterNextRender(() => {
      this.tick();
      this.timer = setInterval(() => this.tick(), 30_000);
    });
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private tick(): void {
    this.qatarTime.set(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Qatar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date()),
    );
  }
}
