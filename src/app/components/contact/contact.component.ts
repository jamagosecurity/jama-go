import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RevealDirective } from '../../directives/reveal.directive';
import { CountUpDirective } from '../../directives/count-up.directive';

interface HeroStat {
  id: string;
  label: string;
  tone: 'blue' | 'gold' | 'teal' | 'coral';
  count: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

interface ShowcaseImage {
  src: string;
  alt: string;
  caption: string;
}
interface TrustBadge {
  id: string;
  label: string;
  tone: 'blue' | 'green' | 'gold' | 'violet';
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

interface OfficeDay {
  short: string;
  label: string;
  hours: string;
  tone: 'open' | 'closed';
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
  private readonly sanitizer = inject(DomSanitizer);

  readonly companyEn = 'Jama Go Security Equipment';
  readonly companySub = 'Jama Q Security Solutions';
  readonly companyAr = 'جاما جو للمعدات الامنية';

  readonly address =
    'Showroom, Unit 41, Building No. 349, Street 340, Zone 56, Al Ain Complex, Salwa Road, Doha, Qatar';

  readonly mapLat = 25.244419707160755;
  readonly mapLng = 51.46524245838021;
  readonly mapCoords = `${this.mapLat},${this.mapLng}`;
  readonly mapLinkUrl = `https://www.google.com/maps?q=${this.mapCoords}`;
  readonly mapEmbedUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    `https://www.google.com/maps?q=${this.mapCoords}&z=16&output=embed`,
  );

  readonly phones = [
    { display: '+974 3064 4006', tel: '+97430644006' },
    { display: '+974 3139 5879', tel: '+97431395879' },
    { display: '+974 4001 3599', tel: '+97440013599' },
  ];

  readonly emails = ['info@jamago.qa', 'newton@jamago.qa'];
  readonly primaryPhone = this.phones[0];
  readonly whatsappUrl = `https://wa.me/${this.primaryPhone.tel.replace('+', '')}`;

  readonly heroImageUrl =
    'https://images.unsplash.com/photo-1563986768609-322da97575a0?auto=format&fit=crop&w=1600&q=80';

  readonly showcaseImages: ShowcaseImage[] = [
    {
      src: 'https://images.unsplash.com/photo-1557597774-9d273605dfa8?auto=format&fit=crop&w=800&q=80',
      alt: 'Security monitoring and CCTV control room',
      caption: 'CCTV & Monitoring',
    },
    {
      src: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=800&q=80',
      alt: 'Professional security camera installation',
      caption: 'Expert Installation',
    },
    {
      src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      alt: 'Commercial building security solutions in Qatar',
      caption: 'Commercial Projects',
    },
  ];

  readonly heroStats: HeroStat[] = [
    { id: 'secured', count: 500, suffix: '+', label: 'Sites Secured', tone: 'blue' },
    { id: 'response', count: 15, prefix: '<', suffix: ' min', label: 'Response Time', tone: 'gold' },
    { id: 'support', count: 24, suffix: '/7', label: 'Expert Support', tone: 'teal' },
    { id: 'rating', count: 4.9, suffix: '★', decimals: 1, label: 'Client Rating', tone: 'coral' },
  ];

  readonly trustBadges: TrustBadge[] = [
    { id: 'certified', label: 'Certified Engineers', tone: 'blue' },
    { id: 'qatar', label: 'Qatar Based Support', tone: 'green' },
    { id: 'survey', label: 'Free Site Survey', tone: 'gold' },
    { id: 'amc', label: 'Yearly Maintenance', tone: 'violet' },
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

  readonly officeHoursLabel = '8:00 AM – 9:00 PM';

  readonly weekSchedule: OfficeDay[] = [
    { short: 'Sat', label: 'Saturday', hours: '8:00 AM – 9:00 PM', tone: 'open' },
    { short: 'Sun', label: 'Sunday', hours: '8:00 AM – 9:00 PM', tone: 'open' },
    { short: 'Mon', label: 'Monday', hours: '8:00 AM – 9:00 PM', tone: 'open' },
    { short: 'Tue', label: 'Tuesday', hours: '8:00 AM – 9:00 PM', tone: 'open' },
    { short: 'Wed', label: 'Wednesday', hours: '8:00 AM – 9:00 PM', tone: 'open' },
    { short: 'Thu', label: 'Thursday', hours: '8:00 AM – 9:00 PM', tone: 'open' },
    { short: 'Fri', label: 'Friday', hours: 'Holiday', tone: 'closed' },
  ];

  get openStatus(): { open: boolean; label: string } {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Qatar',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(now);

    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    const totalMinutes = hour * 60 + minute;

    if (weekday === 'Friday') {
      return { open: false, label: 'Closed — Friday Holiday' };
    }
    if (totalMinutes >= 8 * 60 && totalMinutes < 21 * 60) {
      return { open: true, label: 'Open Now' };
    }
    return { open: false, label: 'Opens 8:00 AM' };
  }

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
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim() || 'Not provided';
    const service = String(data.get('service') ?? '').trim();
    const message = String(data.get('msg') ?? '').trim();

    const text = [
      '*New Enquiry — Jama Go Security*',
      '',
      `*Name:* ${name}`,
      `*Email:* ${email}`,
      `*Phone:* ${phone}`,
      `*Service:* ${service}`,
      '',
      `*Message:*`,
      message,
    ].join('\n');

    const whatsappSendUrl = `https://wa.me/${this.primaryPhone.tel.replace('+', '')}?text=${encodeURIComponent(text)}`;
    window.open(whatsappSendUrl, '_blank', 'noopener,noreferrer');

    form.reset();
    this.sent.set(true);
    setTimeout(() => this.sent.set(false), 4000);
  }

  buildEmailLink(event: Event): void {
    event.preventDefault();
    const form = (event.target as HTMLElement).closest('form');
    if (!form) return;

    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim() || 'Not provided';
    const service = String(data.get('service') ?? '').trim();
    const message = String(data.get('msg') ?? '').trim();

    const subject = encodeURIComponent(`Contact Enquiry — ${service}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nService: ${service}\n\nMessage:\n${message}`,
    );
    window.location.href = `mailto:${this.emails[0]}?subject=${subject}&body=${body}`;
  }
}
