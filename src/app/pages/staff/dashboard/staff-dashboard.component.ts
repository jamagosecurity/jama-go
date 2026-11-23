import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from '../../../components/avatar/avatar.component';
import { PERMISSIONS } from '../../../models/auth.model';
import { BoqListItem } from '../../../models/boq.model';
import { DiaDashboard } from '../../../models/dia.model';
import { Collections, NonMoiJob } from '../../../models/non-moi-job.model';
import { AuthService } from '../../../services/auth.service';
import { BoqService } from '../../../services/boq.service';
import { DiaService } from '../../../services/dia.service';
import { MailService } from '../../../services/mail.service';
import { NonMoiJobService } from '../../../services/non-moi-job.service';
import { StaffService } from '../../../services/staff.service';
import { AdminStaffMember } from '../../../models/staff.model';
import { MoiJobService } from '../../../services/moi-job.service';
import { StaffJobsSummaryComponent } from './staff-jobs-summary.component';

const dohaDay = (iso: string | Date) => new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(0, 10);

/**
 * The staff member's own dashboard, built from what their account may do: Non-MOI and MOI work (the same block for
 * each — jobs to bill, invoices with clients, unpaid, money collected today, today's visits), their quotations, DIA
 * status and unread company mail. Sections they have
 * no access to are not shown, and nothing is fetched for them.
 */
@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, AvatarComponent, StaffJobsSummaryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-dashboard.component.html',
  styleUrls: ['../staff.styles.css', './staff-dashboard.component.css'],
})
export class StaffDashboardComponent {
  readonly auth = inject(AuthService);
  private readonly staffApi = inject(StaffService);
  private readonly jobsApi = inject(NonMoiJobService);
  private readonly moiApi = inject(MoiJobService);
  private readonly boqApi = inject(BoqService);
  private readonly diaApi = inject(DiaService);
  private readonly mailApi = inject(MailService);

  readonly canJobs = this.auth.can(PERMISSIONS.nonMoiJobManage);
  readonly canMoi = this.auth.can(PERMISSIONS.moiJobManage);
  readonly canBoq = this.auth.can(PERMISSIONS.boqManage) || this.auth.can(PERMISSIONS.boqApprove);
  readonly canDia = this.auth.can(PERMISSIONS.diaView) || this.auth.can(PERMISSIONS.diaUpload);
  readonly canMail = this.auth.can(PERMISSIONS.mailRead);

  readonly profile = signal<AdminStaffMember | null>(null);
  readonly jobs = signal<NonMoiJob[] | null>(null);
  readonly today = signal<Collections | null>(null);
  readonly moiJobs = signal<NonMoiJob[] | null>(null);
  readonly moiToday = signal<Collections | null>(null);
  readonly quotes = signal<BoqListItem[] | null>(null);
  readonly dia = signal<DiaDashboard | null>(null);
  readonly unread = signal<number | null>(null);

  readonly now = new Date();
  readonly greeting = (() => {
    const h = new Date(Date.now() + 3 * 3600_000).getUTCHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();
  readonly firstName = computed(() => (this.auth.currentUser()?.fullName ?? '').trim().split(/\s+/)[0] || 'there');

  /** What this account works on — shown instead of an empty "Department". */
  readonly areas = computed(() => {
    const a: string[] = [];
    if (this.canJobs) a.push('Non-MOI jobs');
    if (this.auth.can(PERMISSIONS.moiJobManage)) a.push('MOI jobs');
    if (this.auth.can(PERMISSIONS.accountsManage)) a.push('Cash handover');
    if (this.canBoq) a.push('Quotations');
    if (this.auth.can(PERMISSIONS.drawingManage) || this.auth.can(PERMISSIONS.drawingApprove)) a.push('Drawings');
    if (this.canDia) a.push('DIA inspections');
    if (this.auth.can(PERMISSIONS.cameraManage)) a.push('MOI inventory');
    if (this.auth.can(PERMISSIONS.vipManage)) a.push('VIP clients');
    if (this.canMail) a.push('Company mail');
    return a;
  });

  // ----- Quotations -----
  readonly quoteCounts = computed(() => {
    const q = this.quotes() ?? [];
    return {
      draft: q.filter((x) => x.status === 'Draft').length,
      waiting: q.filter((x) => x.status === 'Submitted').length,
      approved: q.filter((x) => x.status === 'Approved').length,
      rejected: q.filter((x) => x.status === 'Rejected').length,
    };
  });

  constructor() {
    this.staffApi.getMine().subscribe({ next: (p) => this.profile.set(p), error: () => {} });
    if (this.canJobs) {
      this.jobsApi.list().subscribe({ next: (j) => this.jobs.set(j), error: () => this.jobs.set([]) });
      const d = dohaDay(new Date());
      this.jobsApi.collections(d, d).subscribe({ next: (c) => this.today.set(c), error: () => {} });
    }
    if (this.canMoi) {
      this.moiApi.list().subscribe({ next: (j) => this.moiJobs.set(j), error: () => this.moiJobs.set([]) });
      const d = dohaDay(new Date());
      this.moiApi.collections(d, d).subscribe({ next: (c) => this.moiToday.set(c), error: () => {} });
    }
    if (this.canBoq) {
      this.boqApi.list({ pageNumber: 1, pageSize: 100, mineOnly: true }).subscribe({ next: (p) => this.quotes.set(p.items), error: () => this.quotes.set([]) });
    }
    if (this.canDia) this.diaApi.getDashboard().subscribe({ next: (d) => this.dia.set(d), error: () => {} });
    if (this.canMail) {
      this.mailApi.accounts().subscribe({ next: (a) => this.unread.set(a.reduce((n, x) => n + (x.unreadCount ?? 0), 0)), error: () => {} });
    }
  }

}
