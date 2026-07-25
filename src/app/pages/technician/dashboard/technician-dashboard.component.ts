import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';
import { TechnicianCycleStatus, TechnicianDiaListItem } from '../../../models/technician.model';
import { TechnicianService } from '../../../services/technician.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

@Component({
  selector: 'app-technician-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule, MatTableModule],
  templateUrl: './technician-dashboard.component.html',
  styleUrl: '../technician.styles.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicianDashboardComponent implements OnInit {
  private readonly service = inject(TechnicianService);

  protected readonly items = signal<TechnicianDiaListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly displayedColumns = [
    'diaNumber',
    'clientNumber',
    'clientName',
    'clientLocation',
    'activatedDate',
    'inspectionStatus',
    'currentQuarter',
    'actions',
  ];

  ngOnInit(): void {
    this.load();
  }

  protected statusLabel(status: TechnicianCycleStatus): string {
    return status.startsWith('Quarter') ? `Quarter ${status.slice(-1)}` : status.replace(/([A-Z])/g, ' $1').trim();
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
        next: (items) => this.items.set(items),
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Unable to load activated DIA records.')),
      });
  }
}
