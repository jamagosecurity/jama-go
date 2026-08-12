/**
 * Site-pin helpers: reading whatever an admin pastes into the DIA form, and
 * turning a stored pin into a link a technician can tap to start driving.
 *
 * Mirrors SiteCoordinates on the API — same ranges, same 6-decimal precision,
 * same refusal of (0, 0) — so a pin that passes here is not rejected on save.
 */

export interface SiteCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}

/** A record that may carry a pin, plus the address to fall back on. */
export interface SitePlace {
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly clientLocation: string;
}

export const LATITUDE_LIMIT = 90;
export const LONGITUDE_LIMIT = 180;

/** ~0.11 m at the equator. Matches SiteCoordinates.Precision on the API. */
const PRECISION = 6;

/**
 * Google's cross-platform Maps URLs: these open the native app on Android and
 * iOS and the web map on desktop, so one link works for every technician
 * without sniffing the user agent.
 */
const DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1&destination=';
const SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';

const NUMBER = String.raw`-?\d+(?:\.\d+)?`;

/**
 * Ordered on purpose: a maps URL contains several number pairs (zoom level,
 * viewport) and only the marked ones are the place, so the explicit forms are
 * tried before anything that looks like a bare pair.
 */
const URL_PATTERNS: readonly RegExp[] = [
  new RegExp(String.raw`@(${NUMBER}),(${NUMBER})`), // /maps/@25.286106,51.534817,17z
  new RegExp(String.raw`!3d(${NUMBER})!4d(${NUMBER})`), // /maps/place/... place pin
  new RegExp(
    String.raw`[?&](?:q|query|ll|sll|center|destination|daddr|mlat)=(${NUMBER})(?:,|%2C)(${NUMBER})`,
    'i',
  ),
  new RegExp(String.raw`^geo:(${NUMBER}),(${NUMBER})`, 'i'), // geo: URI from a share sheet
];

/** "25.286106, 51.534817" — also accepts a space or semicolon separator. */
const PLAIN_PAIR = new RegExp(String.raw`^(${NUMBER})\s*[,;\s]\s*(${NUMBER})$`);

/** "25.286106° N, 51.534817° E" — what a phone's compass app copies. */
const HEMISPHERE_PAIR = new RegExp(
  String.raw`^(${NUMBER})\s*°?\s*([NS])\s*[,;\s]\s*(${NUMBER})\s*°?\s*([EW])$`,
  'i',
);

/** 25°17'10.0"N 51°32'05.3"E — the form Google Maps shows in its own UI. */
const DMS_PART = String.raw`(\d{1,3})\s*[°:\s]\s*(\d{1,2})\s*['′:\s]\s*(\d{1,2}(?:\.\d+)?)?\s*["″]?\s*([NSEW])`;
const DMS_PAIR = new RegExp(String.raw`^${DMS_PART}\s*[, ]\s*${DMS_PART}$`, 'i');

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= LATITUDE_LIMIT;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= LONGITUDE_LIMIT;
}

/**
 * A pin is usable only when both halves are present and in range. (0, 0) is in
 * the Atlantic: in practice it means a paste or a conversion went wrong, and
 * sending a technician there is worse than showing no pin at all.
 */
export function toSitePin(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): SiteCoordinates | null {
  if (latitude == null || longitude == null) return null;
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude: round(latitude), longitude: round(longitude) };
}

/**
 * Pulls a pin out of pasted text: a coordinate pair in any of the usual
 * notations, or a Google Maps / geo: link. Returns null when there is nothing
 * usable in it, so callers can leave the field alone and let the paste land as
 * plain text.
 */
export function parseCoordinates(text: string): SiteCoordinates | null {
  const value = text.trim();
  if (!value) return null;

  for (const pattern of URL_PATTERNS) {
    const match = pattern.exec(value);
    const pin = match && toSitePin(Number(match[1]), Number(match[2]));
    if (pin) return pin;
  }

  const plain = PLAIN_PAIR.exec(value);
  if (plain) return toSitePin(Number(plain[1]), Number(plain[2]));

  const hemisphere = HEMISPHERE_PAIR.exec(value);
  if (hemisphere) {
    return toSitePin(
      signed(Number(hemisphere[1]), hemisphere[2]),
      signed(Number(hemisphere[3]), hemisphere[4]),
    );
  }

  const dms = DMS_PAIR.exec(value);
  if (dms) {
    const first = fromDms(dms[1], dms[2], dms[3], dms[4]);
    const second = fromDms(dms[5], dms[6], dms[7], dms[8]);
    // Either order is accepted — "51°E 25°N" is a legitimate way to write it.
    return isLatitudeHemisphere(dms[4])
      ? toSitePin(first, second)
      : toSitePin(second, first);
  }

  return null;
}

/**
 * Whether the text is a link rather than something the user meant to type. A
 * shortened share link (maps.app.goo.gl/…) carries no coordinates until it is
 * opened, and that is the commonest thing to paste from a phone — worth saying
 * so rather than letting it land in the box as "not a number".
 */
export function looksLikeLink(text: string): boolean {
  return /^(?:https?:\/\/|geo:|www\.)/i.test(text.trim());
}

/** "25.286106, 51.534817" — the form that pastes cleanly back into any map. */
export function formatCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string {
  const pin = toSitePin(latitude, longitude);
  return pin ? `${pin.latitude}, ${pin.longitude}` : '';
}

/**
 * Where the "Navigate" button goes. A pinned site routes to the exact
 * coordinates; an unpinned one falls back to a map search on the address, so
 * every site stays navigable while the register is being pinned.
 */
export function navigationUrl(site: SitePlace): string {
  const pin = toSitePin(site.latitude, site.longitude);
  return pin
    ? `${DIRECTIONS_URL}${pin.latitude},${pin.longitude}`
    : `${SEARCH_URL}${encodeURIComponent(site.clientLocation)}`;
}

/** Drops a marker without starting directions — used to check a pin before saving. */
export function mapPreviewUrl(latitude: number, longitude: number): string {
  return `${SEARCH_URL}${latitude},${longitude}`;
}

function round(value: number): number {
  return Number(value.toFixed(PRECISION));
}

function signed(value: number, hemisphere: string): number {
  return /[SW]/i.test(hemisphere) ? -Math.abs(value) : Math.abs(value);
}

function isLatitudeHemisphere(hemisphere: string): boolean {
  return /[NS]/i.test(hemisphere);
}

function fromDms(
  degrees: string,
  minutes: string,
  seconds: string | undefined,
  hemisphere: string,
): number {
  const decimal = Number(degrees) + Number(minutes) / 60 + Number(seconds ?? 0) / 3600;
  return signed(decimal, hemisphere);
}
