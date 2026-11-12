import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HERO_ROUTES, MAP_H, MAP_W, MARKER_SEEDS, QATAR_PATH } from '../hero/hero.component';

/**
 * The home page's Qatar map — same outline, sites, routes out of Doha and radar sweep, drawn with the same global
 * .qh-* styles, so it looks and moves exactly like the hero. Used on the sign-in page.
 */
@Component({
  selector: 'app-qatar-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qh-map-wrap">
      <svg class="qh-map" [attr.viewBox]="'0 0 ' + mapW + ' ' + mapH" preserveAspectRatio="none">
        <defs>
          <pattern id="qmDots" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="2.2" cy="2.2" r="1.5" /></pattern>
          <clipPath id="qmLand"><path [attr.d]="qatarPath" /></clipPath>
          <radialGradient id="qmFadeGrad" cx="52%" cy="50%" r="50%">
            <stop offset="0.45" stop-color="#fff" /><stop offset="0.98" stop-color="#000" />
          </radialGradient>
          <mask id="qmFade"><rect [attr.width]="mapW" [attr.height]="mapH" fill="url(#qmFadeGrad)" /></mask>

        </defs>
        <!-- Real satellite view of Qatar: NASA MODIS (Terra), 20 Oct 2025, cut to this map's exact frame. -->
        <image class="qh-sat" href="/maps/qatar-satellite.jpg" x="0" y="0" [attr.width]="mapW" [attr.height]="mapH"
          preserveAspectRatio="none" mask="url(#qmFade)" />
        <g clip-path="url(#qmLand)">
          <rect class="qh-land" [attr.width]="mapW" [attr.height]="mapH" />
          <rect class="qh-fill" [attr.width]="mapW" [attr.height]="mapH" fill="url(#qmDots)" />
        </g>
        <path class="qh-coast" [attr.d]="qatarPath" />
        <g class="qh-rings">
          <circle cx="332" cy="386" r="58" /><circle cx="332" cy="386" r="112" /><circle cx="332" cy="386" r="172" />
        </g>
        @for (route of routes; track route) { <path class="qh-route" [attr.d]="route" /> }
        @for (m of markers; track m.name) {
          <circle class="qh-dot" [class.is-hub]="m.hub" [attr.cx]="m.x" [attr.cy]="m.y" [attr.r]="m.hub ? 6 : 3.4" />
        }
      </svg>
      <div class="qh-sweep"></div>
      @for (m of markers; track m.name) {
        @if (!m.quiet) {
          <span class="qh-label" [class.is-hub]="m.hub" [style.left]="m.leftPct" [style.top]="m.topPct">{{ m.name }}</span>
        }
      }
    </div>
  `,
  styles: `:host { position: absolute; inset: 0; display: block; }`,
})
export class QatarMapComponent {
  protected readonly mapW = MAP_W;
  protected readonly mapH = MAP_H;
  protected readonly qatarPath = QATAR_PATH;
  protected readonly routes = HERO_ROUTES;
  protected readonly markers = MARKER_SEEDS.map((seed) => ({ ...seed, leftPct: `${(seed.x / MAP_W) * 100}%`, topPct: `${(seed.y / MAP_H) * 100}%` }));
}
