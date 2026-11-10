import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PERMISSIONS } from '../../../models/auth.model';
import { MaintenanceIssueOption } from '../../../models/maintenance.model';
import { AuthService } from '../../../services/auth.service';
import { MaintenanceService } from '../../../services/maintenance.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { MAINTENANCE_BASE_PATH } from './maintenance-base-path';
import {
  ChecklistLine,
  MaintenanceChecklistComponent,
  checklistSubtotal,
  toLineInputs,
} from './maintenance-checklist.component';

/**
 * Logging a ticket on someone's behalf — a phone-in report, a site visit
 * found something. A client reports their own the same way, from their own
 * portal page instead of this one; both call the identical create endpoint.
 */
@Component({
  selector: 'app-maintenance-editor',
  standalone: true,
  imports: [ReactiveFormsModule, MaintenanceChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './maintenance-editor.component.html',
  styleUrl: './maintenance-editor.component.css',
})
export class MaintenanceEditorComponent implements OnInit {
  private readonly service = inject(MaintenanceService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  protected readonly basePath = inject(MAINTENANCE_BASE_PATH);

  /** maintenance.manage may reprice a line and give a discount; anyone else
   *  files at the standard rates, the same as a client reporting their own. */
  protected readonly canSetFee = this.auth.can(PERMISSIONS.maintenanceManage);

  protected readonly issueOptions = signal<MaintenanceIssueOption[]>([]);
  protected readonly lines = signal<ChecklistLine[]>([]);
  protected readonly discount = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    clientName: [''],
    clientEmail: ['', [Validators.required, Validators.email]],
    contactNumber: [''],
    siteLocation: [''],
    description: [''],
  });

  ngOnInit(): void {
    this.service
      .issueCatalogue()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => this.issueOptions.set(options),
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load the issue list.')),
      });
  }

  protected save(): void {
    if (this.saving()) return;

    const email = this.form.controls.clientEmail;
    if (email.invalid) {
      email.markAsTouched();
      this.error.set(email.value.trim() ? 'Enter a valid client email.' : "Enter the client's email.");
      return;
    }
    if (!this.lines().length) {
      this.error.set('Tick at least one issue.');
      return;
    }
    if (this.canSetFee && this.discount() > checklistSubtotal(this.lines())) {
      this.error.set('The discount is more than the subtotal.');
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');

    this.service
      .create({
        lines: toLineInputs(this.lines(), this.canSetFee),
        clientName: value.clientName.trim() || null,
        clientEmail: value.clientEmail.trim(),
        contactNumber: value.contactNumber.trim() || null,
        siteLocation: value.siteLocation.trim() || null,
        description: value.description.trim() || null,
        discount: this.canSetFee ? this.discount() : null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (ticket) => void this.router.navigate([this.basePath, ticket.id]),
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not create this ticket.')),
      });
  }

  protected cancel(): void {
    void this.router.navigate([this.basePath]);
  }
}
