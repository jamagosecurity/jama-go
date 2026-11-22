import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { CashHandover, CashKind, OnlinePayment, OnlinePayments, PendingHandover, PendingHandovers } from '../../../models/cash-handover.model';
import { CashHandoverService } from '../../../services/cash-handover.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

/** A day in Doha as yyyy-MM-dd, counted from today. */
const dohaDay = (offsetDays = 0): string =>
  new Date(Date.now() + 3 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);

/**
 * The accountant's panel. At the end of the day each person hands over the cash they collected: the accountant sees
 * what the system has for them, counts it, and records it. MOI and Non-MOI are separate. Any difference needs a note.
 * Online transfers are listed underneath to be checked against the bank.
 */
@Component({
  selector: 'app-cash-handover',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cash-handover.component.html',
  styleUrl: './cash-handover.component.css',
})
export class CashHandoverComponent implements OnInit {
  private readonly api = inject(CashHandoverService);

  protected readonly kind = signal<CashKind>('nonmoi');
  protected readonly pendingMoi = signal<PendingHandovers | null>(null);
  protected readonly pendingNon = signal<PendingHandovers | null>(null);
  protected readonly history = signal<CashHandover[]>([]);
  protected readonly online = signal<OnlinePayments | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly flash = signal('');

  protected readonly today = dohaDay();
  protected readonly period = signal<'today' | 'yesterday' | 'week'>('today');

  /** The person being counted right now (their collector id, or 'office'), if any. */
  protected readonly openKey = signal<string | null>(null);
  protected readonly counted = signal('');
  protected readonly note = signal('');
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly pending = computed(() => (this.kind() === 'moi' ? this.pendingMoi() : this.pendingNon()));
  protected readonly groups = computed(() => this.pending()?.groups ?? []);
  protected readonly waitingMoi = computed(() => this.pendingMoi()?.total ?? 0);
  protected readonly waitingNon = computed(() => this.pendingNon()?.total ?? 0);
  protected readonly waitingAll = computed(() => this.waitingMoi() + this.waitingNon());
  protected readonly peopleMoi = computed(() => this.pendingMoi()?.groups.length ?? 0);
  protected readonly peopleNon = computed(() => this.pendingNon()?.groups.length ?? 0);
  protected readonly receivedTotal = computed(() => this.history().reduce((n, h) => n + h.received, 0));
  protected readonly differenceTotal = computed(() => this.history().reduce((n, h) => n + h.difference, 0));

  protected readonly range = computed(() => {
    const p = this.period();
    return p === 'today' ? { from: this.today, to: this.today }
      : p === 'yesterday' ? { from: dohaDay(-1), to: dohaDay(-1) }
      : { from: dohaDay(-6), to: this.today };
  });

  // ----- the count being typed -----
  protected readonly countedValue = computed(() => {
    const text = this.counted().replace(/,/g, '').trim();
    if (!text) return NaN;
    const value = Number(text);
    return Number.isFinite(value) && /^\d+(\.\d{1,2})?$/.test(text) ? value : NaN;
  });
  protected readonly expected = computed(() => this.groups().find((g) => this.keyOf(g) === this.openKey())?.total ?? 0);
  /** Counted minus what the system expects: below zero is missing, above is extra; null while the amount is not a number. */
  protected readonly difference = computed(() => {
    const value = this.countedValue();
    return Number.isNaN(value) ? null : Math.round((value - this.expected()) * 100) / 100;
  });
  protected readonly countedError = computed(() => {
    if (!this.counted().trim()) return 'Type the amount you counted.';
    return Number.isNaN(this.countedValue()) ? 'Enter the amount as a number, like 500 or 120.50.' : '';
  });
  protected readonly noteError = computed(() => {
    const diff = this.difference();
    return diff !== null && diff !== 0 && !this.note().trim() ? 'Write a short note saying why the amount is different.' : '';
  });
  protected readonly canConfirm = computed(() => !this.saving() && !this.countedError() && !this.noteError());

  ngOnInit(): void {
    this.loadAll();
  }

  protected keyOf(g: PendingHandover): string {
    return g.collectorId ?? 'office';
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  protected person(name: string | null | undefined): string {
    return (name ?? '').replace(/\s*<[^>]*>\s*$/, '').trim();
  }

  protected pickKind(kind: CashKind): void {
    if (kind === this.kind()) return;
    this.kind.set(kind);
    this.openKey.set(null);
    this.flash.set('');
    this.loadPeriod();
  }

  protected pickPeriod(period: 'today' | 'yesterday' | 'week'): void {
    this.period.set(period);
    this.loadPeriod();
  }

  protected open(g: PendingHandover): void {
    if (this.openKey() === this.keyOf(g)) { this.openKey.set(null); return; }
    this.openKey.set(this.keyOf(g));
    this.counted.set(g.total.toFixed(2));
    this.note.set('');
    this.formError.set('');
    this.flash.set('');
  }

  protected confirm(g: PendingHandover): void {
    if (!this.canConfirm()) return;
    this.saving.set(true);
    this.formError.set('');
    const received = this.countedValue();
    this.api
      .confirm({ kind: this.kind(), collectorId: g.collectorId, expectedAmount: g.total, receivedAmount: received, note: this.note().trim() || null })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (done) => {
          this.openKey.set(null);
          const diff = done.difference;
          const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          this.flash.set(
            `Received QAR ${money(done.received)} from ${this.person(done.collectorName)}` +
              (diff < 0 ? ` — QAR ${money(-diff)} missing.` : diff > 0 ? ` — QAR ${money(diff)} extra.` : '.'),
          );
          this.loadAll(false);
        },
        error: (err: unknown) => this.formError.set(getApiErrorMessage(err, 'Could not record the handover.')),
      });
  }

  protected load(): void {
    this.flash.set('');
    this.loadAll();
  }

  private loadAll(showLoading = true): void {
    if (showLoading) this.loading.set(true);
    this.error.set('');
    forkJoin({
      moi: this.api.pending('moi'),
      non: this.api.pending('nonmoi'),
      history: this.api.history(this.kind(), this.range().from, this.range().to),
      online: this.api.online(this.kind(), this.range().from, this.range().to),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ moi, non, history, online }) => {
          this.pendingMoi.set(moi);
          this.pendingNon.set(non);
          this.history.set(history);
          this.online.set(online);
          // Start on the kind that has cash waiting, if this one has none.
          if (showLoading && !(this.kind() === 'moi' ? moi : non).groups.length) {
            const other: CashKind = this.kind() === 'moi' ? 'nonmoi' : 'moi';
            if ((other === 'moi' ? moi : non).groups.length) { this.kind.set(other); this.loadPeriod(); }
          }
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load the cash handovers.')),
      });
  }

  /** The received and online lists follow the kind and the period; what is waiting does not. */
  private loadPeriod(): void {
    forkJoin({
      history: this.api.history(this.kind(), this.range().from, this.range().to),
      online: this.api.online(this.kind(), this.range().from, this.range().to),
    }).subscribe({
      next: ({ history, online }) => { this.history.set(history); this.online.set(online); },
      error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load the list.')),
    });
  }

  protected openReceipt(row: OnlinePayment): void {
    const tab = window.open('', '_blank');
    this.api.receipt(this.kind(), row.paymentId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (tab) tab.location.href = url; else window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err: unknown) => { tab?.close(); this.error.set(getApiErrorMessage(err, 'Could not open the receipt.')); },
    });
  }
}
