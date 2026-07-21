import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { TechnicianInspection } from '../../../models/technician.model';
import { TechnicianService } from '../../../services/technician.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

import { TechnicianInspectionSectionsComponent } from '../shared/technician-inspection-sections.component';

@Component({
  selector: 'app-technician-inspection-review',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatSnackBarModule, TechnicianInspectionSectionsComponent],
  templateUrl: './technician-inspection-review.component.html',
  styleUrl: '../technician.styles.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicianInspectionReviewComponent implements OnInit {
  private readonly service = inject(TechnicianService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly inspection = signal<TechnicianInspection | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.service
      .getInspectionById(this.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (inspection) => this.inspection.set(inspection),
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Unable to load inspection review.')),
      });
  }

  protected submit(): void {
    if (this.submitting() || this.inspection()?.isReadOnly) return;
    this.submitting.set(true);
    this.service
      .submitInspection(this.id)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Inspection submitted successfully.', 'Dismiss', { duration: 3500 });
          void this.router.navigate(['/technician']);
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Unable to submit inspection.')),
      });
  }
}
