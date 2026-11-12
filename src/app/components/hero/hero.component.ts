import { Component, ChangeDetectionStrategy, OnDestroy, afterNextRender, signal } from '@angular/core';

/**
 * The Qatar outline is drawn in this user space. Every marker, route and ring
 * below is expressed in it, and the HTML labels are positioned by converting
 * the same numbers to a percentage of it — so the SVG and the labels sitting
 * on top of it cannot drift apart when the stage is resized.
 */
export const MAP_W = 400;
export const MAP_H = 720;

/**
 * Qatar's real coastline — Natural Earth 1:10m (public domain), 239 points — mapped with
 * x = (lon - 50.70) * 400,  y = (26.25 - lat) * 400.
 */
export const QATAR_PATH =
  'M43.1 601.3 L50.7 600.5 L61.1 592 L63.9 581.8 L60.4 543.7 L57.1 533.6 L40 504.5 L38.7 498.6 L43 487.3 L43.9 479.5 L43.4 472.3 L41 469.2 L30.3 463.3 L27.4 449.7 L26.8 435 L23.1 425.5 L26 418.3 L25.4 409.9 L23.6 401 L23.1 392.3 L26.3 370.6 L26.1 362.2 L20.4 332.2 L25 314.9 L25.5 307 L20.4 302.1 L31.2 289.2 L38.8 288 L43.4 293.1 L44.7 300.4 L48.2 303.5 L48.2 311.3 L58.9 313.1 L52.5 296.9 L51.2 290 L50.7 282.8 L51.4 278.3 L52.9 273.5 L53.1 268.6 L50.7 263.6 L47.4 261.7 L38.6 260.2 L34 258.2 L38.6 253.1 L43.8 251.8 L49.4 251.1 L54.8 248.5 L56.1 246.2 L58.6 240.1 L60.2 238.8 L62.9 239.7 L65.4 243.4 L68.4 244.3 L70.5 247.3 L69.7 254 L67.1 264.9 L67.1 273.2 L67.5 276.2 L70.7 283.8 L72.6 285.9 L75.5 288.2 L79.5 287.1 L80.3 286.1 L80 284.1 L81.7 274.7 L81.9 265.2 L83.7 260.9 L88.2 256.7 L91 257.9 L94.3 260.7 L99.8 260.9 L102.4 258.1 L108 246.5 L111 241.5 L100 245.4 L89.7 247.1 L81.3 244 L75.5 233.3 L75 227.6 L77.9 208.8 L78.9 207 L82.8 204 L83.7 202 L83.2 200.3 L81.1 197.9 L80.7 196.2 L80.7 184.2 L86.2 185.4 L88.1 182.2 L89.4 177.9 L93.1 175.8 L95.9 177.1 L98.2 180.6 L99.7 185.2 L99.8 189.9 L105.5 186.4 L109.2 181 L110.4 174.5 L108.3 167.8 L105.6 170.5 L99.8 164.8 L100.5 156.3 L110.9 133.4 L112.6 125.7 L113.7 107.5 L117 109.7 L118.2 110.9 L119.4 113.2 L121.9 113.2 L130.9 89.2 L138.9 78.8 L150.4 74.4 L156.4 73.2 L173.3 67.2 L176.7 64.9 L178.9 58.8 L188.2 50.2 L190.4 44.2 L197.7 46.6 L205.9 44.3 L220.5 36 L252.3 51.5 L258.7 58 L259.4 65.7 L258.5 75.7 L258.9 84.4 L263.1 88.1 L270.7 90.8 L273 97.5 L273.4 105.8 L275.4 113.2 L281.6 118.4 L286.6 119.2 L289.7 119.7 L307 118.4 L316.8 119.2 L324.8 121.6 L331.8 125.1 L338.4 129.6 L343.8 134.5 L348.1 140.6 L351 147.7 L357.9 191.2 L357.8 196.7 L356.6 201.3 L353.4 203.3 L351.1 202 L348.8 196.2 L345.3 194.8 L342.2 196.5 L339.3 200.5 L337.8 205.1 L338.4 208.8 L342 211.7 L345.5 211.4 L348.1 209 L349.6 206 L356 215.2 L350.7 224.5 L342.7 227.3 L341.2 217 L335.7 218.4 L322.1 225.1 L327.9 227.3 L334 230.7 L338.9 234.7 L341.2 238.8 L339.8 247.5 L334.4 251 L327.5 252.5 L322.1 255.2 L319.3 253.6 L316.6 252.7 L317.5 273.7 L316.6 279.7 L314.3 283.8 L311 287.6 L308.8 291.4 L309.7 295.2 L324.4 318.3 L326.8 323.9 L327.5 329.5 L326.3 346.9 L324.8 367.9 L325.3 376.7 L327.5 381.2 L332.5 383.1 L356 386.5 L359.7 390 L363 398 L364.4 405 L365.8 412.1 L366.6 445.1 L362.3 486.3 L364.4 491.1 L360.9 494.5 L354.8 518.6 L349.6 526.2 L335.8 540.5 L331.5 550.2 L328.3 551.8 L324.7 552.9 L322.1 554.4 L320.1 557.9 L309.7 594.2 L309.1 596.2 L307 600.5 L302.3 603.7 L300.1 611.3 L297.4 628.1 L292.2 634.2 L276 643 L272.6 646 L270.5 655.2 L265.4 661.5 L259.9 666.5 L256.2 672 L251.6 666.1 L253.1 660.5 L256.7 654.1 L258.7 646 L255.6 641.5 L248.5 640.7 L234.4 642 L233.8 635 L231.2 634.8 L227.2 637.5 L221.8 639.3 L214.8 640 L208.4 642.3 L205 646.5 L205.9 649.1 L179 669.5 L158.2 675.9 L135.6 676.1 L111.6 672.9 L91.4 665.1 L72.4 645.4 L43.1 601.3 Z';

export interface MarkerSeed {
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

export const MARKER_SEEDS: MarkerSeed[] = [
  // Real positions, from each place's latitude and longitude with the same mapping as the coastline.
  { name: 'Ras Laffan', x: 338, y: 138 },
  { name: 'Al Khor', x: 322, y: 226 },
  { name: 'Lusail', x: 316, y: 328 },
  { name: 'Doha', x: 332, y: 386, hub: true },
  { name: 'Al Wakrah', x: 362, y: 432 },
  { name: 'Mesaieed', x: 340, y: 504 },
  { name: 'Dukhan', x: 32, y: 328, quiet: true },
  { name: 'Zekreet', x: 56, y: 308, quiet: true },
];

/** Routes out of Doha — shared with the sign-in page's map. */
export const HERO_ROUTES: string[] = [
    'M332 386 Q392 250 338 138',
    'M332 386 Q374 300 322 226',
    'M332 386 Q358 348 316 328',
    'M332 386 Q386 400 362 432',
    'M332 386 Q396 440 340 504',
    'M332 386 Q180 300 32 328',
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
  readonly routes: string[] = HERO_ROUTES;

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
