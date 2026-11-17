import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CollectionRow, Collections } from '../../../models/non-moi-job.model';
import { NonMoiJobService } from '../../../services/non-moi-job.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { NON_MOI_JOBS_BASE_PATH } from './non-moi-jobs-base-path';

/** A day in Doha as yyyy-MM-dd, counted from today. */
const dohaDay = (offsetDays = 0): string =>
  new Date(Date.now() + 3 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);

/**
 * Money received for Non-MOI jobs on a day (or a range): every cash collection and online transfer, with
 * the cash / online / total figures, so the day's cash can be counted against the list.
 */
@Component({
  selector: 'app-non-moi-collections',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './non-moi-collections.component.html',
  styleUrl: './non-moi-collections.component.css',
})
export class NonMoiCollectionsComponent implements OnInit {
  private readonly api = inject(NonMoiJobService);
  protected readonly base = inject(NON_MOI_JOBS_BASE_PATH);

  protected readonly today = dohaDay();
  protected readonly yesterday = dohaDay(-1);
  protected readonly from = signal(this.today);
  protected readonly to = signal(this.today);
  protected readonly method = signal<'' | 'Cash' | 'Online'>('');
  protected readonly data = signal<Collections | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly preset = computed(() => {
    const f = this.from(), t = this.to();
    if (f === t && f === this.today) return 'today';
    if (f === t && f === this.yesterday) return 'yesterday';
    if (t === this.today && f === dohaDay(-6)) return 'week';
    if (t === this.today && f === this.today.slice(0, 8) + '01') return 'month';
    return 'custom';
  });
  protected readonly rows = computed(() => {
    const m = this.method();
    return (this.data()?.rows ?? []).filter((r) => !m || r.method === m);
  });
  /** Cash per person who collected it — what each technician should hand over. */
  protected readonly byCollector = computed(() => {
    const totals = new Map<string, number>();
    for (const r of this.data()?.rows ?? []) {
      if (r.method !== 'Cash') continue;
      const who = r.collectedByName || 'Office';
      totals.set(who, (totals.get(who) ?? 0) + r.amount);
    }
    return [...totals.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  });

  ngOnInit(): void {
    this.load();
  }

  protected pick(preset: 'today' | 'yesterday' | 'week' | 'month'): void {
    if (preset === 'today') { this.from.set(this.today); this.to.set(this.today); }
    if (preset === 'yesterday') { this.from.set(this.yesterday); this.to.set(this.yesterday); }
    if (preset === 'week') { this.from.set(dohaDay(-6)); this.to.set(this.today); }
    if (preset === 'month') { this.from.set(this.today.slice(0, 8) + '01'); this.to.set(this.today); }
    this.load();
  }

  protected setRange(from: string, to: string): void {
    if (!from) return;
    this.from.set(from);
    this.to.set(to && to >= from ? to : from);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.collections(this.from(), this.to()).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (d) => this.data.set(d),
      error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load the collections.')),
    });
  }

  protected openReceipt(r: CollectionRow): void {
    const tab = window.open('', '_blank');
    this.api.receipt(r.paymentId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (tab) tab.location.href = url; else window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err: unknown) => { tab?.close(); this.error.set(getApiErrorMessage(err, 'Could not open the receipt.')); },
    });
  }

  protected person(name: string | null | undefined): string {
    return (name ?? '').replace(/\s*<[^>]*>\s*$/, '').trim();
  }
}
