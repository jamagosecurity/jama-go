import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewEncapsulation, afterNextRender, inject, input } from '@angular/core';
import { QATAR_BORDER } from './qatar-border';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Flight {
  id: string; callsign: string; country: string; latitude: number; longitude: number;
  altitudeMetres: number | null; headingDegrees: number | null; speedMetresPerSecond: number | null; onGround: boolean;
}
const FLIGHT_POLL_MS = 45_000;
const PLANE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c.8 0 1.3.7 1.3 1.6v5.6l7.7 4.6v2l-7.7-2.4v4.4l2.2 1.7v1.6L12 20.2l-3.5 0.9v-1.6l2.2-1.7v-4.4L3 15.8v-2l7.7-4.6V3.6C10.7 2.7 11.2 2 12 2z"/></svg>';

/** Jama Go, Doha. */
const DOHA: [number, number] = [25.2854, 51.531];

/** Area names, shown at every zoom. */
const AREAS: { name: string; at: [number, number]; minZoom?: number }[] = [
  { name: 'Doha', at: [25.2854, 51.531] },
  { name: 'Lusail', at: [25.43, 51.49] },
  { name: 'Al Wakrah', at: [25.171, 51.604] },
  { name: 'Al Khor', at: [25.684, 51.505] },
  { name: 'Al Rayyan', at: [25.29, 51.42], minZoom: 10 },
  { name: 'Umm Salal', at: [25.415, 51.405], minZoom: 10 },
  { name: 'Dukhan', at: [25.43, 50.78] },
  { name: 'Mesaieed', at: [24.99, 51.55] },
  { name: 'Al Shamal', at: [26.12, 51.2] },
  { name: 'Ras Laffan', at: [25.905, 51.545] },
];

/** Landmarks. The Doha ones only appear once you zoom in, so the city never turns into a pile of labels. */
const LANDMARKS: { name: string; at: [number, number]; minZoom: number }[] = [
  { name: 'Al Zubarah Fort', at: [25.977, 51.028], minZoom: 0 },
  { name: 'Khor Al Adaid · Inland Sea', at: [24.62, 51.33], minZoom: 0 },
  { name: 'Hamad Int. Airport', at: [25.2731, 51.6081], minZoom: 10 },
  { name: 'Museum of Islamic Art', at: [25.2958, 51.5393], minZoom: 10 },
  { name: 'The Pearl-Qatar', at: [25.3713, 51.5513], minZoom: 10 },
  { name: 'Katara Cultural Village', at: [25.36, 51.5256], minZoom: 10 },
  { name: 'Lusail Stadium', at: [25.4207, 51.4904], minZoom: 10 },
  { name: 'Aspire Tower', at: [25.2635, 51.444], minZoom: 10 },
];
/** All of Qatar, with a little sea around it. */
const QATAR: [[number, number], [number, number]] = [[24.45, 50.72], [26.2, 51.68]];

/**
 * A live satellite map of Qatar (Esri World Imagery) — the real view, with only a pin where Jama Go is. Loaded in the browser only, after the page has rendered.
 */
@Component({
  selector: 'app-live-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<div class="lm-map"></div>`,
  styles: `
    app-live-map { position: absolute; inset: 0; display: block; }
    app-live-map .lm-map { position: absolute; inset: 0; background: #06102a; }
    app-live-map .leaflet-container { font: inherit; background: #06102a; }
    /* The imagery licence requires this credit; it stays, as small and quiet as legibility allows. */
    app-live-map .leaflet-control-attribution { padding: 0 4px; background: transparent; color: rgba(169, 180, 204, 0.55); font-size: 8.5px; letter-spacing: 0.02em; }
    app-live-map .leaflet-control-attribution a { color: #d9d4bd; }
    app-live-map .leaflet-bar a { background: rgba(6, 16, 42, 0.85); color: #eef1f8; border-color: rgba(217, 212, 189, 0.3); }
    app-live-map .lm-hub { animation: lm-throb 2.6s ease-in-out infinite; }
    app-live-map .lm-border { filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.6)); }
    app-live-map .lm-area span, app-live-map .lm-landmark span {
      position: absolute; transform: translate(-50%, -50%); white-space: nowrap; color: #fff;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95), 0 0 10px rgba(0, 0, 0, 0.6); pointer-events: none;
    }
    app-live-map .lm-area span { font-size: 11px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
    app-live-map .lm-landmark i {
      position: absolute; width: 7px; height: 7px; transform: translate(-50%, -50%) rotate(45deg);
      background: #e4d7a8; box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.45), 0 0 8px rgba(228, 215, 168, 0.8);
    }
    app-live-map .lm-landmark span { transform: translate(8px, -50%); font-size: 11px; font-weight: 600; font-style: italic; color: #f3ead0; }
    app-live-map .leaflet-tooltip.lm-hq {
      padding: 3px 9px; border: 1px solid rgba(217, 212, 189, 0.6); border-radius: 6px; background: rgba(6, 16, 42, 0.82);
      color: #f1e7c4; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; box-shadow: none;
    }
    app-live-map .leaflet-tooltip.lm-hq::before { display: none; }
    app-live-map .lm-plane span { display: block; width: 22px; height: 22px; transition: transform 0.6s ease; }
    app-live-map .lm-plane svg { width: 22px; height: 22px; fill: #fff7dc; filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 6px rgba(228, 215, 168, 0.7)); }
    app-live-map .lm-plane.is-ground svg { fill: #b9c2d6; opacity: 0.7; transform: scale(0.75); }
    app-live-map .leaflet-marker-icon.lm-plane { transition: transform 1s linear; }
    app-live-map .leaflet-tooltip.lm-flight-tip {
      padding: 3px 8px; border: 1px solid rgba(217, 212, 189, 0.5); border-radius: 6px; background: rgba(6, 16, 42, 0.88);
      color: #f1e7c4; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; box-shadow: none;
    }
    app-live-map .leaflet-tooltip.lm-flight-tip::before { display: none; }
    @keyframes lm-throb { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
    @media (prefers-reduced-motion: reduce) { app-live-map .lm-hub { animation: none; } }
  `,
})
export class LiveMapComponent implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly http = inject(HttpClient);
  /** Show live aircraft. On for the sign-in page; off where the page has nothing to do with them. */
  readonly flights = input(true);
  private pollTimer?: ReturnType<typeof setInterval>;
  private moveTimer?: ReturnType<typeof setInterval>;
  private map?: import('leaflet').Map;
  private resize?: ResizeObserver;

  constructor() {
    afterNextRender(async () => {
      // Leaflet ships as CommonJS: its API is the default export once bundled.
      const module = await import('leaflet');
      const L = ((module as unknown as { default?: typeof module }).default ?? module) as typeof import('leaflet');
      const element = this.host.nativeElement.querySelector('.lm-map') as HTMLElement;
      const phone = window.innerWidth < 1080;

      const map = L.map(element, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
        dragging: !phone,
        touchZoom: !phone,
        doubleClickZoom: !phone,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0.25,
      });
      map.attributionControl.setPosition('bottomleft').setPrefix(false);
      // + and − zoom around the middle of the open space where Qatar is, not the middle of the screen (behind the panels).
      if (!phone) {
        const ZoomHere = L.Control.extend({
          onAdd: () => {
            const bar = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            const button = (label: string, title: string, step: number) => {
              const a = L.DomUtil.create('a', '', bar) as HTMLAnchorElement;
              a.href = '#'; a.textContent = label; a.title = title; a.setAttribute('role', 'button'); a.setAttribute('aria-label', title);
              L.DomEvent.on(a, 'click', (e) => {
                L.DomEvent.preventDefault(e);
                const panel = document.querySelector('[data-map-reserve]');
                const openWidth = panel ? panel.getBoundingClientRect().left : element.clientWidth;
                map.setZoomAround(L.point(openWidth / 2, element.clientHeight / 2), map.getZoom() + step);
              });
              L.DomEvent.disableClickPropagation(a);
            };
            button('+', 'Zoom in', 1);
            button('−', 'Zoom out', -1);
            return bar;
          },
        });
        new ZoomHere({ position: 'bottomleft' }).addTo(map);
      }

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: this.flights() ? 'Imagery © Esri, Maxar, Earthstar Geographics · Flights: OpenSky Network' : 'Imagery © Esri, Maxar, Earthstar Geographics',
      }).addTo(map);

      // Qatar's border: one thin line, the real outline.
      L.polyline([...QATAR_BORDER, QATAR_BORDER[0]], { color: '#f4f1e4', weight: 1.4, opacity: 0.8, interactive: false, className: 'lm-border' }).addTo(map);

      // Area names: plain white, small capitals, shadowed so they read on sand and sea alike.
      const areaLayers: { layer: import('leaflet').Marker; minZoom: number }[] = [];
      for (const area of AREAS) {
        if (area.name === 'Doha') continue;   // Doha is labelled by the Jama Go pin below
        const layer = L.marker(area.at, { icon: L.divIcon({ className: 'lm-area', html: `<span>${area.name}</span>`, iconSize: [0, 0] }), interactive: false, keyboard: false });
        areaLayers.push({ layer, minZoom: area.minZoom ?? 0 });
      }

      // Landmarks: a small gold diamond and the name.
      const landmarkLayers: { layer: import('leaflet').Marker; minZoom: number }[] = [];
      for (const place of LANDMARKS) {
        const marker = L.marker(place.at, {
          icon: L.divIcon({ className: 'lm-landmark', html: `<i></i><span>${place.name}</span>`, iconSize: [0, 0] }),
          interactive: false,
          keyboard: false,
        });
        landmarkLayers.push({ layer: marker, minZoom: place.minZoom });
      }
      const showLandmarks = () => {
        for (const { layer, minZoom } of [...areaLayers, ...landmarkLayers]) {
          if (map.getZoom() >= minZoom) layer.addTo(map); else layer.remove();
        }
      };
      map.on('zoomend', showLandmarks);

      // One pin: where Jama Go is. Nothing else drawn on the photo, so it reads as the real place.
      L.circleMarker(DOHA, { radius: 7, color: '#ffffff', weight: 2, fillColor: '#d9b85c', fillOpacity: 1, className: 'lm-hub' })
        .bindTooltip('Doha · Jama Go', { direction: 'top', offset: [0, -10], permanent: true, className: 'lm-hq' })
        .addTo(map);

      // On a wide screen the clock and the sign-in card cover the right of the page, so all of Qatar is fitted into the
      // open space on the left; on a phone it sits centred behind everything.
      const fit = () => {
        const width = element.clientWidth;
        // Keep the whole country clear of whatever sits on the right (the clock panel on the sign-in page).
        const panel = window.innerWidth >= 1080 ? document.querySelector('[data-map-reserve]') : null;
        const right = panel ? Math.max(20, Math.round(width - panel.getBoundingClientRect().left + 24)) : 20;
        map.fitBounds(QATAR, { paddingTopLeft: [24, 24], paddingBottomRight: [right, 24], animate: false });
      };
      fit();
      showLandmarks();
      this.map = map;
      if (this.flights()) this.startFlights(L, map);
      this.resize = new ResizeObserver(() => { if (this.map !== map) return; map.invalidateSize({ animate: false }); fit(); });
      this.resize.observe(element);
      this.map = map;
    });
  }

  /**
   * Live aircraft over Qatar: positions every 45 seconds from our server (which shares one OpenSky fetch between all
   * visitors), and in between each plane glides along its heading at its speed, so they move smoothly.
   */
  private startFlights(L: typeof import('leaflet'), map: import('leaflet').Map): void {
    const planes = new Map<string, { marker: import('leaflet').Marker; flight: Flight; at: number }>();

    const icon = (flight: Flight) => L.divIcon({
      className: `lm-plane${flight.onGround ? ' is-ground' : ''}`,
      html: `<span style="transform: rotate(${flight.headingDegrees ?? 0}deg)">${PLANE_SVG}</span>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    const label = (flight: Flight) => {
      const name = flight.callsign || 'Aircraft';
      if (flight.onGround) return `${name} · on the ground`;
      const feet = flight.altitudeMetres != null ? `${Math.round(flight.altitudeMetres * 3.28084).toLocaleString()} ft` : '';
      const kmh = flight.speedMetresPerSecond != null ? `${Math.round(flight.speedMetresPerSecond * 3.6)} km/h` : '';
      return [name, feet, kmh].filter(Boolean).join(' · ');
    };

    const load = () => {
      if (document.visibilityState !== 'visible' || !this.map) return;
      this.http.get<{ data: Flight[] }>(`${environment.apiUrl}/flights/qatar`).subscribe({
        next: (result) => {
          if (!this.map) return;
          const seen = new Set<string>();
          for (const flight of result.data ?? []) {
            seen.add(flight.id);
            const existing = planes.get(flight.id);
            if (existing) {
              existing.flight = flight; existing.at = Date.now();
              existing.marker.setLatLng([flight.latitude, flight.longitude]).setIcon(icon(flight)).setTooltipContent(label(flight));
            } else {
              const marker = L.marker([flight.latitude, flight.longitude], { icon: icon(flight), keyboard: false })
                .bindTooltip(label(flight), { direction: 'top', offset: [0, -10], className: 'lm-flight-tip' })
                .addTo(map);
              planes.set(flight.id, { marker, flight, at: Date.now() });
            }
          }
          for (const [id, plane] of planes) {
            if (!seen.has(id)) { plane.marker.remove(); planes.delete(id); }
          }
        },
        error: () => { /* no planes this time; the map itself is unaffected */ },
      });
    };

    // Between updates each airborne plane moves along its track at its speed.
    const glide = () => {
      const now = Date.now();
      for (const plane of planes.values()) {
        const { flight } = plane;
        if (flight.onGround || flight.speedMetresPerSecond == null || flight.headingDegrees == null) continue;
        const seconds = (now - plane.at) / 1000;
        const metres = flight.speedMetresPerSecond * seconds;
        const heading = (flight.headingDegrees * Math.PI) / 180;
        const lat = flight.latitude + (metres * Math.cos(heading)) / 111_320;
        const lon = flight.longitude + (metres * Math.sin(heading)) / (111_320 * Math.cos((flight.latitude * Math.PI) / 180));
        plane.marker.setLatLng([lat, lon]);
      }
    };

    load();
    this.pollTimer = setInterval(load, FLIGHT_POLL_MS);
    this.moveTimer = setInterval(glide, 1000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.moveTimer) clearInterval(this.moveTimer);
    this.resize?.disconnect();
    const map = this.map;
    this.map = undefined;
    if (map) { map.stop(); map.off(); map.remove(); }
  }
}
