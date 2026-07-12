import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LogoComponent } from '../logo/logo.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [LogoComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  readonly year = new Date().getFullYear();

  readonly footerLinks = [
    { href: '/#services', label: 'Services' },
    { href: '/#why', label: 'Why Us' },
    { href: '/#stats', label: 'Results' },
    { href: '/#support', label: 'Support' },
    { href: '/#team', label: 'Our Team' },
    { href: '/contact', label: 'Contact' },
  ];
}
