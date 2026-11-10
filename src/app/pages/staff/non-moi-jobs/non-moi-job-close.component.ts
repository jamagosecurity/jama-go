import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { BillMailbox, NonMoiJob } from '../../../models/non-moi-job.model';
import { maintenanceCategoryLabel } from '../../../models/maintenance.model';
import { AuthService } from '../../../services/auth.service';
import { jobStatusLabel } from '../../../utils/non-moi-job-status.util';
import { NonMoiJobService } from '../../../services/non-moi-job.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { NON_MOI_JOBS_BASE_PATH } from './non-moi-jobs-base-path';

const ADDRESS = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

/**
 * The last step of a Non-MOI job. The technician has ticked what he fixed; the person who issued the job reviews it
 * here, may take a discount off the total (nothing else about the prices can change), and closes the deal — which
 * sends the client the bill by email and WhatsApp and locks the job.
 */
@Component({
  selector: 'app-non-moi-job-close',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './non-moi-job-close.component.html',
  styleUrl: './non-moi-job-close.component.css',
})
export class NonMoiJobCloseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly jobsApi = inject(NonMoiJobService);
  private readonly auth = inject(AuthService);
  protected readonly base = inject(NON_MOI_JOBS_BASE_PATH);

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

  /** Only the person who issued the job, or an administrator. The server checks the same rule. */
  protected readonly canClose = computed(() => {
    const job = this.job();
    if (!job || (job.status !== 'Completed' && job.status !== 'ChangesRequested')) return false;
    return this.auth.isAdmin() || (!!job.assignedById && job.assignedById === this.auth.currentUser()?.id);
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
    if (!e) return 'Add the client’s email address, or untick the email.';
    return ADDRESS.test(e) ? '' : 'Enter a valid email address, like name@example.com.';
  });
  protected readonly channelError = computed(() =>
    !this.sendEmail() && !this.sendWhatsApp() ? 'Choose at least one way to send the bill.' : '');
  protected readonly mailboxError = computed(() =>
    this.sendEmail() && !this.mailboxKey() ? 'Choose which company mailbox the email is sent from.' : '');
  protected readonly canSubmit = computed(() =>
    this.canClose() && !this.saving() && !this.discountError() && !this.emailError() && !this.channelError() && !this.mailboxError());

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
  protected readonly headlineAmount = computed(() => (this.canClose() ? this.payable() : (this.job()?.amountPayable ?? 0)));

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({ jobs: this.jobsApi.list(), options: this.jobsApi.sendOptions() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ jobs, options }) => {
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
    // A new revision after the client asked for changes goes out on both channels again. Only after a send that failed halfway
    // is a channel that already went out left unticked, so the client is never sent the same thing twice.
    const freshRevision = job.status === 'ChangesRequested' && job.clientDecision !== null;
    this.sendEmail.set(freshRevision || !job.emailSentAt);
    this.sendWhatsApp.set(this.whatsAppAvailable() && (freshRevision || !job.whatsAppSentAt));
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
        mailboxKey: this.sendEmail() ? this.mailboxKey() : null,
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
