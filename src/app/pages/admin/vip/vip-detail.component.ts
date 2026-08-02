import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, filter, finalize, switchMap } from 'rxjs';
import { VipClientDetail, VipClientDocument } from '../../../models/vip-client.model';
import { VipClientService } from '../../../services/vip-client.service';
import { downloadBlob } from '../../../utils/download.util';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import {
  ConfirmationDialogData,
  DiaConfirmationDialogComponent,
} from '../dia/shared/dia-shared.components';
import { VipFoldersComponent } from './vip-folders.component';

@Component({
  selector: 'app-vip-detail',
  standalone: true,
  imports: [RouterLink, VipFoldersComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vip-detail.component.html',
  styleUrl: './vip-detail.component.css',
})
export class VipDetailComponent implements OnInit {
  private readonly service = inject(VipClientService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly client = signal<VipClientDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly busyFolderId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.service
      .getById(this.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (client) => this.client.set(client),
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Unable to load this VIP client.')),
      });
  }

  protected upload(event: { folderId: string; file: File }): void {
    if (this.busyFolderId()) return;
    this.busyFolderId.set(event.folderId);
    this.error.set('');

    this.service
      .upload(event.folderId, event.file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyFolderId.set(null)),
      )
      .subscribe({
        next: () => {
          this.notice.set(`${event.file.name} uploaded.`);
          this.load();
        },
        // Surfaces the API's own message, which names the rejected type or size.
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Upload failed.')),
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

  protected remove(doc: VipClientDocument): void {
    this.confirm({
      title: 'Delete this file?',
      message: `${doc.fileName} will be removed from the project and from disk. This cannot be undone.`,
      confirmLabel: 'Delete file',
      danger: true,
    })
      .pipe(
        filter((confirmed): confirmed is true => confirmed === true),
        switchMap(() => this.service.deleteDocument(doc.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notice.set(`${doc.fileName} deleted.`);
          this.load();
        },
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Could not delete that file.')),
      });
  }

  protected deleteClient(): void {
    const client = this.client();
    if (!client) return;

    this.confirm({
      title: 'Delete this VIP client?',
      message: `${client.clientName} — ${client.projectName}, their login and every uploaded file will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete everything',
      danger: true,
    })
      .pipe(
        filter((confirmed): confirmed is true => confirmed === true),
        switchMap(() => this.service.delete(client.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigate(['/admin/vip']),
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Could not delete this VIP client.')),
      });
  }

  /** Reuses the DIA confirmation dialog so destructive actions look and behave
   *  the same across the admin console, instead of a native browser confirm. */
  private confirm(data: ConfirmationDialogData): Observable<boolean | undefined> {
    return this.dialog
      .open(DiaConfirmationDialogComponent, { data, width: '460px' })
      .afterClosed();
  }
}
