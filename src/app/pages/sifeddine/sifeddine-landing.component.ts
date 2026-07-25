import { ChangeDetectionStrategy, Component, OnInit, WritableSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ExperienceItem {
  role: string;
  company: string;
  type: string;
  period: string;
  location: string;
  accent: string;
}

interface FocusItem {
  title: string;
  desc: string;
  accent: string;
  icon: string;
}

@Component({
  selector: 'app-sifeddine-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sifeddine-landing.component.html',
  styleUrl: './sifeddine-landing.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SifeddineLandingComponent implements OnInit {
  protected readonly years = signal(0);
  protected readonly connections = signal(0);
  protected readonly roles = signal(0);
  protected readonly countries = signal(0);

  protected readonly skills: string[] = [
    'Business Development',
    'National Sales Management',
    'Business Marketing',
    'Client Relations',
    'Negotiation',
    'Market Expansion',
    'Lead Generation',
    'Account Management',
    'Team Leadership',
    'Strategic Partnerships',
  ];

  protected readonly focus: FocusItem[] = [
    {
      title: 'Security Solutions Consulting',
      desc: 'Advising businesses on tailored surveillance, access-control and safety equipment that fit their real-world risk.',
      accent: '#2594d2',
      icon: 'shield',
    },
    {
      title: 'Client Partnerships',
      desc: 'Building trusted, long-term relationships with organisations across Qatar and the wider Gulf.',
      accent: '#f6993d',
      icon: 'handshake',
    },
    {
      title: 'Market Growth',
      desc: 'Spotting new opportunities and expanding Jama Go’s footprint through sharp, data-led outreach.',
      accent: '#16a34a',
      icon: 'trend',
    },
    {
      title: 'Tenders & Proposals',
      desc: 'Preparing competitive commercial proposals and guiding deals from first contact to signature.',
      accent: '#7c3aed',
      icon: 'doc',
    },
    {
      title: 'Sales Strategy',
      desc: 'National sales management and go-to-market planning that turns pipelines into predictable revenue.',
      accent: '#0d9488',
      icon: 'target',
    },
    {
      title: 'Cross-Border Experience',
      desc: 'Bridging markets and cultures across Qatar and Türkiye with a genuinely international perspective.',
      accent: '#e11d48',
      icon: 'globe',
    },
  ];

  protected readonly experience: ExperienceItem[] = [
    {
      role: 'Business Development Specialist',
      company: 'Jama Go Security Equipment',
      type: 'Full-time',
      period: 'Sep 2024 — Present',
      location: 'Doha, Qatar',
      accent: '#2594d2',
    },
    {
      role: 'General Manager',
      company: 'Espoir Clinic',
      type: 'Self-employed',
      period: 'Oct 2021 — Aug 2024',
      location: 'Istanbul, Türkiye',
      accent: '#7c3aed',
    },
    {
      role: 'Sales Manager',
      company: 'DR Bayer Clinics',
      type: 'Contract',
      period: 'Jan 2018 — Jul 2021',
      location: '3 yrs 7 mos',
      accent: '#f6993d',
    },
  ];

  ngOnInit(): void {
    this.countTo(this.years, 7, 1400);
    this.countTo(this.roles, 3, 1200);
    this.countTo(this.countries, 2, 1000);
    this.countTo(this.connections, 128, 1700);
  }

  private countTo(target: WritableSignal<number>, end: number, duration: number): void {
    const start = performance.now();
    const step = (now: number): void => {
      const progress = Math.min(1, (now - start) / duration);
      // ease-in-out for a premium feel
      const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
      target.set(Math.round(end * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
