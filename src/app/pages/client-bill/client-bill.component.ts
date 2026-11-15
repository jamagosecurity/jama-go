import { DatePipe, DecimalPipe } from '@angular/common';
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
 * the key. They see the invoice and answer it once: Approve is a single tap; Reject and Comment open a box for the reason
 * and send with one tap. Nothing is decided just by opening the link, so a mail scanner that opens every link can never
 * answer for the client.
 */
@Component({
  selector: 'app-client-bill',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule],
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

  /** Reject or Comment while the client writes the reason. */
  protected readonly choice = signal<'reject' | 'comment' | null>(null);
  protected readonly message = signal('');
  protected readonly name = signal('');
  /** What they just did in this visit, so the thank-you can say it. */
  protected readonly justDid = signal<ClientDecisionKind | null>(null);

  protected readonly pdfUrl = `${environment.apiUrl}/nonmoijobs/bill/${this.token}`;

  protected readonly messageError = computed(() =>
    this.message().trim().length < 3 ? 'Please write a few words, so we know what to change.' : '');
  /** Which button is working, for its spinner. */
  protected readonly sending = signal<ClientDecisionKind | null>(null);

  ngOnInit(): void {
    this.api
      .publicBill(this.token)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (bill) => {
          this.bill.set(bill);
          // Older emails had a button per answer (?do=reject|comment): open the reason box for those. Approve is never
          // done just by opening a link.
          const wanted = this.route.snapshot.queryParamMap.get('do');
          if (bill.canRespond && (wanted === 'reject' || wanted === 'comment')) this.choice.set(wanted);
        },
        error: () => this.loadError.set('This link is not valid, or the bill is no longer available. Please contact Jama Go Security Equipment.'),
      });
  }

  protected pick(choice: 'reject' | 'comment'): void {
    this.choice.set(this.choice() === choice ? null : choice);
    this.error.set('');
  }

  /** One tap: approve now. */
  protected approve(): void {
    this.send('approve');
  }

  /** One tap: send the rejection or comment with its reason. */
  protected sendMessage(): void {
    const choice = this.choice();
    if (!choice) return;
    if (this.messageError()) {
      this.error.set(this.messageError());
      return;
    }
    this.send(choice);
  }

  private send(choice: ClientDecisionKind): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.sending.set(choice);
    this.error.set('');
    this.api
      .respond(this.token, choice, choice === 'approve' ? null : this.message().trim(), this.name().trim() || null)
      .pipe(finalize(() => { this.saving.set(false); this.sending.set(null); }))
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
