/** The super admin's dashboard (GET /api/dashboard). Times are UTC; shown in Doha time. */
export type DashboardKind = 'MOI' | 'NonMOI';
export interface DashboardJob {
  id: string; kind: DashboardKind; jobNumber: string; customerName: string; location: string; scheduledAt: string | null;
  technicianId: string; technicianName: string; status: string; completedAt: string | null; amountPayable: number;
}
export interface DashboardTechnician {
  id: string; name: string; state: 'On job' | 'Next job' | 'Overdue' | 'Free'; kind: DashboardKind | null; jobNumber: string | null;
  location: string | null; at: string | null; jobsToday: number; doneToday: number;
}
export interface DashboardInvoice {
  id: string; kind: DashboardKind; jobNumber: string; customerName: string; amountPayable: number; status: string;
  sentAt: string | null; clientMessage: string | null;
}
export interface DashboardMailbox { key: string; address: string; unread: number; }
export interface DashboardApprovals { quotations: number; drawings: number; clientRegistrations: number; jobsToClose: number; moiJobsToClose: number; total: number; }
/** Cash the team still holds (per kind), what the accountant received today, and missing/extra this month. */
export interface DashboardCash {
  waitingNonMoi: number; peopleNonMoi: number; waitingMoi: number; peopleMoi: number; waitingTotal: number;
  receivedToday: number; handoversToday: number; differenceThisMonth: number;
}
/** Uber bills: waiting for approval, owed to staff, the longest open wait, and paid back this month. */
export interface DashboardTravel {
  toApproveCount: number; toApproveTotal: number; owedCount: number; owedTotal: number; oldestOpenDays: number; paidThisMonth: number;
}
export interface Dashboard {
  now: string;
  revenueThisMonth: number; revenueLastMonth: number; paymentsThisMonth: number; cashThisMonth: number; onlineThisMonth: number;
  quotationsApprovedThisMonth: number; quotationsApprovedCount: number;
  revenueNonMoiThisMonth: number; revenueMoiThisMonth: number; unpaidTotal: number; unpaidJobs: number;
  cash: DashboardCash;
  travel: DashboardTravel;
  openInvoicesTotal: number; openInvoices: DashboardInvoice[];
  todayJobs: DashboardJob[]; overdueJobs: number;
  technicians: DashboardTechnician[];
  unreadMail: number; mailboxes: DashboardMailbox[];
  approvals: DashboardApprovals;
}
