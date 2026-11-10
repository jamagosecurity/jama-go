import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClientDecisionKind, PublicJobBill } from '../../models/non-moi-job.model';
import { NonMoiJobService } from '../../services/non-moi-job.service';
import { getApiErrorMessage } from '../../utils/api-error.util';

/**
 * The page a client reaches from the link in their bill email or WhatsApp message. No sign-in: the secret in the link is
 * the key. They see the bill and answer it — Approve, Reject (with a reason) or Comment (asking for a change). The email's
 * buttons open this page with the matching choice already picked, but nothing is sent until the client confirms here, so
 * a mail scanner that opens every link can never approve a bill by accident.
 */
@Component({
  selector: 'app-client-bill',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-bill.component.html',
  styleUrl: './client-bill.component.css',
})
export class ClientBillComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(NonMoiJobService);

  protected readonly token = this.route.snapshot.paramMap.get('token') ?? '';
  protected readonly bill = signal<PublicJobBill | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  /** Which answer the client is composing, if any. */
  protected readonly choice = signal<ClientDecisionKind | null>(null);
  protected readonly message = signal('');
  protected readonly name = signal('');
  /** What they just did in this visit, so the thank-you can say it. */
  protected readonly justDid = signal<ClientDecisionKind | null>(null);

  protected readonly pdfUrl = `${environment.apiUrl}/nonmoijobs/bill/${this.token}`;

  protected readonly needsMessage = computed(() => this.choice() === 'reject' || this.choice() === 'comment');
  protected readonly messageError = computed(() =>
    this.needsMessage() && this.message().trim().length < 3 ? 'Please write a few words, so we know what to change.' : '');
  protected readonly canSend = computed(() => !!this.choice() && !this.messageError() && !this.saving());

  ngOnInit(): void {
    this.api
      .publicBill(this.token)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (bill) => {
          this.bill.set(bill);
          // The buttons in the email arrive here with ?do=approve|reject|comment already chosen.
          const wanted = this.route.snapshot.queryParamMap.get('do');
          if (bill.canRespond && (wanted === 'approve' || wanted === 'reject' || wanted === 'comment')) this.choice.set(wanted);
        },
        error: () => this.loadError.set('This link is not valid, or the bill is no longer available. Please contact Jama Go Security Equipment.'),
      });
  }

  protected pick(choice: ClientDecisionKind): void {
    this.choice.set(this.choice() === choice ? null : choice);
    this.error.set('');
  }

  protected send(): void {
    const choice = this.choice();
    if (!choice || !this.canSend()) return;
    this.saving.set(true);
    this.error.set('');
    this.api
      .respond(this.token, choice, choice === 'approve' ? null : this.message().trim(), this.name().trim() || null)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (bill) => {
          this.justDid.set(choice);
          this.choice.set(null);
          this.bill.set(bill);
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Your answer could not be sent. Please try again.')),
      });
  }
}
