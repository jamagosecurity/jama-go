import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { PrayerTime, formatMinutes, prayerTimes } from '../../utils/prayer-times.util';

const TIME_ZONE = 'Asia/Qatar';

function dohaParts(at: Date): { year: number; month: number; day: number; minutes: number; seconds: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), minutes: get('hour') * 60 + get('minute'), seconds: get('second') };
}

/** A slim live Doha panel: clock, Hijri and Gregorian dates, the next prayer with a countdown, and today's five times. */
@Component({
  selector: 'app-prayer-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pp">
      <span class="pp-chip"><i aria-hidden="true"></i>Live · Doha</span>
      <div class="pp-clock"><span class="pp-time">{{ clock().time }}</span><span class="pp-period">{{ clock().period }}</span></div>
      <p class="pp-date">@if (hijri()) { <b>{{ hijri() }}</b> }<span>{{ gregorian() }}</span></p>

      <div class="pp-next">
        <span class="pp-k">Next prayer</span>
        <strong>{{ next().prayer.name }} <em lang="ar">{{ next().prayer.arabic }}</em></strong>
        <span class="pp-at">{{ next().at }}</span>
        <span class="pp-count">{{ next().countdown }}</span>
      </div>

      <ol class="pp-list" aria-label="Today's prayer times in Doha">
        @for (p of prayers(); track p.key) {
          <li [attr.data-state]="stateOf(p)">
            <span class="pp-n">{{ p.name }}</span>
            <span class="pp-a" lang="ar">{{ p.arabic }}</span>
            <span class="pp-t">{{ format(p.minutes) }}</span>
          </li>
        }
      </ol>
    </div>
  `,
  styles: `
    :host { display: block; }
    :host(.is-stretched) .pp { height: 100%; align-content: space-between; }
    .pp {
      display: grid; gap: 14px; padding: 20px 18px; border-radius: 24px; color: #eef1f8;
      background: linear-gradient(160deg, rgba(14, 30, 66, 0.72), rgba(6, 16, 42, 0.62));
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 0 0 1px rgba(217, 212, 189, 0.28), 0 40px 80px -40px rgba(0, 0, 0, 0.9), inset 0 3px 0 rgba(217, 212, 189, 0.45);
    }
    .pp-chip { justify-self: start; display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid rgba(217, 212, 189, 0.35); border-radius: 999px; color: #d9d4bd; font-size: 0.66rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; }
    .pp-chip i { width: 7px; height: 7px; border-radius: 50%; background: #3ddc97; box-shadow: 0 0 0 3px rgba(61, 220, 151, 0.2); }
    .pp-clock { display: flex; align-items: baseline; gap: 8px; }
    .pp-time { font-family: Georgia, "Times New Roman", serif; font-size: 2.6rem; line-height: 1; font-variant-numeric: tabular-nums; background: linear-gradient(180deg, #fff, #c9d6f2); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .pp-period { color: #d9d4bd; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.16em; }
    .pp-date { display: grid; gap: 2px; margin: -6px 0 0; font-size: 0.8rem; color: #a9b4cc; }
    .pp-date b { color: #e6ebf6; font-weight: 600; }
    .pp-next { display: grid; gap: 2px; padding: 12px 14px; border-radius: 16px; background: rgba(217, 212, 189, 0.1); box-shadow: 0 0 0 1px rgba(217, 212, 189, 0.35); }
    .pp-k { color: #a9b4cc; font-size: 0.62rem; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; }
    .pp-next strong { font-family: Georgia, "Times New Roman", serif; font-weight: 400; font-size: 1.3rem; }
    .pp-next em { margin-left: 4px; color: #d9d4bd; font-style: normal; font-family: "Amiri", "Noto Naskh Arabic", "Geeza Pro", serif; }
    .pp-at { color: #e6ebf6; font-size: 0.82rem; font-weight: 700; }
    .pp-count { margin-top: 4px; color: #e9dcae; font: 400 1.35rem/1 ui-monospace, Menlo, monospace; letter-spacing: 0.06em; font-variant-numeric: tabular-nums; }
    .pp-list { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
    .pp-list li { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 10px; font-size: 0.82rem; }
    .pp-list li[data-state="past"] { opacity: 0.45; }
    .pp-list li[data-state="next"] { background: rgba(217, 212, 189, 0.16); box-shadow: 0 0 0 1px rgba(217, 212, 189, 0.45); }
    .pp-n { font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; font-size: 0.72rem; color: #e6ebf6; }
    .pp-a { color: #d9d4bd; font-family: "Amiri", "Noto Naskh Arabic", "Geeza Pro", serif; }
    .pp-t { color: #c7d0e4; font-weight: 700; font-variant-numeric: tabular-nums; min-width: 64px; text-align: right; }
  `,
})
export class PrayerPanelComponent {
  private readonly now = signal(new Date());
  private readonly doha = computed(() => dohaParts(this.now()));

  protected readonly clock = computed(() => {
    const [time, period] = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
      .format(this.now()).split(' ');
    return { time, period };
  });
  protected readonly gregorian = computed(() =>
    new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(this.now()));
  protected readonly hijri = computed(() => {
    try { return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric' }).format(this.now()); }
    catch { return ''; }
  });
  protected readonly prayers = computed<readonly PrayerTime[]>(() => {
    const { year, month, day } = this.doha();
    return prayerTimes({ year, month, day });
  });
  protected readonly next = computed(() => {
    const { minutes, seconds, year, month, day } = this.doha();
    const nowSeconds = minutes * 60 + seconds;
    let target = this.prayers().find((p) => p.minutes * 60 > nowSeconds);
    let left: number;
    if (target) left = target.minutes * 60 - nowSeconds;
    else {
      const t = new Date(Date.UTC(year, month - 1, day + 1));
      target = prayerTimes({ year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() })[0];
      left = 24 * 3600 - nowSeconds + target.minutes * 60;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return { prayer: target, at: formatMinutes(target.minutes), countdown: `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}` };
  });

  protected readonly format = formatMinutes;

  protected stateOf(p: PrayerTime): 'past' | 'next' | 'later' {
    const n = this.next().prayer;
    if (n.key === p.key && n.minutes === p.minutes) return 'next';
    return p.minutes <= this.doha().minutes ? 'past' : 'later';
  }

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
