import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs';
import { TechnicianFinalSummary } from '../../../models/technician.model';
import { TechnicianService } from '../../../services/technician.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

import { TechnicianInspectionSectionsComponent } from '../shared/technician-inspection-sections.component';

@Component({
  selector: 'app-technician-final-summary',
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule, TechnicianInspectionSectionsComponent],
  templateUrl: './technician-final-summary.component.html',
  styleUrl: '../technician.styles.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicianFinalSummaryComponent implements OnInit {
  private readonly service = inject(TechnicianService);
  private readonly route = inject(ActivatedRoute);

  protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly summary = signal<TechnicianFinalSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.service
      .getFinalSummary(this.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (summary) => this.summary.set(summary),
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Unable to load final summary.')),
      });
  }
}
