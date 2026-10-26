import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { VipClientDocument, VipClientFolder } from '../../../models/vip-client.model';
import { VipClientService } from '../../../services/vip-client.service';
import { downloadBlob } from '../../../utils/download.util';
import { getApiErrorMessage } from '../../../utils/api-error.util';

/**
 * Mirrors FileStorageSettings on the API. The server stays authoritative and
 * re-checks both — this only spares the user a round trip and an upload that
 * was always going to be refused.
 */
export const ACCEPTED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv',
  '.png', '.jpg', '.jpeg', '.webp', '.heic', '.zip',
];
export const MAX_UPLOAD_MB = 25;

/**
 * The four project folders and their documents.
 *
 * Shared by the admin detail page and the client portal — the only difference
 * is `canManage`, which reveals upload and delete. Keeping one component means
 * a client can never see a layout that has drifted from what staff see.
 *
 * "Download all" and "download selected" are handled right here rather than
 * via an output, unlike upload/delete: they do not change the document list,
 * so there is nothing for the parent to reload — the component can own the
 * whole round trip.
 */
@Component({
  selector: 'app-vip-folders',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vip-folders">
      @for (folder of folders(); track folder.id) {
        <section class="vip-folder surface-card surface-card--rail-top">
          <header class="vip-folder-head">
            <div class="vip-folder-title">
              <span class="vip-folder-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </span>
              <div>
                <strong>{{ folder.name }}</strong>
                <small>
                  {{ folder.documents.length }}
                  {{ folder.documents.length === 1 ? 'file' : 'files' }}
                </small>
              </div>
            </div>

            <div class="vip-folder-actions">
              @if (folder.documents.length > 1) {
                <button
                  type="button"
                  class="vip-act vip-act--ghost"
                  [disabled]="zipBusyFolderId() === folder.id"
                  (click)="downloadAll(folder)"
                >
                  {{ zipBusyFolderId() === folder.id ? 'Zipping…' : 'Download all' }}
                </button>
              }
              @if (canManage()) {
                <label class="vip-upload">
                  <input
                    type="file"
                    multiple
                    [attr.accept]="accept"
                    [disabled]="busyFolderId() === folder.id"
                    (change)="pick(folder.id, $event)"
                  />
                  <span>{{ busyFolderId() === folder.id ? 'Uploading…' : 'Upload files' }}</span>
                </label>
              }
            </div>
          </header>

          @if (!folder.documents.length) {
            <p class="vip-empty">No files here yet.</p>
          } @else {
            <ul class="vip-files">
              @for (doc of folder.documents; track doc.id) {
                <li class="vip-file" [class.is-selected]="isSelected(doc.id)">
                  <label class="vip-file-check">
                    <input
                      type="checkbox"
                      [checked]="isSelected(doc.id)"
                      (change)="toggle(doc.id, $event)"
                      [attr.aria-label]="'Select ' + doc.fileName"
                    />
                  </label>

                  <span class="vip-file-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M6 2h9l3 3v17H6z" /><path d="M9 9h6M9 13h6M9 17h4" />
                    </svg>
                  </span>

                  <span class="vip-file-meta">
                    <strong>{{ doc.fileName }}</strong>
                    <small>
                      {{ doc.sizeBytes / 1024 | number: '1.0-0' }} KB ·
                      {{ doc.uploadedAt | date: 'mediumDate' }}
                      @if (doc.uploadedBy) {
                        · {{ doc.uploadedBy }}
                      }
                    </small>
                  </span>

                  <span class="vip-file-actions">
                    <button type="button" class="vip-act" (click)="download.emit(doc)">
                      Download
                    </button>
                    @if (canManage()) {
                      <button
                        type="button"
                        class="vip-act vip-act--danger"
                        (click)="remove.emit(doc)"
                      >
                        Delete
                      </button>
                    }
                  </span>
                </li>
              }
            </ul>

            @if (selectedIn(folder).length) {
              <footer class="vip-selection-bar">
                <span>{{ selectedIn(folder).length }} selected</span>
                <div class="vip-selection-actions">
                  <button type="button" class="vip-act vip-act--ghost" (click)="clearSelection(folder)">
                    Clear
                  </button>
                  <button
                    type="button"
                    class="vip-act vip-act--primary"
                    [disabled]="zipBusyFolderId() === folder.id"
                    (click)="downloadSelected(folder)"
                  >
                    {{ zipBusyFolderId() === folder.id ? 'Zipping…' : 'Download selected' }}
                  </button>
                </div>
              </footer>
            }
          }
        </section>
      }
    </div>
  `,
  styleUrl: './vip-folders.component.css',
})
export class VipFoldersComponent {
  private readonly service = inject(VipClientService);
  private readonly destroyRef = inject(DestroyRef);

  readonly folders = input.required<VipClientFolder[]>();
  readonly canManage = input(false);
  /** Folder currently uploading, so only that card shows a busy state. */
  readonly busyFolderId = input<string | null>(null);

  /** One or more files picked at once for the same folder — the handler
   *  uploads them one by one and reports failures per file. */
  readonly upload = output<{ folderId: string; files: File[] }>();
  readonly download = output<VipClientDocument>();
  readonly remove = output<VipClientDocument>();
  /** Raised alongside `upload` for any file that fails the local pre-check,
   *  and whenever a zip download fails. The files that passed still upload. */
  readonly rejected = output<string>();

  protected readonly accept = ACCEPTED_EXTENSIONS.join(',');

  /** Document ids ticked for "download selected" — one set for every folder
   *  in the list, since document ids are unique across the whole project. */
  private readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  /** Folder currently being zipped, so only that card shows a busy state. */
  protected readonly zipBusyFolderId = signal<string | null>(null);

  protected isSelected(documentId: string): boolean {
    return this.selectedIds().has(documentId);
  }

  protected selectedIn(folder: VipClientFolder): VipClientDocument[] {
    const selected = this.selectedIds();
    return folder.documents.filter((d) => selected.has(d.id));
  }

  protected toggle(documentId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedIds());
    if (checked) {
      next.add(documentId);
    } else {
      next.delete(documentId);
    }
    this.selectedIds.set(next);
  }

  protected clearSelection(folder: VipClientFolder): void {
    const next = new Set(this.selectedIds());
    for (const doc of folder.documents) {
      next.delete(doc.id);
    }
    this.selectedIds.set(next);
  }

  protected downloadAll(folder: VipClientFolder): void {
    if (this.zipBusyFolderId()) return;
    this.zipBusyFolderId.set(folder.id);

    this.service
      .downloadFolder(folder.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.zipBusyFolderId.set(null)),
      )
      .subscribe({
        next: (blob) => downloadBlob(blob, `${folder.name}.zip`),
        error: (err: unknown) =>
          this.rejected.emit(getApiErrorMessage(err, 'Could not download these files.')),
      });
  }

  protected downloadSelected(folder: VipClientFolder): void {
    if (this.zipBusyFolderId()) return;
    const ids = this.selectedIn(folder).map((d) => d.id);
    if (!ids.length) return;

    this.zipBusyFolderId.set(folder.id);

    this.service
      .downloadFolderSelected(folder.id, ids)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.zipBusyFolderId.set(null)),
      )
      .subscribe({
        next: (blob) => {
          downloadBlob(blob, ids.length === 1 ? `${this.selectedIn(folder)[0].fileName}.zip` : `${folder.name}.zip`);
          this.clearSelection(folder);
        },
        error: (err: unknown) =>
          this.rejected.emit(getApiErrorMessage(err, 'Could not download the selected files.')),
      });
  }

  protected pick(folderId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = input.files ? Array.from(input.files) : [];
    // Cleared first so picking the same file(s) twice in a row still fires a change.
    input.value = '';
    if (!picked.length) return;

    const files: File[] = [];
    for (const file of picked) {
      const reason = this.reject(file);
      if (reason) {
        this.rejected.emit(reason);
      } else {
        files.push(file);
      }
    }

    if (files.length) {
      this.upload.emit({ folderId, files });
    }
  }

  private reject(file: File): string | null {
    const dot = file.name.lastIndexOf('.');
    const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return `${extension || 'That file type'} is not accepted. Allowed: ${ACCEPTED_EXTENSIONS.join(', ')}.`;
    }

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return `${file.name} is ${mb} MB. Files must be ${MAX_UPLOAD_MB} MB or smaller.`;
    }

    if (file.size === 0) {
      return `${file.name} is empty.`;
    }

    return null;
  }
}
