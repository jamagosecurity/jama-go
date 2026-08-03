import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { VipClientDocument, VipClientFolder } from '../../../models/vip-client.model';

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

            @if (canManage()) {
              <label class="vip-upload">
                <input
                  type="file"
                  [attr.accept]="accept"
                  [disabled]="busyFolderId() === folder.id"
                  (change)="pick(folder.id, $event)"
                />
                <span>{{ busyFolderId() === folder.id ? 'Uploading…' : 'Upload file' }}</span>
              </label>
            }
          </header>

          @if (!folder.documents.length) {
            <p class="vip-empty">No files here yet.</p>
          } @else {
            <ul class="vip-files">
              @for (doc of folder.documents; track doc.id) {
                <li class="vip-file">
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
          }
        </section>
      }
    </div>
  `,
  styleUrl: './vip-folders.component.css',
})
export class VipFoldersComponent {
  readonly folders = input.required<VipClientFolder[]>();
  readonly canManage = input(false);
  /** Folder currently uploading, so only that card shows a busy state. */
  readonly busyFolderId = input<string | null>(null);

  readonly upload = output<{ folderId: string; file: File }>();
  readonly download = output<VipClientDocument>();
  readonly remove = output<VipClientDocument>();
  /** Raised instead of `upload` when a file fails the local pre-check. */
  readonly rejected = output<string>();

  protected readonly accept = ACCEPTED_EXTENSIONS.join(',');

  protected pick(folderId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Cleared first so picking the same file twice in a row still fires a change.
    input.value = '';
    if (!file) return;

    const reason = this.reject(file);
    if (reason) {
      this.rejected.emit(reason);
      return;
    }

    this.upload.emit({ folderId, file });
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
