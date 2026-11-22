import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { Dashboard, DashboardJob, DashboardKind, DashboardTechnician } from '../../../models/dashboard.model';
import { DashboardService } from '../../../services/dashboard.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

/**
 * The super admin's one-page view: this month's revenue (MOI and Non-MOI), open invoices, what clients still owe, the cash
 * the team holds, unread mail and everything waiting for a decision on top; today's jobs, each technician, the cash
 * handover and the approvals below. Refreshes itself every minute.
 */
@Component({
  selector: 'app-admin-dashboard',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = signal<Dashboard | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);

  /** Revenue against last month, in percent; null when last month had none. */
  readonly change = computed(() => {
    const d = this.data();
    if (!d || d.revenueLastMonth <= 0) return null;
    return Math.round(((d.revenueThisMonth - d.revenueLastMonth) / d.revenueLastMonth) * 100);
  });
  readonly doneToday = computed(() => this.data()?.todayJobs.filter((j) => j.status !== 'Assigned').length ?? 0);
  readonly topMailbox = computed(() => this.data()?.mailboxes[0] ?? null);
  readonly openMoi = computed(() => this.data()?.openInvoices.filter((i) => i.kind === 'MOI').length ?? 0);
  readonly openNon = computed(() => this.data()?.openInvoices.filter((i) => i.kind === 'NonMOI').length ?? 0);

  ngOnInit(): void {
    this.load();
    interval(60_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load(true));
  }

  load(quiet = false): void {
    if (!quiet) this.refreshing.set(true);
    this.api.get().subscribe({
      next: (d) => { this.data.set(d); this.error.set(null); this.loading.set(false); this.refreshing.set(false); },
      error: (e) => { if (!quiet) this.error.set(getApiErrorMessage(e, 'Could not load the dashboard.')); this.loading.set(false); this.refreshing.set(false); },
    });
  }

  jobStatus(j: DashboardJob): string {
    switch (j.status) {
      case 'Assigned': return 'Assigned';
      case 'Completed': return 'Done · to bill';
      case 'Sent': return 'Invoice sent';
      case 'ChangesRequested': return 'Client asked change';
      case 'Closed': return 'Approved';
      default: return j.status;
    }
  }

  jobTone(status: string): string {
    return status === 'Assigned' ? 'blue' : status === 'Completed' ? 'amber' : status === 'ChangesRequested' ? 'red' : 'green';
  }

  techTone(t: DashboardTechnician): string {
    return t.state === 'On job' ? 'green' : t.state === 'Next job' ? 'blue' : t.state === 'Overdue' ? 'red' : 'grey';
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
  }

  kindLabel(kind: DashboardKind | null): string {
    return kind === 'MOI' ? 'MOI' : 'Non-MOI';
  }

  /** Job page: completed jobs open on the close/bill screen, the rest on the editor — in the right section for the kind. */
  jobLink(j: { id: string; kind: DashboardKind; status: string }): string[] {
    return [this.base(j.kind), j.id, j.status === 'Assigned' ? 'edit' : 'close'];
  }

  invoiceLink(i: { id: string; kind: DashboardKind }): string[] {
    return [this.base(i.kind), i.id, 'close'];
  }

  private base(kind: DashboardKind): string {
    return kind === 'MOI' ? '/admin/moi-jobs' : '/admin/non-moi-jobs';
  }
}
