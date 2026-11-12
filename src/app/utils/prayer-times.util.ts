/**
 * Prayer times for one place and day, computed in the browser (no service to call, nothing to fail).
 *
 * The standard astronomical method (as in PrayTimes.org): Fajr when the sun is 18° below the horizon, Dhuhr just after
 * solar noon, Asr when a shadow is its object's length plus the noon shadow (Shafi'i), Maghrib at sunset, and Isha 90
 * minutes after Maghrib — the Umm al-Qura convention used across the Gulf. Results can differ from the Ministry's
 * published table by a minute or two.
 */

export interface PrayerTime {
  readonly key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  readonly name: string;
  readonly arabic: string;
  /** Minutes after local midnight. */
  readonly minutes: number;
}

const DOHA = { latitude: 25.2854, longitude: 51.531, utcOffsetHours: 3 };

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const fix = (a: number, b: number) => ((a % b) + b) % b;

function julianDay(year: number, month: number, day: number): number {
  if (month <= 2) { year -= 1; month += 12; }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

function sun(jd: number): { declination: number; equation: number } {
  const d = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * d, 360);
  const q = fix(280.459 + 0.98564736 * d, 360);
  const l = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360);
  const e = 23.439 - 0.00000036 * d;
  const ra = fix(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(l)), Math.cos(rad(l)))) / 15, 24);
  return { declination: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(l)))), equation: q / 15 - ra };
}

export function prayerTimes(date: { year: number; month: number; day: number }, place = DOHA): PrayerTime[] {
  const jd = julianDay(date.year, date.month, date.day) - place.longitude / (15 * 24);
  const noon = (t: number) => fix(12 - sun(jd + t).equation, 24);
  const angleTime = (angle: number, t: number, before: boolean) => {
    const { declination } = sun(jd + t);
    const x = (-Math.sin(rad(angle)) - Math.sin(rad(declination)) * Math.sin(rad(place.latitude)))
      / (Math.cos(rad(declination)) * Math.cos(rad(place.latitude)));
    const hours = deg(Math.acos(Math.max(-1, Math.min(1, x)))) / 15;
    return noon(t) + (before ? -hours : hours);
  };
  const asr = (t: number) => {
    const { declination } = sun(jd + t);
    const angle = -deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(place.latitude - declination))))));
    return angleTime(angle, t, false);
  };

  // Two passes, each refining the guess the way the reference method does.
  let t = { fajr: 5, dhuhr: 12, asr: 13, maghrib: 18 };
  for (let i = 0; i < 2; i++) {
    t = {
      fajr: angleTime(18, t.fajr / 24, true),
      dhuhr: noon(t.dhuhr / 24),
      asr: asr(t.asr / 24),
      maghrib: angleTime(0.833, t.maghrib / 24, false),
    };
  }
  const local = (h: number) => Math.round((h + place.utcOffsetHours - place.longitude / 15) * 60);
  const maghrib = local(t.maghrib);
  return [
    { key: 'fajr', name: 'Fajr', arabic: 'الفجر', minutes: local(t.fajr) },
    { key: 'dhuhr', name: 'Dhuhr', arabic: 'الظهر', minutes: local(t.dhuhr) + 1 },
    { key: 'asr', name: 'Asr', arabic: 'العصر', minutes: local(t.asr) },
    { key: 'maghrib', name: 'Maghrib', arabic: 'المغرب', minutes: maghrib },
    { key: 'isha', name: 'Isha', arabic: 'العشاء', minutes: maghrib + 90 },
  ];
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
