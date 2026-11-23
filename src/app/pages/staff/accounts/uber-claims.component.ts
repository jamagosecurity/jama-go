import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { TravelClaimCardComponent } from '../../../components/travel-claim-card/travel-claim-card.component';
import { LunchRates, METHOD_LABEL, ReimbursementMethod, TravelBalance, TravelClaim, TravelClaimsBoard, tripLabel } from '../../../models/travel-claim.model';

/** How the accountant is approving one bill: ticked or not, the amount, and why it is lower. */
interface ApprovalRow { checked: boolean; amount: string; reason: string; }
interface ApproveGroup { personId: string; name: string; claims: TravelClaim[]; }
import { AuthService } from '../../../services/auth.service';
import { TravelClaimService } from '../../../services/travel-claim.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

const dohaDay = (offsetDays = 0): string =>
  new Date(Date.now() + 3 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);

/**
 * The accountant's Uber bills: approve or reject what staff claimed, pay each person back (cash or bank transfer) and
 * keep the record — who is owed what, for how long, and every payout. Nobody decides on or pays their own claim.
 */
@Component({
  selector: 'app-uber-claims',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, TravelClaimCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './uber-claims.component.html',
  styleUrl: './uber-claims.component.css',
})
export class UberClaimsComponent implements OnInit {
  private readonly api = inject(TravelClaimService);
  private readonly auth = inject(AuthService);
  protected readonly myId = this.auth.currentUser()?.id ?? '';
  protected readonly methodLabel = METHOD_LABEL;

  protected readonly board = signal<TravelClaimsBoard | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly flash = signal('');
  protected readonly tab = signal<'approve' | 'pay' | 'history'>('approve');
  /** One person's whole history instead of everyone's open claims. */
  protected readonly person = signal<TravelBalance | null>(null);

  protected readonly claims = computed(() => this.board()?.claims ?? []);
  protected readonly toApprove = computed(() => this.claims().filter((c) => c.status === 'Submitted').sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)));
  protected readonly toPay = computed(() => this.claims().filter((c) => c.status === 'Approved').sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)));
  protected readonly closed = computed(() => this.claims().filter((c) => c.status === 'Paid' || c.status === 'Rejected' || c.status === 'Withdrawn'));
  protected readonly shown = computed(() => (this.person() ? this.claims() : this.tab() === 'approve' ? this.toApprove() : this.tab() === 'pay' ? this.toPay() : this.closed()));

  // ----- approve many at once, per person -----
  protected readonly approvals = signal<Record<string, ApprovalRow>>({});
  protected readonly expanded = signal<string | null>(null);
  protected readonly approveGroups = computed<ApproveGroup[]>(() => {
    const groups = new Map<string, ApproveGroup>();
    for (const c of this.toApprove()) {
      const g = groups.get(c.claimantId) ?? { personId: c.claimantId, name: this.name(c.claimantName), claims: [] };
      g.claims.push(c);
      groups.set(c.claimantId, g);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  // ----- one person's history -----
  protected readonly personSummary = computed(() => {
    const p = this.person();
    if (!p) return null;
    const counted = this.claims().filter((c) => c.status !== 'Rejected' && c.status !== 'Withdrawn');
    const companions = new Map<string, number>();
    for (const c of counted) for (const x of c.people) companions.set(x.name, (companions.get(x.name) ?? 0) + 1);
    return {
      trips: counted.length,
      paidTotal: p.paidTotal,
      payouts: this.board()?.reimbursements.length ?? 0,
      owed: p.owed,
      companions: [...companions.entries()].map(([name, trips]) => ({ name, trips })).sort((a, b) => b.trips - a.trips),
    };
  });

  // ----- reject -----
  protected readonly rejecting = signal<string | null>(null);
  protected readonly reason = signal('');
  protected readonly busy = signal<string | null>(null);

  // ----- pay back one person -----
  protected readonly paying = signal<TravelBalance | null>(null);
  protected readonly payIds = signal<string[]>([]);
  protected readonly payMethod = signal<ReimbursementMethod | ''>('');
  protected readonly payReference = signal('');
  protected readonly payError = signal('');
  protected readonly payClaims = computed(() => this.toPay().filter((c) => c.claimantId === this.paying()?.personId));
  protected readonly payTotal = computed(() => this.payClaims().filter((c) => this.payIds().includes(c.id)).reduce((n, c) => n + c.payable, 0));

  // ----- lunch rate -----
  protected readonly rates = signal<LunchRates | null>(null);
  protected readonly rateOpen = signal(false);
  protected readonly rateText = signal('');
  protected readonly rateFrom = signal(dohaDay());
  protected readonly rateError = signal('');
  protected readonly today = dohaDay();

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(this.board() === null);
    this.api.board(this.person()?.personId ?? null).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (b) => {
        this.board.set(b);
        // Every bill waiting starts ticked, at the amount claimed; choices already made are kept.
        const rows: Record<string, ApprovalRow> = {};
        for (const c of b.claims.filter((x) => x.status === 'Submitted'))
          rows[c.id] = this.approvals()[c.id] ?? { checked: c.claimantId !== this.myId, amount: c.total.toFixed(2), reason: '' };
        this.approvals.set(rows);
      },
      error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load the Uber bills.')),
    });
  }

  protected name(n: string | null | undefined): string {
    return (n ?? '').replace(/\s*<[^>]*>\s*$/, '').trim();
  }

  protected isMine(c: TravelClaim): boolean {
    return c.claimantId === this.myId;
  }

  protected showPerson(p: TravelBalance | null): void {
    this.person.set(p);
    this.paying.set(null);
    this.load();
  }

  protected route(c: TravelClaim): string {
    return tripLabel(c.tripType, c.siteName);
  }

  protected time(t: string | null): Date | null {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  protected row(id: string): ApprovalRow {
    return this.approvals()[id] ?? { checked: false, amount: '', reason: '' };
  }

  protected setRow(id: string, patch: Partial<ApprovalRow>): void {
    this.approvals.update((all) => ({ ...all, [id]: { ...this.row(id), ...patch } }));
  }

  /** The amount typed, or null when it is not a valid money figure. */
  protected amountOf(c: TravelClaim): number | null {
    const t = this.row(c.id).amount.replace(/,/g, '').trim();
    return /^\d+(\.\d{1,2})?$/.test(t) && Number(t) > 0 ? Number(t) : null;
  }

  protected isLowered(c: TravelClaim): boolean {
    const a = this.amountOf(c);
    return a !== null && a < c.total;
  }

  protected rowError(c: TravelClaim): string {
    if (!this.row(c.id).checked) return '';
    const a = this.amountOf(c);
    if (a === null) return 'Enter an amount, like 24.00. To pay nothing, reject it.';
    if (a > c.total) return `Not more than the ${c.total.toFixed(2)} claimed.`;
    if (a < c.total && !this.row(c.id).reason.trim()) return 'Write why it is lower.';
    return '';
  }

  /** The running total for one person's ticked bills. */
  protected summary(g: ApproveGroup): { count: number; claimed: number; approved: number; lowered: number; hasError: boolean } {
    const ticked = g.claims.filter((c) => this.row(c.id).checked);
    return {
      count: ticked.length,
      claimed: ticked.reduce((n, c) => n + c.total, 0),
      approved: ticked.reduce((n, c) => n + (this.amountOf(c) ?? 0), 0),
      lowered: ticked.filter((c) => this.isLowered(c)).length,
      hasError: ticked.some((c) => !!this.rowError(c)),
    };
  }

  protected tickAll(g: ApproveGroup, on: boolean): void {
    for (const c of g.claims) this.setRow(c.id, { checked: on });
  }

  protected approveGroup(g: ApproveGroup): void {
    const s = this.summary(g);
    if (!s.count || s.hasError) return;
    const items = g.claims.filter((c) => this.row(c.id).checked).map((c) => {
      const amount = this.amountOf(c)!;
      return { claimId: c.id, approvedAmount: amount < c.total ? amount : null, reason: amount < c.total ? this.row(c.id).reason.trim() : null };
    });
    this.busy.set(g.personId);
    this.flash.set('');
    this.api.approve(items).pipe(finalize(() => this.busy.set(null))).subscribe({
      next: (done) => {
        const total = done.reduce((n, c) => n + c.payable, 0);
        this.flash.set(`Approved ${done.length} ${done.length === 1 ? 'bill' : 'bills'} for ${g.name} — ${total.toFixed(2)} QAR now owed to them` +
          (s.lowered ? ` (${s.lowered} lowered).` : '.'));
        this.load();
      },
      error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not approve.')),
    });
  }

  protected startReject(c: TravelClaim): void {
    this.rejecting.set(c.id);
    this.reason.set('');
  }

  protected reject(c: TravelClaim): void {
    if (!this.reason().trim()) return;
    this.busy.set(c.id);
    this.api.reject(c.id, this.reason().trim()).pipe(finalize(() => this.busy.set(null))).subscribe({
      next: () => { this.rejecting.set(null); this.flash.set(`${c.claimNumber} rejected.`); this.load(); },
      error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not reject.')),
    });
  }

  protected startPay(p: TravelBalance): void {
    this.paying.set(p);
    this.payIds.set(this.toPay().filter((c) => c.claimantId === p.personId).map((c) => c.id));
    this.payMethod.set('');
    this.payReference.set('');
    this.payError.set('');
    this.tab.set('pay');
  }

  protected togglePay(id: string): void {
    this.payIds.set(this.payIds().includes(id) ? this.payIds().filter((x) => x !== id) : [...this.payIds(), id]);
  }

  protected pay(): void {
    const p = this.paying();
    if (!p) return;
    if (!this.payIds().length) { this.payError.set('Tick the bills you are paying back.'); return; }
    if (!this.payMethod()) { this.payError.set('Choose cash or bank transfer.'); return; }
    this.busy.set('pay');
    this.api.reimburse(this.payIds(), this.payMethod() as ReimbursementMethod, this.payReference().trim() || null)
      .pipe(finalize(() => this.busy.set(null))).subscribe({
        next: (r) => {
          this.paying.set(null);
          this.flash.set(`${r.number}: paid ${this.name(r.payeeName)} ${r.amount.toFixed(2)} QAR by ${METHOD_LABEL[r.method].toLowerCase()} for ${r.claimNumbers.join(', ')}.`);
          this.load();
        },
        error: (err: unknown) => this.payError.set(getApiErrorMessage(err, 'Could not record the payment.')),
      });
  }

  protected openRate(): void {
    this.rateOpen.set(!this.rateOpen());
    this.rateText.set(String(this.board()?.lunchRate ?? ''));
    this.rateFrom.set(dohaDay());
    this.rateError.set('');
    if (!this.rates()) this.api.lunchRates().subscribe({ next: (r) => this.rates.set(r) });
  }

  protected saveRate(): void {
    const t = this.rateText().trim();
    if (!/^\d+(\.\d{1,2})?$/.test(t) || Number(t) <= 0) { this.rateError.set('Enter the amount per person, like 12 or 15.50.'); return; }
    this.api.setLunchRate(Number(t), this.rateFrom()).subscribe({
      next: (r) => { this.rates.set(r); this.rateOpen.set(false); this.flash.set(`Lunch is now up to ${Number(t).toFixed(2)} QAR per person for trips from ${this.rateFrom()}.`); this.load(); },
      error: (err: unknown) => this.rateError.set(getApiErrorMessage(err, 'Could not change the lunch rate.')),
    });
  }
}
