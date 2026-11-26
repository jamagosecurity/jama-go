import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HERO_ROUTES, MAP_H, MAP_W, MARKER_SEEDS, QATAR_PATH } from '../../components/hero/hero.component';

interface Service {
  /** The anchor the header's menus link to. */
  id: string;
  /** Other menu anchors that should land on this card. */
  aliases?: string[];
  title: string;
  text: string;
  /** Stroke paths of a 24×24 line icon. */
  icon: string[];
  /** Where "Learn more" goes, when the card has its own section. */
  more?: string;
}

interface Fact {
  value: string;
  label: string;
}

/**
 * The public home page of jamago.qa — light, premium, and only about Jama Go's real work.
 *
 * Every claim on it comes from the company's own material: the services from the Solutions menu, the MOI-SSD
 * approved-contractor badge, the letterhead (Salwa Road showroom, phones, email) and the brands in the quotation
 * catalogue. The facts band holds no invented figures — real numbers go in {@link facts} when the company sends them.
 *
 * Sections carry the ids the header's menus link to (#surveillance-cctv, #moi-approval, #support …), so every menu
 * entry lands on the part of the page it names.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly hero = viewChild<ElementRef<HTMLElement>>('hero');

  /** The six blades of the lens's iris, one every 60°. */
  protected readonly irisBlades = [0, 60, 120, 180, 240, 300];

  // ----- the map (real coastline and towns, shared with the sign-in page) -----
  protected readonly mapW = MAP_W;
  protected readonly mapH = MAP_H;
  protected readonly qatarPath = QATAR_PATH;
  protected readonly routes = HERO_ROUTES;
  protected readonly markers = MARKER_SEEDS.map((m) => ({
    ...m,
    left: `${(m.x / MAP_W) * 100}%`,
    top: `${(m.y / MAP_H) * 100}%`,
  }));

  protected readonly phone = '+974 3064 4006';
  protected readonly phoneHref = 'tel:+97430644006';
  protected readonly phones = ['+974 3064 4006', '+974 3139 5879', '+974 4001 3599'];
  protected readonly email = 'info@jamago.qa';
  protected readonly address = 'Unit 41, Zone 56, Street 340, Building No. 349, Al Ain Complex, Salwa Road, Doha – Qatar';

  protected readonly services: Service[] = [
    {
      id: 'surveillance-cctv', title: 'CCTV Surveillance',
      text: 'HD and 4K IP cameras, recorders and live view on your phone — designed around each site, from a villa to a tower.',
      icon: ['M3 8.5 14.5 5l2.4 6.2L5.4 14.7Z', 'M16.9 11.2 20 10l1 3-3.2 1.2', 'M7 14.5V19H3'],
    },
    {
      id: 'access-control', title: 'Access Control',
      text: 'Card, fingerprint and face readers, magnetic locks and time attendance for every door that matters.',
      icon: ['M7 3h10v18H7z', 'M10 6.5h4', 'M12 11a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z'],
    },
    {
      id: 'intruder-alarms', title: 'Intruder Alarms',
      text: 'Door, motion and glass-break sensors with sirens and instant alerts on your phone.',
      icon: ['M6 17v-6a6 6 0 0 1 12 0v6', 'M4 17h16', 'M12 2.5V5', 'M10 20.5h4', 'M3.5 7.5 5 9M20.5 7.5 19 9'],
    },
    {
      id: 'gate-barriers', aliases: ['speed-gates'], title: 'Gate Barriers & Speed Gates',
      text: 'Car-park barriers, turnstiles and speed gates for lobbies, compounds and car parks.',
      icon: ['M4 21V8h3v13', 'M7 10.5h13.5v3H7', 'M11 10.5l2 3M15 10.5l2 3', 'M2.5 21h7'],
    },
    {
      id: 'intercom', title: 'Intercom Systems',
      text: 'Video intercoms for villas, buildings and compounds — see who is at the gate and answer from anywhere.',
      icon: ['M6 2.5h12v19H6z', 'M9 6h6v5H9z', 'M10 15.5h4', 'M10 18h4'],
    },
    {
      id: 'smart-door-lock', aliases: ['smart-home'], title: 'Smart Locks & Smart Home',
      text: 'Smart door locks, lighting and home automation that work together — and from your phone.',
      icon: ['M7 11V8a5 5 0 0 1 10 0v3', 'M5 11h14v10H5z', 'M12 14.5v3'],
    },
    {
      id: 'moi-card', title: 'MOI-SSD Approval',
      text: 'CCTV drawings, storage calculations and submission — we take MOI projects through to approval.',
      icon: ['M12 2.5 20 5.5v6c0 5-3.4 8.4-8 9.9-4.6-1.5-8-4.9-8-9.9v-6Z', 'm8.5 12 2.5 2.5 4.5-5'],
      more: 'moi-approval',
    },
    {
      id: 'amc-services', aliases: ['installation'], title: 'AMC & Maintenance',
      text: 'Annual maintenance contracts with planned visits, and fast call-outs when something stops working.',
      icon: ['M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6-2-2z'],
    },
    {
      id: 'internet-wifi', title: 'Networks & Wi-Fi',
      text: 'Structured cabling, switches and Wi-Fi that your cameras, phones and business run on.',
      icon: ['M2.5 9a14 14 0 0 1 19 0', 'M5.5 12.5a9.5 9.5 0 0 1 13 0', 'M8.7 16a5 5 0 0 1 6.6 0', 'M12 19.5h.01'],
    },
  ];

  /** The rest of the Solutions menu, each with the anchor the menu links to. */
  protected readonly alsoOffered = [
    { id: 'ceiling-sound', label: 'Ceiling sound systems' },
    { id: 'central-satellite', label: 'Central satellite' },
    { id: 'telephone', label: 'Telephone systems' },
    { id: 'metal-detector', label: 'Metal detectors' },
    { id: 'cctv-drawing', label: 'CCTV drawings' },
    { id: 'accessories', label: 'Accessories' },
  ];

  /**
   * From the brand marks the quotation catalogue uses, each with the height it is shown at. Logos come in every shape
   * (Dell is square, Bose is eight times wider than tall), so one shared height made the wide, bold ones look huge and
   * the compact ones tiny. Each height here gives the logo the same visible area, nudged for how heavy its ink is, so
   * the row reads as even.
   */
  protected readonly brands = (
    [
      ['hikvision', 'Hikvision', 24],
      ['dahua', 'Dahua', 37],
      ['axis', 'Axis Communications', 42],
      ['bosch', 'Bosch', 35],
      ['uniview', 'Uniview', 48],
      ['wisenet', 'Hanwha Wisenet', 27],
      ['pelco', 'Pelco', 29],
      ['tiandy', 'Tiandy', 37],
      ['reolink', 'Reolink', 31],
      ['cisco', 'Cisco', 48],
      ['huawei', 'Huawei', 34],
      ['aruba', 'Aruba', 35],
      ['tp-link', 'TP-Link', 46],
      ['panduit', 'Panduit', 31],
      ['seagate', 'Seagate', 45],
      ['wd', 'Western Digital', 35],
      ['toshiba', 'Toshiba', 25],
      ['dell', 'Dell', 48],
      ['lutron', 'Lutron', 26],
      ['loxone', 'Loxone', 32],
      ['aqara', 'Aqara', 39],
      ['lifesmart', 'LifeSmart', 37],
      ['orvibo', 'ORVIBO', 33],
      ['abb', 'ABB', 40],
      ['sonos', 'Sonos', 31],
      ['bose', 'Bose', 23],
      ['dsppa', 'DSPPA', 28],
      ['itc', 'ITC', 48],
      ['televes', 'Televes', 34],
      ['kstar', 'KSTAR', 29],
      ['apsys', 'Apsys', 39],
      ['netcon', 'Netcon', 33],
      ['norden', 'Norden', 31],
      ['wi-tek', 'Wi-Tek', 48],
      ['bolein', 'Bolein', 43],
      ['hubnetix', 'Hubnetix', 32],
      ['atnt', 'AT&T', 31],
      ['xgimi', 'XGIMI', 32],
    ] as const
  ).map(([file, name, height]) => ({ src: `/brands/${file}.webp`, name, height }));

  /** The best-known names, small, under the hero's buttons — at the same even sizes, scaled down. */
  protected readonly heroBrands = ['Hikvision', 'Dahua', 'Axis Communications', 'Bosch', 'Uniview']
    .map((name) => this.brands.find((b) => b.name === name)!)
    .map((b) => ({ ...b, height: Math.round(b.height * 0.62) }));

  protected readonly steps = [
    { title: 'Free site survey', text: 'We visit, walk the site with you and listen to what needs protecting.' },
    { title: 'Design & quotation', text: 'A clear, itemised quotation — brand, model and price on every line.' },
    { title: 'Installation', text: 'Our own team installs, cables and configures everything, neatly.' },
    { title: 'Testing & approval', text: 'Tested and handed over — and taken through MOI-SSD approval where required.' },
    { title: 'Support & AMC', text: 'One number to call afterwards, with maintenance contracts and 24/7 help.' },
  ];

  protected readonly moiSteps = [
    'Site survey and camera plan',
    'CCTV drawing and storage calculation',
    'Installation to the approved design',
    'Inspection and handover',
  ];

  protected readonly reasons = [
    { title: 'Showroom on Salwa Road', text: 'See and try cameras, locks and intercoms before you choose.' },
    { title: 'Brands you know', text: 'Hikvision, Dahua, Axis, Bosch and more — chosen to fit each site.' },
    { title: 'Clear quotations', text: 'Every line shows the brand, the model and the price. No surprises.' },
    { title: '24/7 support', text: 'A support line for urgent issues, day or night.' },
  ];

  /**
   * The facts band. Only true statements — no invented figures. When the company sends its real numbers (projects
   * done, years in business, clients), they replace these.
   */
  protected readonly facts: Fact[] = [
    { value: '24/7', label: 'Support line' },
    { value: 'Free', label: 'Site survey & quotation' },
    { value: 'MOI-SSD', label: 'Approved CCTV contractor' },
    { value: 'Salwa Road', label: 'Showroom, Doha' },
  ];

  protected readonly support = [
    { title: '24/7 help line', text: 'Call for urgent site issues at any hour, any day of the week.', icon: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z'] },
    { title: 'Maintenance contracts', text: 'Planned visits keep every camera recording and every door working.', icon: ['M8 3v3M16 3v3', 'M4 6h16v15H4z', 'M4 10h16', 'm9 15 2 2 4-4'] },
    { title: 'Technical assistance', text: 'Apps, remote viewing, passwords and settings — often fixed over the phone.', icon: ['M4 13a8 8 0 0 1 16 0', 'M4 13v4a2 2 0 0 0 2 2h1v-6H4', 'M20 13v4a2 2 0 0 1-2 2h-1v-6h3'] },
  ];

  protected readonly year = new Date().getFullYear();

  /** The real Doha time. Null on the server (the page is prerendered), filled in the browser. */
  protected readonly dohaTime = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      const tick = () =>
        this.dohaTime.set(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Qatar' }).format(new Date()));
      tick();
      const timer = setInterval(tick, 15_000);
      this.destroyRef.onDestroy(() => clearInterval(timer));

      // The aura's light follows the pointer and the lens leans a little towards it. Mouse and trackpad only, and
      // never for anyone who prefers reduced motion. One update per frame at most.
      const hero = this.hero()?.nativeElement;
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (hero && !calm && window.matchMedia('(pointer: fine)').matches) {
        let frame = 0;
        let last: PointerEvent | null = null;
        const apply = () => {
          frame = 0;
          if (!last) return;
          const r = hero.getBoundingClientRect();
          const x = Math.min(1, Math.max(0, (last.clientX - r.left) / r.width));
          const y = Math.min(1, Math.max(0, (last.clientY - r.top) / r.height));
          hero.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
          hero.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
          hero.style.setProperty('--px', (x - 0.5).toFixed(3));
          hero.style.setProperty('--py', (y - 0.5).toFixed(3));
        };
        const move = (event: PointerEvent) => {
          last = event;
          if (!frame) frame = requestAnimationFrame(apply);
        };
        hero.addEventListener('pointermove', move, { passive: true });
        this.destroyRef.onDestroy(() => {
          hero.removeEventListener('pointermove', move);
          cancelAnimationFrame(frame);
        });
      }
    });
  }
}
