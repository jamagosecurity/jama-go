import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RevealDirective } from '../../directives/reveal.directive';
import { CountUpDirective } from '../../directives/count-up.directive';

interface HeroStat {
  icon: string;
  label: string;
  tone: 'blue' | 'gold' | 'teal' | 'coral';
  count: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}
interface ContactChannel {
  id: string;
  badge: string;
  label: string;
  value: string;
  href: string;
  note: string;
  tone: 'blue' | 'green' | 'gold' | 'violet';
}

interface OfficeHour {
  day: string;
  hours: string;
  tone: 'open' | 'half' | 'closed';
}

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule, RevealDirective, CountUpDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent {
  readonly companyEn = 'Jama Go Security Equipment';
  readonly companySub = 'Jama Q Security Solutions';
  readonly companyAr = 'جاما جو للمعدات الامنية';

  readonly address =
    'Showroom, Unit 41, Building No. 349, Street 340, Zone 56, Al Ain Complex, Salwa Road, Doha, Qatar';

  readonly mapQuery = 'Al+Ain+Complex+Salwa+Road+Doha+Qatar';
  readonly mapEmbedUrl = `https://maps.google.com/maps?q=${this.mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  readonly mapLinkUrl = `https://maps.google.com/?q=${this.mapQuery}`;

  readonly phones = [
    { display: '+974 3064 4006', tel: '+97430644006' },
    { display: '+974 3139 5879', tel: '+97431395879' },
    { display: '+974 4001 3599', tel: '+97440013599' },
  ];

  readonly emails = ['info@jamago.qa', 'newton@jamago.qa'];
  readonly primaryPhone = this.phones[0];
  readonly whatsappUrl = `https://wa.me/${this.primaryPhone.tel.replace('+', '')}`;

  readonly heroStats: HeroStat[] = [
    { icon: '🛡️', count: 500, suffix: '+', label: 'Sites Secured', tone: 'blue' },
    { icon: '⚡', count: 15, prefix: '<', suffix: ' min', label: 'Response Time', tone: 'gold' },
    { icon: '🎧', count: 24, suffix: '/7', label: 'Expert Support', tone: 'teal' },
    { icon: '⭐', count: 4.9, suffix: '★', decimals: 1, label: 'Client Rating', tone: 'coral' },
  ];

  readonly trustBadges = [
    '✓ Certified Engineers',
    '✓ Qatar Based Support',
    '✓ Free Site Survey',
    '✓ AMC Available',
  ];

  readonly channels: ContactChannel[] = [
    {
      id: 'call',
      badge: 'Instant',
      label: 'Call Us',
      value: this.primaryPhone.display,
      href: `tel:${this.primaryPhone.tel}`,
      note: `${this.phones[1].display} · ${this.phones[2].display}`,
      tone: 'blue',
    },
    {
      id: 'whatsapp',
      badge: '24/7',
      label: 'WhatsApp',
      value: this.primaryPhone.display,
      href: this.whatsappUrl,
      note: 'Quick responses anytime',
      tone: 'green',
    },
    {
      id: 'email',
      badge: '2hr Reply',
      label: 'Email Us',
      value: this.emails[0],
      href: `mailto:${this.emails[0]}`,
      note: this.emails[1],
      tone: 'gold',
    },
    {
      id: 'visit',
      badge: 'Walk-in',
      label: 'Visit Us',
      value: 'Salwa Road, Doha',
      href: this.mapLinkUrl,
      note: 'Unit 41, Building 349, Zone 56',
      tone: 'violet',
    },
  ];

  readonly whyChoose = [
    'Certified security engineers',
    'CCTV & access control experts',
    'Best installation quality',
    '24/7 AMC & support',
  ];

  readonly officeHours: OfficeHour[] = [
    { day: 'Sunday – Thursday', hours: '8:00 AM – 6:00 PM', tone: 'open' },
    { day: 'Saturday', hours: '9:00 AM – 2:00 PM', tone: 'half' },
    { day: 'Friday', hours: 'Closed', tone: 'closed' },
  ];

  readonly serviceOptions = [
    'CCTV Surveillance',
    'Access Control',
    'Alarm Systems',
    'Smart Home Security',
    'Gate Barriers',
    'AMC & Maintenance',
    'Web & Mobile Solutions',
    'Free Site Survey',
  ];

  readonly faqs: FaqItem[] = [
    {
      question: 'What security services do you provide in Qatar?',
      answer:
        'We supply and install CCTV systems, access control, alarms, intercoms, gate barriers, smart locks, and full AMC maintenance for homes, offices, and commercial sites across Qatar.',
    },
    {
      question: 'Do you offer free site surveys?',
      answer:
        'Yes. Our team visits your location, assesses risks, recommends the right equipment, and provides a clear quotation with no obligation.',
    },
    {
      question: 'How fast can you respond to support requests?',
      answer:
        'For urgent issues we aim to respond within 15 minutes. Standard enquiries are handled within 2 business hours via phone, WhatsApp, or email.',
    },
  ];

  readonly openFaq = signal<number | null>(0);
  readonly sent = signal(false);

  toggleFaq(index: number): void {
    this.openFaq.update((current) => (current === index ? null : index));
  }

  handleSubmit(event: Event): void {
    event.preventDefault();
    if (this.sent()) return;
    const form = event.target as HTMLFormElement;
    form.reset();
    this.sent.set(true);
    setTimeout(() => this.sent.set(false), 3500);
  }
}
