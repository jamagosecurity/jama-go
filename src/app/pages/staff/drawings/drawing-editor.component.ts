import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, concatMap, EMPTY, finalize, from } from 'rxjs';
import { PERMISSIONS } from '../../../models/auth.model';
import { Drawing, DrawingFile } from '../../../models/drawing.model';
import { AuthService } from '../../../services/auth.service';
import { DrawingService } from '../../../services/drawing.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { downloadBlob } from '../../../utils/download.util';
import { fieldErrorMessage, shouldShowError } from '../../../utils/form-validators.util';
import { drawingShareMessage, mailtoShareUrl, whatsAppShareUrl } from '../../../utils/share.util';
import { DRAWING_BASE_PATH } from './drawing-base-path';

/**
 * Builds and decides on one drawing. Mirrors BoqEditorComponent's approval
 * half closely — same bar, same reject modal, same history rendering — but has
 * no line picker: a drawing's content is its files, not nested rows read from a
 * catalogue.
 */
@Component({
  selector: 'app-drawing-editor',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drawing-editor.component.html',
  styleUrl: '../boq/boq.css',
})
export class DrawingEditorComponent implements OnInit {
  private readonly service = inject(DrawingService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  protected readonly basePath = inject(DRAWING_BASE_PATH);

  protected readonly form = this.formBuilder.nonNullable.group({
    projectName: ['', [Validators.required, Validators.maxLength(200)]],
    clientName: ['', [Validators.maxLength(200)]],
    siteLocation: ['', [Validators.maxLength(200)]],
    contactNumber: ['', [Validators.maxLength(40)]],
    notes: ['', [Validators.maxLength(2000)]],
  });

  protected readonly drawing = signal<Drawing | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly savedNotice = signal('');
  private savedNoticeTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly isEditing = computed(() => this.drawing() !== null);

  // ===== File upload =====

  protected readonly uploading = signal(false);
  protected readonly uploadError = signal('');
  protected readonly removingFileId = signal<string | null>(null);

  // ===== Approval =====

  protected readonly canApprove = computed(() => this.auth.can(PERMISSIONS.drawingApprove));
  protected readonly status = computed(() => this.drawing()?.status ?? 'Draft');

  /** Sending an approved drawing out is a decision above even an approver's
   *  grant — only the super administrator sees this. */
  protected readonly canShare = computed(() => this.status() === 'Approved' && this.auth.isSuperAdmin());

  /** As the SERVER says — see the identical note on BoqEditorComponent for why
   *  this is not worked out locally from the status. */
  protected readonly isEditable = computed(
    () => (this.drawing()?.isEditable ?? true) || this.auth.isSuperAdmin(),
  );

  protected readonly isAmending = computed(
    () => this.isEditing() && !(this.drawing()?.isEditable ?? true) && this.auth.isSuperAdmin(),
  );

  protected readonly canSubmit = computed(() =>
    this.isEditing() && this.isEditable() && !this.saving() && !this.deciding());

  protected readonly canDecide = computed(() =>
    this.canApprove() && this.status() === 'Submitted' && !this.deciding());

  protected readonly deciding = signal(false);
  protected readonly rejecting = signal(false);
  protected readonly rejectReason = signal('');
  protected readonly rejectError = signal('');

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      if (this.savedNoticeTimer) clearTimeout(this.savedNoticeTimer);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') this.loadDrawing(id);
  }

  private loadDrawing(id: string): void {
    this.loading.set(true);
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (drawing) => {
          this.drawing.set(drawing);
          this.form.reset({
            projectName: drawing.projectName,
            clientName: drawing.clientName ?? '',
            siteLocation: drawing.siteLocation ?? '',
            contactNumber: drawing.contactNumber ?? '',
            notes: drawing.notes ?? '',
          });
        },
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to load the drawing.')),
      });
  }

  protected showError(field: string): boolean {
    return shouldShowError(this.form.get(field));
  }

  protected errorFor(field: string, label: string): string {
    return fieldErrorMessage(this.form.get(field), label);
  }

  protected save(event: Event): void {
    event.preventDefault();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const request = {
      projectName: raw.projectName.trim(),
      clientName: raw.clientName.trim() || null,
      siteLocation: raw.siteLocation.trim() || null,
      contactNumber: raw.contactNumber.trim() || null,
      notes: raw.notes.trim() || null,
    };

    const existing = this.drawing();
    const save$ = existing
      ? this.service.update(existing.id, request)
      : this.service.create(request);

    this.saving.set(true);
    this.formError.set('');
    this.savedNotice.set('');

    save$
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (saved) => {
          this.drawing.set(saved);
          this.noteSaved(
            existing
              ? `Saved. ${saved.drawingNumber} updated.`
              : `Saved as ${saved.drawingNumber}. Upload the DWG and a plotted PDF below.`,
          );
          // A new drawing has just been given its number and id, so move the
          // URL onto it — a refresh must not land back on /new, and files
          // cannot be uploaded until the drawing exists to attach them to.
          if (!existing) void this.router.navigate([this.basePath, saved.id]);
        },
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to save the drawing.')),
      });
  }

  // ===== Files =====

  /**
   * Uploads every file picked, one at a time.
   *
   * Sequential (concatMap) rather than all at once: the server writes each
   * file's row individually, and firing them in parallel risked two uploads
   * racing to reload the drawing mid-write. A file that fails is reported
   * but does not stop the rest — reload happens once, after the whole batch,
   * so the list does not flicker file-by-file.
   */
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (!files.length) return;

    const existing = this.drawing();
    if (!existing) return;

    this.uploading.set(true);
    this.uploadError.set('');

    from(files)
      .pipe(
        concatMap((file) =>
          this.service.uploadFile(existing.id, file).pipe(
            catchError((err: unknown) => {
              this.uploadError.set(
                getApiErrorMessage(err, `Unable to upload ${file.name}.`),
              );
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.uploading.set(false);
          this.loadDrawing(existing.id);
        }),
      )
      .subscribe();
  }

  /**
   * Whether this file can be downloaded at all yet.
   *
   * Anyone who can open this drawing may download any file once Approved,
   * or the plotted PDF (watermarked) before then. A native CAD file
   * (DWG/DXF/ZIP) can never carry that watermark, so it stays blocked pre-
   * approval regardless of who is asking — see DrawingVisibility.Watermark
   * on the server. The API enforces this regardless of what this screen
   * offers; this only keeps the button from offering something that would
   * come back refused.
   */
  protected canDownloadFile(file: DrawingFile): boolean {
    return this.status() === 'Approved' || this.isPdf(file);
  }

  /** Why a blocked file's button is replaced with a message instead. */
  protected downloadBlockedReason(): string {
    return 'Only the plotted PDF can be previewed before approval.';
  }

  private isPdf(file: DrawingFile): boolean {
    return file.fileName.toLowerCase().endsWith('.pdf');
  }

  protected downloadFile(file: DrawingFile): void {
    this.service
      .downloadFile(file.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => downloadBlob(blob, file.fileName),
        error: (err: unknown) =>
          this.uploadError.set(getApiErrorMessage(err, 'Unable to download that file.')),
      });
  }

  // ===== Share (super admin, approved only) =====

  /**
   * Neither wa.me nor mailto: can attach a file from a web page, and a
   * drawing may carry several files (native CAD plus a plotted PDF) rather
   * than the one document a quotation is — so, unlike the quotation editor,
   * this does not guess which file to download. It only opens the prefilled
   * message; the file list below is where the actual files live.
   */
  protected shareWhatsApp(): void {
    const drawing = this.drawing();
    if (!drawing || !this.canShare()) return;

    window.open(
      whatsAppShareUrl(drawing.contactNumber, drawingShareMessage(drawing)),
      '_blank',
      'noopener,noreferrer',
    );
  }

  protected shareEmail(): void {
    const drawing = this.drawing();
    if (!drawing || !this.canShare()) return;

    window.location.href = mailtoShareUrl(
      `Drawing ${drawing.drawingNumber}${drawing.projectName ? ' — ' + drawing.projectName : ''}`,
      drawingShareMessage(drawing),
    );
  }

  protected removeFile(file: DrawingFile): void {
    const existing = this.drawing();
    if (!existing) return;

    this.removingFileId.set(file.id);
    this.service
      .deleteFile(file.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.removingFileId.set(null)))
      .subscribe({
        next: () => this.loadDrawing(existing.id),
        error: (err: unknown) =>
          this.uploadError.set(getApiErrorMessage(err, 'Unable to remove that file.')),
      });
  }

  /** A rough size for the file list — exact bytes are not the point on screen. */
  protected fileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ===== Approval actions =====

  protected submitForApproval(): void {
    const existing = this.drawing();
    if (!existing || !this.canSubmit()) return;

    this.formError.set('');
    this.deciding.set(true);

    this.service
      .submit(existing.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deciding.set(false)))
      .subscribe({
        next: (saved) => this.applyDecision(saved, 'Sent for approval.'),
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to submit this drawing.')),
      });
  }

  protected approve(): void {
    const existing = this.drawing();
    if (!existing || !this.canDecide()) return;

    this.formError.set('');
    this.deciding.set(true);

    this.service
      .approve(existing.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deciding.set(false)))
      .subscribe({
        next: (saved) => this.applyDecision(saved, `Approved. ${saved.drawingNumber} is now agreed.`),
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to approve this drawing.')),
      });
  }

  protected openReject(): void {
    this.rejectReason.set('');
    this.rejectError.set('');
    this.rejecting.set(true);
  }

  protected closeReject(): void {
    this.rejecting.set(false);
  }

  protected onRejectReasonInput(event: Event): void {
    this.rejectReason.set((event.target as HTMLTextAreaElement).value);
    if (this.rejectError()) this.rejectError.set('');
  }

  protected confirmReject(): void {
    const existing = this.drawing();
    if (!existing) return;

    const reason = this.rejectReason().trim();
    if (reason.length < 5) {
      this.rejectError.set('Say what needs changing — at least a few words.');
      return;
    }

    this.rejectError.set('');
    this.deciding.set(true);

    this.service
      .reject(existing.id, reason)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deciding.set(false)))
      .subscribe({
        next: (saved) => {
          this.rejecting.set(false);
          this.applyDecision(saved, `Rejected. ${saved.drawingNumber} has gone back for changes.`);
        },
        error: (err: unknown) =>
          this.rejectError.set(getApiErrorMessage(err, 'Unable to reject this drawing.')),
      });
  }

  private applyDecision(saved: Drawing, message: string): void {
    this.drawing.set(saved);
    this.noteSaved(message);
  }

  protected stepLabel(action: string): string {
    switch (action) {
      case 'Created': return 'Created';
      case 'Submitted': return 'Submitted for approval';
      case 'Approved': return 'Approved';
      case 'Rejected': return 'Rejected';
      case 'Amended': return 'Amended after the decision';
      default: return action;
    }
  }

  private noteSaved(message: string): void {
    if (this.savedNoticeTimer) clearTimeout(this.savedNoticeTimer);
    this.savedNotice.set(message);
    this.savedNoticeTimer = setTimeout(() => this.savedNotice.set(''), 6000);
  }
}
