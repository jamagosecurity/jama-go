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
  @Input() tone: 'color' | 'light' = 'color';

  get src(): string {
    if (this.variant === 'footer') return '/JamaGoLogo-sm.png';
    return this.tone === 'light' ? '/JamaGoLogo-gold.png' : '/JamaGoLogo-navy.png';
  }
}
