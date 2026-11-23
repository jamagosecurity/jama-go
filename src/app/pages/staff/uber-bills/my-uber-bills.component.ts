import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { TravelClaimCardComponent } from '../../../components/travel-claim-card/travel-claim-card.component';
import {
  MyTravelClaims, TRIP_TYPES, TravelClaim, TravelPersonOption, TravelTripType, UberReceiptReading,
} from '../../../models/travel-claim.model';
import { AuthService } from '../../../services/auth.service';
import { TravelClaimService } from '../../../services/travel-claim.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

/**
 * A staff member's own Uber bills. To claim one they upload Uber's PDF — the day, time, amount and places are read from
 * it and cannot be typed — pick the route and who came with them, and on a site trip the site and the lunch. Below: what
 * is owed to them, and every bill with each step's date and time.
 */
@Component({
  selector: 'app-my-uber-bills',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, TravelClaimCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-uber-bills.component.html',
  styleUrl: './my-uber-bills.component.css',
})
export class MyUberBillsComponent implements OnInit {
  private readonly api = inject(TravelClaimService);
  private readonly auth = inject(AuthService);

  protected readonly tripTypes = TRIP_TYPES;
  protected readonly myId = this.auth.currentUser()?.id ?? '';

  protected readonly data = signal<MyTravelClaims | null>(null);
  protected readonly people = signal<TravelPersonOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly flash = signal('');

  // ----- the new bill -----
  protected readonly formOpen = signal(false);
  protected readonly receipt = signal<File | null>(null);
  protected readonly reading = signal(false);
  protected readonly read = signal<UberReceiptReading | null>(null);
  protected readonly readError = signal('');
  protected readonly tripType = signal<TravelTripType | ''>('');
  protected readonly siteName = signal('');
  protected readonly companions = signal<string[]>([]);
  protected readonly peopleSearch = signal('');
  protected readonly hadLunch = signal(false);
  protected readonly ateLunch = signal<string[]>([]);
  protected readonly lunchBillText = signal('');
  protected readonly lunchBill = signal<File | null>(null);
  protected readonly note = signal('');
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly tried = signal(false);

  protected readonly rate = computed(() => this.data()?.lunchRate ?? 12);
  protected readonly isSite = computed(() => this.tripType() === 'Site');
  protected readonly shownPeople = computed(() => {
    const q = this.peopleSearch().trim().toLowerCase();
    return this.people().filter((p) => !q || p.name.toLowerCase().includes(q) || this.companions().includes(p.id));
  });
  protected readonly chosen = computed(() => this.people().filter((p) => this.companions().includes(p.id)));
  /** Who can be ticked as having eaten: me, then the people who came. */
  protected readonly eaters = computed(() => [{ id: this.myId, name: 'Me' }, ...this.chosen()]);

  protected readonly lunchBillAmount = computed(() => {
    const t = this.lunchBillText().replace(/,/g, '').trim();
    return /^\d+(\.\d{1,2})?$/.test(t) && Number(t) > 0 ? Number(t) : null;
  });
  protected readonly lunchCap = computed(() => this.rate() * this.ateLunch().length);
  protected readonly lunchPay = computed(() => {
    const bill = this.lunchBillAmount();
    return this.isSite() && this.hadLunch() && bill !== null ? Math.min(bill, this.lunchCap()) : 0;
  });
  protected readonly total = computed(() => (this.read()?.amount ?? 0) + this.lunchPay());

  protected readonly problems = computed(() => {
    const p: Record<string, string> = {};
    if (!this.receipt()) p['receipt'] = 'Upload the Uber receipt (PDF).';
    else if (this.read() && !this.read()!.complete) p['receipt'] = 'This receipt could not be read. Upload the PDF from Uber, not a photo or screenshot.';
    if (!this.tripType()) p['route'] = 'Choose the route.';
    if (this.isSite() && !this.siteName().trim()) p['site'] = 'Write the site name.';
    if (this.isSite() && this.hadLunch()) {
      if (!this.ateLunch().length) p['ate'] = 'Tick who ate lunch.';
      if (this.lunchBillAmount() === null) p['bill'] = 'Enter the lunch bill amount, like 36.00.';
      if (!this.lunchBill()) p['billFile'] = 'Upload the lunch bill.';
    }
    return p;
  });
  protected readonly canSubmit = computed(
    () => !this.saving() && !this.reading() && !!this.read()?.complete && Object.keys(this.problems()).length === 0,
  );

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    forkJoin({ mine: this.api.mine(), people: this.api.people() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ mine, people }) => { this.data.set(mine); this.people.set(people); },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load your Uber bills.')),
      });
  }

  protected startNew(): void {
    this.formOpen.set(true);
    this.flash.set('');
  }

  protected pickReceipt(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.receipt.set(file);
    this.read.set(null);
    this.readError.set('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.readError.set('Upload the PDF receipt from Uber (open the trip, then Download receipt) — not a photo or screenshot.');
      return;
    }
    this.reading.set(true);
    this.api.read(file).pipe(finalize(() => this.reading.set(false))).subscribe({
      next: (r) => {
        this.read.set(r);
        if (!r.complete) this.readError.set('We could not read the date and amount from this file. Upload the PDF receipt from Uber, not a photo or screenshot.');
      },
      error: (err: unknown) => this.readError.set(getApiErrorMessage(err, 'Could not read the receipt.')),
    });
  }

  protected toggleCompanion(id: string): void {
    const has = this.companions().includes(id);
    this.companions.set(has ? this.companions().filter((x) => x !== id) : [...this.companions(), id]);
    if (has) this.ateLunch.set(this.ateLunch().filter((x) => x !== id));
  }

  protected toggleAte(id: string): void {
    this.ateLunch.set(this.ateLunch().includes(id) ? this.ateLunch().filter((x) => x !== id) : [...this.ateLunch(), id]);
  }

  protected setLunch(on: boolean): void {
    this.hadLunch.set(on);
    if (on && !this.ateLunch().length) this.ateLunch.set([this.myId]);
  }

  protected pickLunchBill(event: Event): void {
    this.lunchBill.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  /** "13:22:00" → a Date at that time for the date pipe. */
  protected time(t: string | null): Date | null {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  protected submit(): void {
    this.tried.set(true);
    if (!this.canSubmit()) return;
    const lunch = this.isSite() && this.hadLunch();
    this.saving.set(true);
    this.formError.set('');
    this.api.submit({
      receipt: this.receipt()!,
      tripType: this.tripType() as TravelTripType,
      siteName: this.isSite() ? this.siteName().trim() : null,
      companions: this.companions(),
      ateLunch: lunch ? this.ateLunch() : [],
      lunchBillAmount: lunch ? this.lunchBillAmount() : null,
      lunchBill: lunch ? this.lunchBill() : null,
      note: this.note().trim() || null,
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (c) => {
        this.flash.set(`${c.claimNumber} sent for approval — QAR ${c.total.toFixed(2)}.`);
        this.reset();
        this.load();
      },
      error: (err: unknown) => this.formError.set(getApiErrorMessage(err, 'Could not send the bill.')),
    });
  }

  protected cancel(): void {
    this.reset();
  }

  private reset(): void {
    this.formOpen.set(false);
    this.receipt.set(null); this.read.set(null); this.readError.set('');
    this.tripType.set(''); this.siteName.set(''); this.companions.set([]); this.peopleSearch.set('');
    this.hadLunch.set(false); this.ateLunch.set([]); this.lunchBillText.set(''); this.lunchBill.set(null);
    this.note.set(''); this.formError.set(''); this.tried.set(false);
  }

  protected withdraw(c: TravelClaim): void {
    if (!confirm(`Take back ${c.claimNumber}? The accountant will no longer see it.`)) return;
    this.api.withdraw(c.id).subscribe({
      next: () => { this.flash.set(`${c.claimNumber} was taken back.`); this.load(); },
      error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not take the bill back.')),
    });
  }
}
