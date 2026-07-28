import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs';
import { TechnicianDiaDetail } from '../../../models/technician.model';
import { TechnicianService } from '../../../services/technician.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

import { TechnicianInspectionSectionsComponent } from '../shared/technician-inspection-sections.component';

const DUE_SOON_DAYS = 14;
const MS_PER_DAY = 86_400_000;

@Component({
  selector: 'app-technician-dia-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule, TechnicianInspectionSectionsComponent],
  templateUrl: './technician-dia-detail.component.html',
  styleUrls: ['../technician.styles.css', './technician-dia-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicianDiaDetailComponent implements OnInit {
  private readonly service = inject(TechnicianService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly detail = signal<TechnicianDiaDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly starting = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  /**
   * Urgency of the open quarter. remainingDays is floored at 0 server-side, so
   * an overdue quarter and one due today both report 0 — quarterEndDate is the
   * only way to tell them apart.
   */
  protected dueTone(item: TechnicianDiaDetail): 'complete' | 'idle' | 'overdue' | 'soon' | 'ok' {
    if (item.inspectionStatus === 'Completed') return 'complete';
    if (!item.quarterEndDate) return 'idle';
    if (this.overdueDays(item) > 0) return 'overdue';
    if (item.remainingDays === 0) return 'overdue';
    return item.remainingDays <= DUE_SOON_DAYS ? 'soon' : 'ok';
  }

  protected dueLabel(item: TechnicianDiaDetail): string {
    if (item.inspectionStatus === 'Completed') return 'Cycle complete';
    if (!item.quarterEndDate) return 'Not scheduled';

    const overdue = this.overdueDays(item);
    if (overdue > 0) return `Overdue by ${this.days(overdue)}`;
    if (item.remainingDays === 0) return 'Due today';
    return `${this.days(item.remainingDays)} remaining`;
  }

  private overdueDays(item: TechnicianDiaDetail): number {
    if (!item.quarterEndDate) return 0;
    return Math.floor((Date.now() - new Date(item.quarterEndDate).getTime()) / MS_PER_DAY);
  }

  private days(count: number): string {
    return count === 1 ? '1 day' : `${count} days`;
  }

  protected start(): void {
    if (this.starting()) return;
    this.starting.set(true);
    this.service
      .startInspection(this.id)
      .pipe(finalize(() => this.starting.set(false)))
      .subscribe({
        next: (inspection) => void this.router.navigate(['/technician/inspection', inspection.id]),
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Unable to start inspection.')),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getDiaById(this.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => this.detail.set(detail),
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Unable to load DIA details.')),
      });
  }
}
