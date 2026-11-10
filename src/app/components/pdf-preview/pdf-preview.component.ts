import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, effect, input, output, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';

/**
 * A full-screen window that shows a PDF the server has just produced, so it can be read before anyone downloads it.
 * The caller hands over the PDF as a Blob; this component owns turning it into an address the viewer can show,
 * and gives that address back to the browser when it is closed.
 */
@Component({
  selector: 'app-pdf-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pp-overlay" (click)="closed.emit()">
      <section class="pp-window" role="dialog" aria-modal="true" [attr.aria-label]="title()" (click)="$event.stopPropagation()">
        <header class="pp-head">
          <strong>{{ title() }}</strong>
          <span class="pp-spacer"></span>
          <button type="button" class="pp-btn" (click)="download.emit()">Download PDF</button>
          <button type="button" class="pp-btn pp-btn--ghost" (click)="closed.emit()">Close</button>
        </header>
        @if (url(); as src) {
          <iframe class="pp-frame" [src]="src" [title]="title()"></iframe>
        }
      </section>
    </div>
  `,
  styles: `
    .pp-overlay { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 2.5vh 2.5vw; background: rgba(15, 33, 66, 0.62); }
    .pp-window { width: min(1100px, 100%); height: 100%; display: flex; flex-direction: column; overflow: hidden; border-radius: 14px; background: #fff; box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45); }
    .pp-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #14305f; color: #fff; }
    .pp-spacer { flex: 1; }
    .pp-btn { min-height: 40px; padding: 0 20px; border: 0; border-radius: 999px; background: linear-gradient(145deg, #e8383f 0%, #d21319 55%, #a40f14 100%); color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
    .pp-btn--ghost { background: transparent; border: 1.5px solid #afaea2; color: #fff; }
    .pp-frame { flex: 1; width: 100%; border: 0; background: #e9e7e1; }
    @media (max-width: 640px) { .pp-overlay { padding: 0; } .pp-window { border-radius: 0; } .pp-head strong { font-size: 0.9rem; } }
  `,
})
export class PdfPreviewComponent implements OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private objectUrl: string | null = null;

  readonly blob = input.required<Blob>();
  readonly title = input('Preview');
  readonly closed = output<void>();
  readonly download = output<void>();

  protected readonly url = signal<SafeResourceUrl | null>(null);

  constructor() {
    effect(() => {
      this.release();
      this.objectUrl = URL.createObjectURL(this.blob());
      // Safe to trust: it is an address we just made from the PDF our own server returned.
      this.url.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closed.emit();
  }

  ngOnDestroy(): void {
    this.release();
  }

  private release(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
