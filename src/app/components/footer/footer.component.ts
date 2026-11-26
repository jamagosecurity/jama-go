import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  readonly year = new Date().getFullYear();

  readonly serviceLinks = [
    { href: '/#surveillance-cctv', label: 'CCTV Surveillance' },
    { href: '/#access-control', label: 'Access Control' },
    { href: '/#intruder-alarms', label: 'Intruder Alarms' },
    { href: '/#gate-barriers', label: 'Gate Barriers' },
    { href: '/#moi-approval', label: 'MOI-SSD Approval' },
    { href: '/#amc-services', label: 'AMC & Maintenance' },
  ];

  readonly companyLinks = [
    { href: '/#why', label: 'Why Jama Go' },
    { href: '/#how', label: 'How we work' },
    { href: '/#projects', label: 'Projects' },
    { href: '/#coverage', label: 'Coverage' },
    { href: '/#support', label: 'Support' },
    { href: '/contact', label: 'Contact' },
  ];

  readonly phones = ['+974 3064 4006', '+974 3139 5879', '+974 4001 3599'];
}
