import { NavItem, NavLink } from '../models/nav.model';

export const SOLUTIONS_LEFT: NavLink[] = [
  { href: '/#surveillance-cctv', label: 'Surveillance (CCTV) Systems' },
  { href: '/#smart-home', label: 'Smart Home & Automation' },
  { href: '/#intercom', label: 'Intercom System' },
  { href: '/#smart-door-lock', label: 'Smart Door Lock' },
  { href: '/#telephone', label: 'Telephone Systems' },
  { href: '/#speed-gates', label: 'Speed Gates & Turnstiles' },
  { href: '/#metal-detector', label: 'Metal Detector' },
  { href: '/#moi-approval', label: 'MOI Approval' },
  { href: '/#cctv-drawing', label: 'CCTV Drawing' },
];

export const SOLUTIONS_RIGHT: NavLink[] = [
  { href: '/#access-control', label: 'Access Control Systems' },
  { href: '/#installation', label: 'Installation & Maintenance' },
  { href: '/#ceiling-sound', label: 'Ceiling Sound System' },
  { href: '/#internet-wifi', label: 'Internet & Wi-Fi' },
  { href: '/#central-satellite', label: 'Central Satellite' },
  { href: '/#gate-barriers', label: 'Gate Barriers' },
  { href: '/#accessories', label: 'Accessories' },
  { href: '/#amc-services', label: 'AMC Services' },
  { href: '/#free-consultation', label: 'Free Consultation' },
];

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home' },
  {
    label: 'About',
    menu: 'stack',
    children: [
      { href: '/#why', label: 'Why Us' },
      { href: '/#team', label: 'About Us' },
      { href: '/#stats', label: 'Our Results' },
    ],
  },
  {
    label: 'Services',
    menu: 'grid',
    children: [
      { href: '/#manned-guarding', label: 'Manned Guarding' },
      { href: '/#mobile-patrols', label: 'Mobile Patrols' },
      { href: '/#event-security', label: 'Event Security' },
      { href: '/#cctv-monitoring', label: 'CCTV Monitoring' },
      { href: '/#residential-security', label: 'Residential Security' },
      { href: '/#alarm-response', label: 'Alarm Response' },
    ],
  },
  {
    label: 'Solutions',
    menu: 'columns',
    children: [SOLUTIONS_LEFT, SOLUTIONS_RIGHT],
  },
  {
    label: 'Projects',
    menu: 'stack',
    children: [
      { href: '/#moi-projects', label: 'MOI Projects' },
      { href: '/#non-moi-projects', label: 'Non - Moi Projects' },
    ],
  },
  { href: '/#blog', label: 'Blog' },
  { href: '/#support', label: 'Support' },
  { href: '/contact', label: 'Contact' },
];
