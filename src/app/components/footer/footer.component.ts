import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NAV_LABELS_AR } from '../../data/nav.data';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
  readonly language = inject(LanguageService);

  label(english: string): string {
    return this.language.text(english, NAV_LABELS_AR[english] ?? english);
  }

  readonly serviceLinks = [
    { href: '/services/cctv-surveillance', label: 'CCTV Surveillance' },
    { href: '/services/access-control', label: 'Access Control' },
    { href: '/services/intruder-alarms', label: 'Intruder Alarms' },
    { href: '/services/gate-barriers', label: 'Gate Barriers' },
    { href: '/services/moi-ssd-approval', label: 'MOI-SSD Approval' },
    { href: '/services/amc-maintenance', label: 'AMC & Maintenance' },
    { href: '/cameras', label: 'Camera Catalogue' },
  ];

  readonly companyLinks = [
    { href: '/about/why-us', label: 'Why Jama Go' },
    { href: '/about/company', label: 'About Us' },
    { href: '/projects/non-moi', label: 'Projects' },
    { href: '/about/results', label: 'Our Results' },
    { href: '/support', label: 'Support' },
    { href: '/journal', label: 'Journal' },
    { href: '/contact', label: 'Contact' },
    { href: '/admin/login', label: 'Client Sign In' },
  ];

  readonly phones = ['+974 3064 4006', '+974 3139 5879', '+974 4001 3599'];
}
