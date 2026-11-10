import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { CLIENT_CATEGORY_LABELS, MyClientRegistration } from '../../models/client-registration.model';
import { MaintenanceIssueOption, MaintenanceRequestListItem } from '../../models/maintenance.model';
import { VipClientDetail, VipClientDocument } from '../../models/vip-client.model';
import { AuthService } from '../../services/auth.service';
import { ClientRegistrationService } from '../../services/client-registration.service';
import { MaintenanceService } from '../../services/maintenance.service';
import { VipClientService } from '../../services/vip-client.service';
import { downloadBlob } from '../../utils/download.util';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { VipFoldersComponent } from '../admin/vip/vip-folders.component';
import {
  ChecklistLine,
  MaintenanceChecklistComponent,
  toLineInputs,
} from '../staff/maintenance/maintenance-checklist.component';

/**
 * What a client sees. Two kinds of client share this page: one who registered
 * on the website (their registration — category, teams, DIA — is shown) and a
 * VIP client an admin set up (their project folders are shown). A client can be
 * both, so each part appears when it exists rather than one replacing the other.
 *
 * Both are resolved server-side from the token — this page never sends an id,
 * so there is nothing for a client to tamper with. Read-only throughout.
 */
@Component({
  selector: 'app-client-portal',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, VipFoldersComponent, MaintenanceChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-portal.component.html',
  styleUrl: './client-portal.component.css',
})
export class ClientPortalComponent implements OnInit {
  private readonly vipService = inject(VipClientService);
  private readonly registrationService = inject(ClientRegistrationService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  protected readonly categoryLabels = CLIENT_CATEGORY_LABELS;

  protected readonly project = signal<VipClientDetail | null>(null);
  protected readonly registration = signal<MyClientRegistration | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  // Maintenance: service callouts. Any signed-in client can log one and see
  // their own — the same screen, under the same permission rules, that a
  // staff account without maintenance.manage uses.
  protected readonly issueOptions = signal<MaintenanceIssueOption[]>([]);
  protected readonly tickets = signal<MaintenanceRequestListItem[]>([]);
  protected readonly ticketsLoading = signal(true);
  protected readonly showTicketForm = signal(false);
  protected readonly submittingTicket = signal(false);
  protected readonly ticketError = signal('');
  protected readonly ticketNotice = signal('');
  protected readonly ticketLines = signal<ChecklistLine[]>([]);

  protected readonly ticketForm = this.formBuilder.nonNullable.group({
    clientName: [''],
    clientEmail: ['', [Validators.required, Validators.email]],
    contactNumber: [''],
    siteLocation: [''],
    description: [''],
  });

  ngOnInit(): void {
    // Each side 404s for the kind of client it is not — that is an absence,
    // not a failure, so neither is allowed to sink the other.
    forkJoin({
      project: this.vipService.getMyProject().pipe(catchError(() => of(null))),
      registration: this.registrationService.getMine().pipe(catchError(() => of(null))),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe(({ project, registration }) => {
        this.project.set(project);
        this.registration.set(registration);
        if (!project && !registration) {
          this.error.set('Unable to load your account. Please sign out and in again, or contact Jama Go.');
        }
      });

    this.maintenanceService
      .issueCatalogue()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (options) => this.issueOptions.set(options), error: () => undefined });

    this.loadTickets();
  }

  private loadTickets(): void {
    this.ticketsLoading.set(true);
    this.maintenanceService
      .getMine()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.ticketsLoading.set(false)))
      .subscribe({
        next: (tickets) => this.tickets.set(tickets),
        error: (err: unknown) => this.ticketError.set(getApiErrorMessage(err, 'Could not load your tickets.')),
      });
  }

  protected openTicketForm(): void {
    this.ticketError.set('');
    this.ticketNotice.set('');
    // Pre-filled from the account, so a registered client rarely types any of
    // it — still editable, for a callout at a different site.
    const reg = this.registration();
    this.ticketForm.setValue({
      clientName: reg?.fullName ?? this.auth.currentUser()?.fullName ?? '',
      clientEmail: reg?.email ?? this.auth.currentUser()?.email ?? '',
      contactNumber: reg?.mobile ?? '',
      siteLocation: reg?.siteLocation ?? '',
      description: '',
    });
    this.ticketLines.set([]);
    this.showTicketForm.set(true);
  }

  protected submitTicket(): void {
    if (this.submittingTicket()) return;
    const email = this.ticketForm.controls.clientEmail;
    if (email.invalid) {
      email.markAsTouched();
      this.ticketError.set(email.value.trim() ? 'Enter a valid email.' : 'Enter your email.');
      return;
    }
    if (!this.ticketLines().length) {
      this.ticketError.set('Tick at least one issue.');
      return;
    }

    const value = this.ticketForm.getRawValue();
    this.submittingTicket.set(true);
    this.ticketError.set('');
    this.ticketNotice.set('');

    this.maintenanceService
      .create({
        lines: toLineInputs(this.ticketLines(), false),
        clientName: value.clientName.trim() || null,
        clientEmail: value.clientEmail.trim(),
        contactNumber: value.contactNumber.trim() || null,
        siteLocation: value.siteLocation.trim() || null,
        description: value.description.trim() || null,
        discount: null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.submittingTicket.set(false)))
      .subscribe({
        next: (ticket) => {
          this.ticketNotice.set(`Logged as ${ticket.requestNumber}. We'll follow up shortly.`);
          this.ticketLines.set([]);
          this.showTicketForm.set(false);
          this.loadTickets();
        },
        error: (err: unknown) => this.ticketError.set(getApiErrorMessage(err, 'Could not log this ticket.')),
      });
  }

  protected download(doc: VipClientDocument): void {
    this.vipService
      .download(doc.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => downloadBlob(blob, doc.fileName),
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Could not download that file.')),
      });
  }

  protected logout(): void {
    this.auth.logout();
  }
}
