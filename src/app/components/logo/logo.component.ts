import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      [src]="src"
      alt="JAMA Security Equipment"
      [class]="'brand-logo brand-logo--' + variant"
      width="130"
      height="130"
      decoding="async"
      [attr.fetchpriority]="variant === 'header' ? 'high' : null"
      [attr.loading]="variant === 'footer' ? 'lazy' : null"
    />
  `,
})
export class LogoComponent {
  @Input() variant: 'header' | 'footer' = 'header';

  /**
   * Two sizes for the same mark. The footer draws it at 88x88, so a 176px file
   * is already retina. The header looks small too but is transform: scale(3.68)
   * in CSS, which renders it around 280 CSS px — the transform is invisible to
   * the layout box, so only the larger file stays sharp there.
   */
  get src(): string {
    return this.variant === 'footer' ? '/JamaGoLogo-sm.png' : '/JamaGoLogo.png';
  }
}
