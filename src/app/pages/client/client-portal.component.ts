import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { VipClientDetail, VipClientDocument } from '../../models/vip-client.model';
import { AuthService } from '../../services/auth.service';
import { VipClientService } from '../../services/vip-client.service';
import { downloadBlob } from '../../utils/download.util';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { VipFoldersComponent } from '../admin/vip/vip-folders.component';

/**
 * What a VIP client sees. Read-only: the same folder component the admin uses,
 * with canManage off, so upload and delete are absent rather than hidden.
 *
 * The project is resolved server-side from the token — this page never sends an
 * id, so there is nothing for a client to tamper with.
 */
@Component({
  selector: 'app-client-portal',
  standalone: true,
  imports: [VipFoldersComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-portal.component.html',
  styleUrl: './client-portal.component.css',
})
export class ClientPortalComponent implements OnInit {
  private readonly service = inject(VipClientService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  protected readonly project = signal<VipClientDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.service
      .getMyProject()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (project) => this.project.set(project),
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Unable to load your project.')),
      });
  }

  protected download(doc: VipClientDocument): void {
    this.service
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
