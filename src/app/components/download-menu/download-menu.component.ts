import { OverlayModule, type ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ExportFormat } from '../../models/export-format.model';

/**
 * The download icon button with a small PDF / Excel / Word menu under it.
 *
 * The menu is a CDK overlay, like app-select: it opens against the button and stays on screen (flipping above when
 * there is no room below), so it is never clipped by a scrolling table. Clicking outside or choosing closes it.
 */
@Component({
  selector: 'app-download-menu',
  standalone: true,
  imports: [OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './download-menu.component.html',
  styleUrl: './download-menu.component.css',
})
export class DownloadMenuComponent {
  readonly disabled = input(false);
  /** What each choice holds, shown under its name. */
  readonly hints = input<Partial<Record<ExportFormat, string>>>({});
  readonly choose = output<ExportFormat>();

  protected readonly open = signal(false);

  protected readonly items: ReadonlyArray<{ key: ExportFormat; label: string; tag: string }> = [
    { key: 'pdf', label: 'PDF', tag: 'PDF' },
    { key: 'excel', label: 'Excel', tag: 'XLS' },
    { key: 'word', label: 'Word', tag: 'DOC' },
  ];

  protected readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
  ];

  protected toggle(): void {
    if (!this.disabled()) this.open.update((o) => !o);
  }

  protected pick(format: ExportFormat): void {
    this.open.set(false);
    this.choose.emit(format);
  }
}
