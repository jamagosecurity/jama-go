import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';
import { TechnicianDiaDetail } from '../../../models/technician.model';
import { TechnicianService } from '../../../services/technician.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

import { TechnicianInspectionSectionsComponent } from '../shared/technician-inspection-sections.component';

@Component({
  selector: 'app-technician-dia-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule, MatProgressBarModule, TechnicianInspectionSectionsComponent],
  templateUrl: './technician-dia-detail.component.html',
  styleUrl: '../technician.styles.css',
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
