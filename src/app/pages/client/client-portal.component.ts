import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { CLIENT_CATEGORY_LABELS, MyClientRegistration } from '../../models/client-registration.model';
import { VipClientDetail, VipClientDocument } from '../../models/vip-client.model';
import { AuthService } from '../../services/auth.service';
import { ClientRegistrationService } from '../../services/client-registration.service';
import { VipClientService } from '../../services/vip-client.service';
import { downloadBlob } from '../../utils/download.util';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { VipFoldersComponent } from '../admin/vip/vip-folders.component';

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
  imports: [DatePipe, VipFoldersComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-portal.component.html',
  styleUrl: './client-portal.component.css',
})
export class ClientPortalComponent implements OnInit {
  private readonly vipService = inject(VipClientService);
  private readonly registrationService = inject(ClientRegistrationService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  protected readonly categoryLabels = CLIENT_CATEGORY_LABELS;

  protected readonly project = signal<VipClientDetail | null>(null);
  protected readonly registration = signal<MyClientRegistration | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

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
