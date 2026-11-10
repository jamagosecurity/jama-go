import { OverlayModule, type ConnectedPosition } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  forwardRef,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

export interface AppSelectOption {
  value: string;
  label: string;
}

/**
 * A drop-in replacement for `<select formControlName="…">` whose open list is
 * an in-app styled panel instead of the browser's own native popup — the
 * native one can't be themed at all in Safari and only partially elsewhere,
 * so every dropdown in the app ended up looking like plain system UI rather
 * than part of the product.
 *
 * CDK Overlay (already a dependency, already driving MatDialog elsewhere)
 * positions the panel against the trigger and keeps it on-screen — flipping
 * above when there's no room below — so it is never clipped by an ancestor's
 * `overflow: hidden`/`auto`, which a hand-positioned `position: absolute`
 * panel inside a scrolling table or card would be.
 */
@Component({
  selector: 'app-select',
  standalone: true,
  imports: [OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-select.component.html',
  styleUrl: './app-select.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSelectComponent),
      multi: true,
    },
  ],
})
export class AppSelectComponent implements ControlValueAccessor {
  @Input({ required: true }) options: readonly AppSelectOption[] = [];
  @Input() placeholder = 'Select…';
  @Input() ariaLabel = '';

  /** When set, the list ends with a "+ <label>" row that fires `create`
   *  instead of picking a value — for fields where the user may need a value
   *  that is not on the list yet. The host decides what creating means. */
  @Input() createLabel = '';
  @Output() readonly create = new EventEmitter<void>();

  /** For call sites with no FormGroup to hang a `formControlName` off —
   *  plain `[value]`/`(valueChange)` binding works too, in parallel with the
   *  ControlValueAccessor wiring reactive forms uses. */
  @Input()
  set value(v: string | null | undefined) {
    this.selected.set(v ?? '');
  }
  get value(): string {
    return this.selected();
  }
  @Output() readonly valueChange = new EventEmitter<string>();

  @ViewChild('trigger', { static: true }) private readonly triggerRef!: ElementRef<HTMLButtonElement>;

  protected readonly isOpen = signal(false);
  protected readonly selected = signal('');
  protected readonly isDisabled = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly triggerWidth = signal(240);

  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  ];

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.selected.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  /** Rows the keyboard can land on: the options, plus the create row. */
  private rowCount(): number {
    return this.options.length + (this.createLabel ? 1 : 0);
  }

  protected selectedLabel(): string {
    return this.options.find((o) => o.value === this.selected())?.label ?? this.placeholder;
  }

  protected toggle(): void {
    if (this.isDisabled()) return;
    this.isOpen() ? this.close() : this.open();
  }

  protected open(): void {
    if (this.isDisabled() || this.options.length === 0) return;
    this.triggerWidth.set(this.triggerRef.nativeElement.getBoundingClientRect().width);
    const current = this.options.findIndex((o) => o.value === this.selected());
    this.activeIndex.set(current >= 0 ? current : 0);
    this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
    this.onTouched();
  }

  protected choose(option: AppSelectOption): void {
    this.selected.set(option.value);
    this.onChange(option.value);
    this.valueChange.emit(option.value);
    this.close();
    this.triggerRef.nativeElement.focus();
  }

  protected startCreate(): void {
    this.close();
    this.create.emit();
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (!this.isOpen()) this.open();
    }
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.update((i) => Math.min(i + 1, this.rowCount() - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.update((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(0);
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(this.rowCount() - 1);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const option = this.options[this.activeIndex()];
        if (option) this.choose(option);
        else if (this.createLabel && this.activeIndex() === this.options.length) this.startCreate();
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        this.triggerRef.nativeElement.focus();
        break;
      case 'Tab':
        this.close();
        break;
    }
  }
}
