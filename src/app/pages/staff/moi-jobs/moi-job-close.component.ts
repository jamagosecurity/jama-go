import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { BillMailbox, JobTechnician, NonMoiJob, NonMoiJobPayment } from '../../../models/non-moi-job.model';
import { maintenanceCategoryLabel } from '../../../models/maintenance.model';
import { AuthService } from '../../../services/auth.service';
import { jobStatusLabel } from '../../../utils/non-moi-job-status.util';
import { MoiJobService } from '../../../services/moi-job.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { MOI_JOBS_BASE_PATH } from './moi-jobs-base-path';

const ADDRESS = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

/**
 * The last step of a MOI job. The technician has ticked what he fixed; the person who issued the job reviews it
 * here, may take a discount off the total (nothing else about the prices can change), and closes the deal — which
 * sends the client the bill by email and locks the job.
 */
/** Today in Doha as yyyy-MM-dd, or a number of days from it. */
const dohaToday = (offsetDays = 0): string =>
  new Date(Date.now() + 3 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);

const qar = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

@Component({
  selector: 'app-moi-job-close',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './moi-job-close.component.html',
  styleUrl: './moi-job-close.component.css',
})
export class MoiJobCloseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly jobsApi = inject(MoiJobService);
  private readonly auth = inject(AuthService);
  protected readonly base = inject(MOI_JOBS_BASE_PATH);

  protected readonly job = signal<NonMoiJob | null>(null);
  protected readonly mailboxes = signal<BillMailbox[]>([]);
  /** False when this server has no WhatsApp set up: the option is then shown as unavailable instead of being offered and refused. */
  protected readonly whatsAppAvailable = signal(true);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly discountText = signal('');
  protected readonly email = signal('');
  protected readonly mailboxKey = signal('');
  protected readonly sendEmail = signal(true);
  protected readonly sendWhatsApp = signal(true);
  protected readonly confirming = signal(false);
  protected readonly categoryLabel = maintenanceCategoryLabel;
  protected readonly statusLabel = jobStatusLabel;

  /** Every timing on the job, oldest first: issued, the planned visit, completed by the technician, then the bill steps. */
  protected readonly timeline = computed(() => {
    const job = this.job();
    if (!job) return [];
    const billTitle: Record<string, string> = {
      Sent: 'Bill sent', Approved: 'Approved by the client', Rejected: 'Rejected by the client', Commented: 'Client commented',
      Payment: 'Payment received', PaymentRemoved: 'Payment removed',
    };
    const steps: { kind: string; title: string; detail: string; at: string }[] = [
      { kind: 'Issued', title: 'Job issued', detail: this.person(job.assignedByName) ? `By ${this.person(job.assignedByName)} to ${job.assignedToName}` : `Given to ${job.assignedToName}`, at: job.createdAt },
    ];
    if (job.scheduledAt) {
      steps.push({ kind: 'Scheduled', title: 'Visit scheduled for', detail: job.assignedToName, at: job.scheduledAt });
    }
    if (job.completedAt) {
      steps.push({ kind: 'Completed', title: 'Completed by the technician', detail: `${job.assignedToName} · ${qar(job.workTotal)} QAR of work`, at: job.completedAt });
    }
    for (const e of job.events) {
      const parts = e.action.startsWith('Payment')
        ? [`Recorded by ${this.person(e.actorName)}`]
        : [`Revision ${e.revision}`, `${qar(e.amountPayable)} QAR`, this.person(e.actorName)];
      if (e.note) parts.push(e.note);
      steps.push({ kind: e.action, title: billTitle[e.action] ?? e.action, detail: parts.join(' · '), at: e.at });
    }
    return steps;
  });

  /** Any MOI manager may review and send once the technician has finished (this page is only reachable with that grant). */
  protected readonly canClose = computed(() => {
    const job = this.job();
    return !!job && (job.status === 'Completed' || job.status === 'ChangesRequested');
  });

  protected readonly discountValue = computed(() => {
    const n = Number(this.discountText().replace(/,/g, ''));
    return Number.isFinite(n) ? n : NaN;
  });
  protected readonly discountError = computed(() => {
    const total = this.job()?.workTotal ?? 0;
    const text = this.discountText().trim();
    if (!text) return '';
    const value = this.discountValue();
    if (Number.isNaN(value)) return 'Enter the discount as a number, like 50 or 120.50.';
    if (value < 0) return 'The discount cannot be negative.';
    if (value > total) return 'The discount cannot be more than the total.';
    return '';
  });
  protected readonly discount = computed(() => (this.discountError() || !this.discountText().trim() ? 0 : this.discountValue()));
  protected readonly payable = computed(() => Math.round(((this.job()?.workTotal ?? 0) - this.discount()) * 100) / 100);

  protected readonly emailError = computed(() => {
    if (!this.sendEmail()) return '';
    const e = this.email().trim();
    if (!e) return 'Add the client’s email address, or untick Email and send on WhatsApp.';
    return ADDRESS.test(e) ? '' : 'Enter a valid email address, like name@example.com.';
  });
  /** Always needed: the bill email goes from it, and the team is told from it when the client answers. */
  protected readonly mailboxError = computed(() => (!this.mailboxKey() ? 'Choose which company mailbox to use.' : ''));
  protected readonly channelError = computed(() =>
    !this.sendEmail() && !this.sendWhatsApp() ? 'Choose how to send the bill: email, WhatsApp or both.' : '');
  protected readonly canSubmit = computed(() =>
    this.canClose() && !this.saving() && !this.discountError() && !this.emailError() && !this.mailboxError() && !this.channelError());

  /** The journey of a job, for the progress bar at the top of the page. */
  protected readonly steps = computed(() => {
    const status = this.job()?.status;
    type State = 'done' | 'current' | 'attention' | 'todo';
    const step = (label: string, sub: string, state: State) => ({ label, sub, state });
    switch (status) {
      case 'Assigned':
        return [step('Issued', 'Given to the technician', 'done'), step('Technician', 'Working on site', 'current'),
          step('Client', 'Bill not sent yet', 'todo'), step('Approved', 'Deal final', 'todo')];
      case 'Completed':
        return [step('Issued', 'Given to the technician', 'done'), step('Technician', 'Work finished', 'done'),
          step('Client', 'Ready to send the bill', 'current'), step('Approved', 'Deal final', 'todo')];
      case 'Sent':
        return [step('Issued', 'Given to the technician', 'done'), step('Technician', 'Work finished', 'done'),
          step('Client', 'Waiting for their answer', 'current'), step('Approved', 'Deal final', 'todo')];
      case 'ChangesRequested':
        return [step('Issued', 'Given to the technician', 'done'), step('Technician', 'Work finished', 'done'),
          step('Client', 'Asked for changes', 'attention'), step('Approved', 'Deal final', 'todo')];
      case 'Closed':
        return [step('Issued', 'Given to the technician', 'done'), step('Technician', 'Work finished', 'done'),
          step('Client', 'Bill sent', 'done'), step('Approved', 'Deal final', 'done')];
      default:
        return [];
    }
  });

  /** The figure for the summary card: live while the discount is being worked out, fixed once the bill has gone out. */
  // ===== Payments: cash collected or an online transfer with its receipt =====
  protected readonly technicians = signal<JobTechnician[]>([]);
  protected readonly isSuper = this.auth.isSuperAdmin();
  protected readonly payOpen = signal(false);
  protected readonly payMethod = signal<'Cash' | 'Online'>('Cash');
  protected readonly payAmount = signal('');
  protected readonly payDate = signal(dohaToday());
  protected readonly payCollector = signal('');
  protected readonly payNote = signal('');
  protected readonly payReceipt = signal<File | null>(null);
  protected readonly paySaving = signal(false);
  protected readonly payError = signal('');
  protected readonly payDeleting = signal<string | null>(null);
  protected readonly today = dohaToday();
  protected readonly yesterday = dohaToday(-1);

  /** What the client owes: the sent bill, or until then the total less the discount. */
  protected readonly billed = computed(() => {
    const j = this.job();
    if (!j) return 0;
    return j.status === 'Completed' || j.status === 'Assigned' ? Math.round((j.workTotal - j.discount) * 100) / 100 : j.amountPayable;
  });
  protected readonly paid = computed(() => this.job()?.amountPaid ?? 0);
  protected readonly balance = computed(() => Math.max(0, Math.round((this.billed() - this.paid()) * 100) / 100));
  protected readonly payState = computed(() => (this.paid() <= 0 ? 'Unpaid' : this.balance() <= 0 ? 'Paid' : 'Part-paid'));
  protected readonly showPayments = computed(() => !!this.job() && this.job()!.status !== 'Assigned');
  protected readonly canPay = computed(() => {
    const j = this.job();
    return !!j && j.status !== 'Assigned' && this.balance() > 0;
  });

  protected openPay(): void {
    const j = this.job();
    this.payMethod.set('Cash');
    this.payAmount.set(String(this.balance()));
    this.payDate.set(this.today);
    this.payCollector.set(j?.assignedToId ?? '');
    this.payNote.set('');
    this.payReceipt.set(null);
    this.payError.set('');
    this.payOpen.set(true);
  }

  protected onReceipt(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.payReceipt.set(file);
    this.payError.set('');
  }

  protected savePayment(): void {
    const j = this.job();
    if (!j || this.paySaving()) return;
    const amount = Number(this.payAmount().replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) return this.payError.set('Enter the amount received.');
    if (amount > this.balance()) return this.payError.set(`That is more than the balance (${qar(this.balance())} QAR).`);
    if (!this.payDate() || this.payDate() > this.today) return this.payError.set('Pick the day the money came in (not a future day).');
    if (this.payMethod() === 'Online' && !this.payReceipt()) return this.payError.set('Upload the transaction receipt for an online payment.');
    this.paySaving.set(true);
    this.payError.set('');
    this.jobsApi.addPayment(j.id, {
      method: this.payMethod(), amount, receivedOn: this.payDate(),
      collectedById: this.payMethod() === 'Cash' ? this.payCollector() || null : null,
      note: this.payNote().trim() || null, receipt: this.payReceipt(),
    }).pipe(finalize(() => this.paySaving.set(false))).subscribe({
      next: () => { this.payOpen.set(false); this.reload(j.id); },
      error: (err: unknown) => this.payError.set(getApiErrorMessage(err, 'The payment could not be saved.')),
    });
  }

  protected deletePayment(p: NonMoiJobPayment): void {
    const j = this.job();
    if (!j || !confirm(`Remove this ${p.method.toLowerCase()} payment of ${qar(p.amount)} QAR? It stays in the history.`)) return;
    this.payDeleting.set(p.id);
    this.jobsApi.deletePayment(p.id).pipe(finalize(() => this.payDeleting.set(null))).subscribe({
      next: () => this.reload(j.id),
      error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'The payment could not be removed.')),
    });
  }

  protected openReceipt(p: NonMoiJobPayment): void {
    // Opened first, filled in after the download: a tab opened later is blocked as a pop-up.
    const tab = window.open('', '_blank');
    this.jobsApi.receipt(p.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (tab) tab.location.href = url; else window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err: unknown) => { tab?.close(); this.error.set(getApiErrorMessage(err, 'Could not open the receipt.')); },
    });
  }

  private reload(id: string): void {
    this.jobsApi.list().subscribe((jobs) => this.apply(jobs.find((x) => x.id === id) ?? this.job()));
  }

  protected readonly headlineAmount = computed(() => (this.canClose() ? this.payable() : (this.job()?.amountPayable ?? 0)));

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({ jobs: this.jobsApi.list(), options: this.jobsApi.sendOptions(), techs: this.jobsApi.technicians() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ jobs, options, techs }) => {
          this.technicians.set(techs);
          const job = jobs.find((j) => j.id === id) ?? null;
          this.mailboxes.set(options.mailboxes);
          this.whatsAppAvailable.set(options.whatsAppAvailable);
          this.apply(job);
          if (!job) this.error.set('This job was not found.');
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load the job.')),
      });
  }

  private apply(job: NonMoiJob | null): void {
    this.job.set(job);
    if (!job) return;
    this.email.set(job.customerEmail ?? '');
    if (job.discount > 0) this.discountText.set(String(job.discount));
    if (!this.mailboxKey()) this.mailboxKey.set(this.mailboxes()[0]?.key ?? '');
    // The person sending picks email, WhatsApp or both. WhatsApp starts ticked when the server has it; email starts
    // ticked when the client gave an address (or when WhatsApp is not available, so the bill can still go somewhere).
    this.sendWhatsApp.set(this.whatsAppAvailable());
    this.sendEmail.set(!!job.customerEmail?.trim() || !this.whatsAppAvailable());
  }

  /** "Sara <sara@example.com>" is how audit names are stored; on screen only the name reads well. */
  protected person(name: string | null | undefined): string {
    return (name ?? '').replace(/\s*<[^>]*>\s*$/, '').trim();
  }

  protected submit(): void {
    const job = this.job();
    if (!job || !this.canSubmit()) return;
    this.saving.set(true);
    this.error.set('');
    this.jobsApi
      .close(job.id, {
        discount: this.discount(),
        email: this.email().trim() || null,
        sendEmail: this.sendEmail(),
        sendWhatsApp: this.sendWhatsApp(),
        mailboxKey: this.mailboxKey(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (closed) => {
          this.confirming.set(false);
          this.job.set(closed);
        },
        error: (err: unknown) => {
          this.confirming.set(false);
          this.error.set(getApiErrorMessage(err, 'The bill could not be sent.'));
          // A failure can still have sent one of the two; reload so the page shows what already went out.
          this.jobsApi.list().subscribe((jobs) => this.apply(jobs.find((j) => j.id === job.id) ?? job));
        },
      });
  }

  protected downloadBill(): void {
    const job = this.job();
    if (!job) return;
    this.jobsApi.bill(job.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${job.jobNumber} Bill.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      },
      error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not download the bill.')),
    });
  }
}
