import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, filter, finalize, switchMap } from 'rxjs';
import { Dia, DiaStatus } from '../../../../models/dia.model';
import { Invoice } from '../../../../models/invoice.model';
import { DiaService } from '../../../../services/dia.service';
import { InvoiceService } from '../../../../services/invoice.service';
import { getApiErrorMessage } from '../../../../utils/api-error.util';
import {
  ConfirmationDialogData,
  DiaConfirmationDialogComponent,
  DiaEmptyStateComponent,
  DiaSkeletonComponent,
  DiaStatusChipComponent,
} from '../shared/dia-shared.components';

@Component({
  selector: 'app-dia-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatProgressBarModule,
    MatSnackBarModule,
    DiaEmptyStateComponent,
    DiaSkeletonComponent,
    DiaStatusChipComponent,
  ],
  templateUrl: './dia-detail.component.html',
  styleUrl: '../dia.styles.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaDetailComponent implements OnInit {
  private readonly service = inject(DiaService);
  private readonly invoiceService = inject(InvoiceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly dia = signal<Dia | null>(null);
  protected readonly loading = signal(true);
  protected readonly acting = signal(false);
  protected readonly error = signal('');
  protected readonly invoices = signal<Invoice[]>([]);
  protected readonly invoicesLoading = signal(true);
  protected readonly sharingInvoiceId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
    this.loadInvoices();
  }

  protected statusLabel(status: DiaStatus): string {
    return status.startsWith('Quarter') ? `Quarter ${status.slice(-1)}` : status;
  }

  protected progress(item: Dia): number {
    return Math.max(0, Math.min(100, item.progressPercent));
  }

  protected confirm(action: 'activate' | 'deactivate' | 'archive'): void {
    const item = this.dia();
    if (!item || this.acting()) return;
    const definitions: Record<typeof action, ConfirmationDialogData> = {
      activate: {
        title: 'Activate DIA inspection?',
        message: `${item.diaNumber} will begin its quarterly schedule.`,
        confirmLabel: 'Activate',
      },
      deactivate: {
        title: 'Deactivate DIA inspection?',
        message: `${item.diaNumber} will stop its active schedule.`,
        confirmLabel: 'Deactivate',
      },
      archive: {
        title: 'Archive DIA inspection?',
        message: `${item.diaNumber} will be removed from the active register. This cannot be undone.`,
        confirmLabel: 'Archive',
        danger: true,
      },
    };
    this.dialog
      .open(DiaConfirmationDialogComponent, { data: definitions[action], width: '460px' })
      .afterClosed()
      .pipe(
        filter((confirmed): confirmed is true => confirmed === true),
        switchMap(() => {
          this.acting.set(true);
          const request: Observable<unknown> =
            action === 'activate'
              ? this.service.activate(item.id)
              : action === 'deactivate'
                ? this.service.deactivate(item.id)
                : this.service.archive(item.id);
          return request.pipe(finalize(() => this.acting.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.snackBar.open(`DIA ${action}d successfully.`, 'Dismiss', { duration: 3500 });
          if (action === 'archive') {
            void this.router.navigate(['/admin/dia/list']);
          } else {
            this.load();
          }
        },
        error: (error: unknown) =>
          this.snackBar.open(getApiErrorMessage(error, `Unable to ${action} DIA.`), 'Dismiss', {
            duration: 6000,
          }),
      });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .getById(this.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (dia) => this.dia.set(dia),
        error: (error: unknown) =>
          this.error.set(getApiErrorMessage(error, 'Unable to load this DIA inspection.')),
      });
  }

  protected loadInvoices(): void {
    this.invoicesLoading.set(true);
    this.invoiceService
      .getList(this.id)
      .pipe(
        finalize(() => this.invoicesLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (invoices) => this.invoices.set(invoices),
        error: (error: unknown) =>
          this.snackBar.open(getApiErrorMessage(error, 'Unable to load invoices.'), 'Dismiss', {
            duration: 5000,
          }),
      });
  }

  protected downloadInvoice(invoice: Invoice): void {
    this.invoiceService
      .download(invoice.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${invoice.invoiceNumber}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
        },
        error: (error: unknown) =>
          this.snackBar.open(getApiErrorMessage(error, 'Unable to download invoice.'), 'Dismiss', {
            duration: 5000,
          }),
      });
  }

  protected shareInvoice(invoice: Invoice): void {
    this.sharingInvoiceId.set(invoice.id);
    this.invoiceService
      .createShareLink(invoice.id)
      .pipe(
        finalize(() => this.sharingInvoiceId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: async (link) => {
          const url = this.invoiceService.buildShareUrl(link.token);
          try {
            await navigator.clipboard.writeText(url);
            this.snackBar.open('Share link copied to clipboard (valid 7 days).', 'Dismiss', {
              duration: 5000,
            });
          } catch {
            this.snackBar.open(url, 'Copy', { duration: 15000 });
          }
        },
        error: (error: unknown) =>
          this.snackBar.open(getApiErrorMessage(error, 'Unable to create share link.'), 'Dismiss', {
            duration: 5000,
          }),
      });
  }
}
