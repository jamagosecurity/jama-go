import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Collections, NonMoiJob } from '../../../models/non-moi-job.model';

const dohaDay = (iso: string | Date) => new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(0, 10);

/**
 * One kind of job work on the staff dashboard — MOI or Non-MOI, the same block for both: money collected today, jobs
 * finished and waiting to be billed, invoices with clients, what is still unpaid, and today's technician visits.
 */
@Component({
  selector: 'app-staff-jobs-summary',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-jobs-summary.component.html',
  styleUrls: ['../staff.styles.css', './staff-dashboard.component.css'],
})
export class StaffJobsSummaryComponent {
  /** "MOI" or "Non-MOI": the heading and the colour of the section. */
  readonly kind = input.required<'MOI' | 'Non-MOI'>();
  /** Where this kind's jobs live, e.g. /staff/moi-jobs. */
  readonly base = input.required<string>();
  readonly jobs = input<NonMoiJob[] | null>(null);
  readonly today = input<Collections | null>(null);

  readonly toBill = computed(() => (this.jobs() ?? []).filter((j) => j.status === 'Completed' || j.status === 'ChangesRequested'));
  readonly withClient = computed(() => (this.jobs() ?? []).filter((j) => j.status === 'Sent'));
  readonly unpaid = computed(() => (this.jobs() ?? [])
    .filter((j) => j.status === 'Sent' || j.status === 'Closed' || j.status === 'ChangesRequested')
    .map((j) => ({ job: j, balance: Math.max(0, Math.round((j.amountPayable - (j.amountPaid ?? 0)) * 100) / 100) }))
    .filter((x) => x.balance > 0)
    .sort((a, b) => b.balance - a.balance));
  readonly unpaidTotal = computed(() => this.unpaid().reduce((n, x) => n + x.balance, 0));
  readonly todayJobs = computed(() => {
    const day = dohaDay(new Date());
    return (this.jobs() ?? []).filter((j) => j.scheduledAt && dohaDay(j.scheduledAt) === day)
      .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
  });

  jobStatus(s: string): string {
    return s === 'Assigned' ? 'With technician' : s === 'Completed' ? 'Done · to bill' : s === 'Sent' ? 'With client'
      : s === 'ChangesRequested' ? 'Client asked change' : s === 'Closed' ? 'Approved' : s;
  }
}
