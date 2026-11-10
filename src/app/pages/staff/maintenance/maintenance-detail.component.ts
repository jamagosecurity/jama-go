import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AppSelectComponent, type AppSelectOption } from '../../../components/app-select/app-select.component';
import { PERMISSIONS } from '../../../models/auth.model';
import { AssignableStaff, MaintenanceIssueOption, MaintenanceRequest } from '../../../models/maintenance.model';
import { AuthService } from '../../../services/auth.service';
import { MaintenanceService } from '../../../services/maintenance.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { MAINTENANCE_BASE_PATH } from './maintenance-base-path';
import {
  ChecklistLine,
  MaintenanceChecklistComponent,
  checklistSubtotal,
  toChecklistLines,
  toLineInputs,
} from './maintenance-checklist.component';

/** One ticket: its client and site, the ticked issues with their totals
 *  (editable by maintenance.manage while still open), and whichever actions
 *  the signed-in account's grants open — assign, resolve, cancel, delete. */
@Component({
  selector: 'app-maintenance-detail',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, AppSelectComponent, MaintenanceChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './maintenance-detail.component.html',
  styleUrl: './maintenance-detail.component.css',
})
export class MaintenanceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(MaintenanceService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);
  protected readonly basePath = inject(MAINTENANCE_BASE_PATH);

  protected readonly canManage = this.auth.can(PERMISSIONS.maintenanceManage);

  private readonly id = this.route.snapshot.paramMap.get('id')!;

  protected readonly ticket = signal<MaintenanceRequest | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected readonly isOpen = computed(() => {
    const status = this.ticket()?.status;
    return status === 'Open' || status === 'InProgress';
  });
  protected readonly editable = computed(() => this.canManage && this.isOpen());

  protected readonly form = this.formBuilder.nonNullable.group({
    clientName: [''],
    clientEmail: ['', [Validators.required, Validators.email]],
    contactNumber: [''],
    siteLocation: [''],
    description: [''],
  });

  protected readonly issueOptions = signal<MaintenanceIssueOption[]>([]);
  protected readonly lines = signal<ChecklistLine[]>([]);
  protected readonly discount = signal(0);

  protected readonly assignableStaff = signal<AssignableStaff[]>([]);
  protected readonly assignableStaffOptions = computed<AppSelectOption[]>(() =>
    this.assignableStaff().map((s) => ({
      value: s.adminUserId,
      label: s.department ? `${s.fullName} — ${s.department}` : s.fullName,
    })),
  );
  protected readonly selectedAssignee = signal('');

  protected readonly resolveNotes = signal('');
  protected readonly cancelReason = signal('');
  protected readonly showResolveBox = signal(false);
  protected readonly showCancelBox = signal(false);

  ngOnInit(): void {
    this.load();

    if (this.canManage) {
      this.service.issueCatalogue().pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (options) => this.issueOptions.set(options), error: () => undefined });
      this.service.assignableStaff().pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (staff) => this.assignableStaff.set(staff), error: () => undefined });
    }
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getById(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (ticket) => {
          this.show(ticket);
          this.selectedAssignee.set(ticket.assignedToId ?? '');
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not load this ticket.')),
      });
  }

  /** Puts a ticket on screen — the form and the checklist both re-read from
   *  it, so after a save they show what the server actually stored. */
  private show(ticket: MaintenanceRequest): void {
    this.ticket.set(ticket);
    this.form.setValue({
      clientName: ticket.clientName ?? '',
      clientEmail: ticket.clientEmail ?? '',
      contactNumber: ticket.contactNumber ?? '',
      siteLocation: ticket.siteLocation ?? '',
      description: ticket.description ?? '',
    });
    this.lines.set(toChecklistLines(ticket.lines));
    this.discount.set(ticket.discount);
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
      this.error.set('A ticket needs at least one ticked issue.');
      return;
    }
    if (this.discount() > checklistSubtotal(this.lines())) {
      this.error.set('The discount is more than the subtotal.');
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');

    this.service
      .update(this.id, {
        lines: toLineInputs(this.lines(), true),
        clientName: value.clientName.trim() || null,
        clientEmail: value.clientEmail.trim(),
        contactNumber: value.contactNumber.trim() || null,
        siteLocation: value.siteLocation.trim() || null,
        description: value.description.trim() || null,
        discount: this.discount(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (ticket) => {
          this.show(ticket);
          this.notice.set('Saved.');
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not save this ticket.')),
      });
  }

  protected assign(): void {
    const staffId = this.selectedAssignee();
    if (!staffId) return;

    this.saving.set(true);
    this.error.set('');
    this.service
      .assign(this.id, staffId)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (ticket) => this.ticket.set(ticket),
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not assign this ticket.')),
      });
  }

  protected confirmResolve(): void {
    const notes = this.resolveNotes().trim();
    if (!notes) return;

    this.saving.set(true);
    this.error.set('');
    this.service
      .resolve(this.id, notes)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (ticket) => {
          this.show(ticket);
          this.showResolveBox.set(false);
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not resolve this ticket.')),
      });
  }

  protected confirmCancel(): void {
    const reason = this.cancelReason().trim();
    if (!reason) return;

    this.saving.set(true);
    this.error.set('');
    this.service
      .cancel(this.id, reason)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (ticket) => {
          this.show(ticket);
          this.showCancelBox.set(false);
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not cancel this ticket.')),
      });
  }

  protected deleteTicket(): void {
    this.saving.set(true);
    this.error.set('');
    this.service
      .delete(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => void this.router.navigate([this.basePath]),
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not delete this ticket.')),
      });
  }

  protected back(): void {
    void this.router.navigate([this.basePath]);
  }
}
