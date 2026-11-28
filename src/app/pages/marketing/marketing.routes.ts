import { Route, Routes } from '@angular/router';

function marketingPage(path: string, key: string, title: string): Route {
  return {
    path,
    title: `${title} — Jama Go Security`,
    data: { marketingPage: key },
    loadComponent: () =>
      import('./marketing-page.component').then((m) => m.MarketingPageComponent),
  };
}

export const MARKETING_ROUTES: Routes = [
  {
    path: 'about',
    children: [
      marketingPage('why-us', 'why-us', 'Why Jama Go'),
      marketingPage('company', 'company', 'About Us'),
      marketingPage('results', 'results', 'Our Results'),
      { path: '', pathMatch: 'full', redirectTo: 'company' },
    ],
  },
  {
    path: 'services',
    children: [
      marketingPage('cctv-surveillance', 'cctv-surveillance', 'CCTV Surveillance'),
      marketingPage('access-control', 'access-control', 'Access Control Systems'),
      marketingPage('intruder-alarms', 'intruder-alarms', 'Intruder Alarm Systems'),
      marketingPage('gate-barriers', 'gate-barriers', 'Gate Barriers'),
      marketingPage('moi-ssd-approval', 'moi-ssd-approval', 'MOI-SSD Approval'),
      marketingPage('installation-maintenance', 'installation-maintenance', 'Installation & Maintenance'),
      marketingPage('amc-maintenance', 'amc-maintenance', 'AMC Services'),
      { path: '', pathMatch: 'full', redirectTo: 'cctv-surveillance' },
    ],
  },
  {
    path: 'solutions',
    children: [
      marketingPage('smart-home-automation', 'smart-home-automation', 'Smart Home & Automation'),
      marketingPage('intercom-systems', 'intercom-systems', 'Intercom Systems'),
      marketingPage('smart-door-locks', 'smart-door-locks', 'Smart Door Locks'),
      marketingPage('telephone-systems', 'telephone-systems', 'Telephone Systems'),
      marketingPage('speed-gates-turnstiles', 'speed-gates-turnstiles', 'Speed Gates & Turnstiles'),
      marketingPage('metal-detectors', 'metal-detectors', 'Metal Detectors'),
      marketingPage('cctv-drawings', 'cctv-drawings', 'CCTV Drawings'),
      marketingPage('ceiling-sound-systems', 'ceiling-sound-systems', 'Ceiling Sound Systems'),
      marketingPage('internet-wifi', 'internet-wifi', 'Internet & Wi-Fi'),
      marketingPage('central-satellite', 'central-satellite', 'Central Satellite'),
      marketingPage('security-accessories', 'security-accessories', 'Security Accessories'),
      { path: '', pathMatch: 'full', redirectTo: 'smart-home-automation' },
    ],
  },
  {
    path: 'projects',
    children: [
      marketingPage('moi', 'moi-projects', 'MOI Projects'),
      marketingPage('non-moi', 'non-moi-projects', 'Non-MOI Projects'),
      { path: '', pathMatch: 'full', redirectTo: 'non-moi' },
    ],
  },
  {
    path: 'journal',
    children: [
      marketingPage('site-survey', 'journal-site-survey', 'What a Useful Site Survey Covers'),
      marketingPage('moi-planning', 'journal-moi-planning', 'Plan MOI Approval Before Buying Equipment'),
      marketingPage('amc-value', 'journal-amc-value', 'What an AMC Actually Protects'),
      marketingPage('', 'journal', 'Security Insights & Guides'),
    ],
  },
  marketingPage('support', 'support', '24/7 Technical Support'),
];
