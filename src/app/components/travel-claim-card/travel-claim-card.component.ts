import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CLAIM_STATUS, METHOD_LABEL, TravelClaim, TravelClaimLine, tripLabel } from '../../models/travel-claim.model';
import { TravelClaimService } from '../../services/travel-claim.service';
import { getApiErrorMessage } from '../../utils/api-error.util';

/**
 * One Uber bill: what was read from the receipt, the route, who came, the lunch, and every step with its date and
 * time — submitted, approved, paid back (or rejected / withdrawn) and how many days it waited. Actions (approve, pay,
 * withdraw…) are projected in by the page that uses it.
 */
@Component({
  selector: 'app-travel-claim-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './travel-claim-card.component.html',
  styleUrl: './travel-claim-card.component.css',
})
export class TravelClaimCardComponent {
  private readonly api = inject(TravelClaimService);

  readonly claim = input.required<TravelClaim>();
  /** On the accountant's board the card says whose claim it is. */
  readonly showClaimant = input(false);

  protected readonly open = signal(false);
  protected readonly fileError = signal('');

  protected readonly status = computed(() => CLAIM_STATUS[this.claim().status]);
  protected readonly route = computed(() => tripLabel(this.claim().tripType, this.claim().siteName));
  protected readonly ride = computed(() => this.claim().lines.find((l) => l.kind === 'Ride') ?? null);
  protected readonly lunch = computed(() => this.claim().lines.find((l) => l.kind === 'Lunch') ?? null);
  protected readonly method = computed(() => (this.claim().paidMethod ? METHOD_LABEL[this.claim().paidMethod!] : ''));
  /** Who ate the lunch, the claimant first. */
  protected readonly ate = computed(() => {
    const c = this.claim();
    return [...(c.claimantAteLunch ? [this.person(c.claimantName)] : []), ...c.people.filter((p) => p.ateLunch).map((p) => p.name)];
  });

  protected person(name: string | null | undefined): string {
    return (name ?? '').replace(/\s*<[^>]*>\s*$/, '').trim();
  }

  /** "13:22:00" → a Date today at that time, so the date pipe can print it as 1:22 PM. */
  protected time(t: string | null): Date | null {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  protected openFile(line: TravelClaimLine): void {
    this.fileError.set('');
    const tab = window.open('', '_blank');
    this.api.file(this.claim().id, line.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (tab) tab.location.href = url; else window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err: unknown) => { tab?.close(); this.fileError.set(getApiErrorMessage(err, 'Could not open the file.')); },
    });
  }
}
