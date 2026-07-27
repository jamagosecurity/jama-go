import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs';
import { TechnicianCycleStatus, TechnicianDiaListItem } from '../../../models/technician.model';
import { TechnicianService } from '../../../services/technician.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

const QUARTERS_PER_CYCLE = 4;
const DUE_SOON_DAYS = 14;
const MS_PER_DAY = 86_400_000;

/** How a site's deadline should read, and how loudly. */
type DueTone = 'complete' | 'idle' | 'overdue' | 'soon' | 'ok';

interface DueInfo {
  readonly tone: DueTone;
  readonly label: string;
}

@Component({
  selector: 'app-technician-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule],
  templateUrl: './technician-dashboard.component.html',
  styleUrls: ['../technician.styles.css', './technician-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicianDashboardComponent implements OnInit {
  private readonly service = inject(TechnicianService);

  protected readonly items = signal<TechnicianDiaListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly quarterSlots = [1, 2, 3, 4];

  /** Roll-up across every activated site, for the stat row. */
  protected readonly summary = computed(() => {
    const list = this.items();
    const done = list.reduce((total, item) => total + item.submittedQuarters, 0);
    const capacity = list.length * QUARTERS_PER_CYCLE;
    return {
      sites: list.length,
      done,
      remaining: capacity - done,
      capacity,
      overdue: list.filter((item) => this.dueInfo(item).tone === 'overdue').length,
      dueSoon: list.filter((item) => this.dueInfo(item).tone === 'soon').length,
      completedSites: list.filter((item) => item.inspectionStatus === 'Completed').length,
    };
  });

  ngOnInit(): void {
    this.load();
  }

  // ===== Cycle progress =====

  protected quartersLeft(item: TechnicianDiaListItem): number {
    return Math.max(0, QUARTERS_PER_CYCLE - item.submittedQuarters);
  }

  protected quarterState(item: TechnicianDiaListItem, quarter: number): 'done' | 'current' | 'todo' {
    if (quarter <= item.submittedQuarters) return 'done';
    if (item.currentQuarter === quarter) return 'current';
    return 'todo';
  }

  /**
   * The API floors remainingDays at 0, so an overdue quarter and one due today
   * both report 0. quarterEndDate is the only way to tell them apart — the
   * magnitude of the overrun is worked out here from that date.
   */
  protected dueInfo(item: TechnicianDiaListItem): DueInfo {
    if (item.inspectionStatus === 'Completed') {
      return { tone: 'complete', label: 'All four quarters submitted' };
    }
    if (!item.quarterEndDate) {
      return { tone: 'idle', label: 'Not started yet' };
    }

    const overdueDays = Math.floor((Date.now() - new Date(item.quarterEndDate).getTime()) / MS_PER_DAY);

    if (overdueDays > 0) {
      return { tone: 'overdue', label: `Overdue by ${this.days(overdueDays)}` };
    }
    if (item.remainingDays === 0) {
      return { tone: 'overdue', label: 'Due today' };
    }
    if (item.remainingDays <= DUE_SOON_DAYS) {
      return { tone: 'soon', label: `Due in ${this.days(item.remainingDays)}` };
    }
    return { tone: 'ok', label: `Due in ${this.days(item.remainingDays)}` };
  }

  /** Which quarter the next visit covers, e.g. "Quarter 3 of 4". */
  protected nextQuarterLabel(item: TechnicianDiaListItem): string {
    if (item.inspectionStatus === 'Completed') return 'Cycle complete';
    const quarter = item.currentQuarter ?? item.submittedQuarters + 1;
    return `Quarter ${Math.min(quarter, QUARTERS_PER_CYCLE)} of ${QUARTERS_PER_CYCLE}`;
  }

  private days(count: number): string {
    return count === 1 ? '1 day' : `${count} days`;
  }

  // ===== Labels & links (unchanged behaviour) =====

  protected statusLabel(status: TechnicianCycleStatus): string {
    return status.startsWith('Quarter')
      ? `Quarter ${status.slice(-1)}`
      : status.replace(/([A-Z])/g, ' $1').trim();
  }

  protected actionLabel(item: TechnicianDiaListItem): string {
    if (item.inspectionStatus === 'Completed') return 'View Summary';
    return item.action === 'StartInspection' ? 'Start Inspection' : item.action;
  }

  protected actionLink(item: TechnicianDiaListItem): string[] {
    if (item.inspectionStatus === 'Completed') {
      return ['/technician/dia', item.id, 'summary'];
    }
    if (item.action === 'Continue' && item.currentInspectionId) {
      return ['/technician/inspection', item.currentInspectionId];
    }
    if (item.action === 'View' && item.currentInspectionId) {
      return ['/technician/inspection', item.currentInspectionId, 'review'];
    }
    return ['/technician/dia', item.id];
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .getActivatedDiaList()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.items.set(items.map((item) => this.withCycleDefaults(item))),
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Unable to load activated DIA records.')),
      });
  }

  /**
   * The cycle fields were added to the list endpoint alongside this dashboard.
   * An API build that predates that change omits them, which would otherwise
   * surface as "NaN / NaN" in the stat row and — worse — a card reading
   * "Completed" next to "0 of 4 quarters complete".
   *
   * The server defines currentQuarter as submittedQuarters + 1, so the count
   * can be recovered from fields the old contract already returned.
   */
  private withCycleDefaults(item: TechnicianDiaListItem): TechnicianDiaListItem {
    return {
      ...item,
      submittedQuarters: Number.isFinite(item.submittedQuarters)
        ? item.submittedQuarters
        : this.inferSubmittedQuarters(item),
      remainingDays: Number.isFinite(item.remainingDays) ? item.remainingDays : 0,
      progressPercent: Number.isFinite(item.progressPercent) ? item.progressPercent : 0,
      quarterStartDate: item.quarterStartDate ?? null,
      quarterEndDate: item.quarterEndDate ?? null,
    };
  }

  private inferSubmittedQuarters(item: TechnicianDiaListItem): number {
    if (item.inspectionStatus === 'Completed') return QUARTERS_PER_CYCLE;
    if (item.currentQuarter) return Math.max(0, item.currentQuarter - 1);
    return 0;
  }
}
