import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RevealDirective } from '../../directives/reveal.directive';

interface Service {
  id: string;
  icon: string;
  title: string;
  text: string;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './services.component.html',
})
export class ServicesComponent {
  readonly services: Service[] = [
    {
      id: 'manned-guarding',
      icon: '🛡️',
      title: 'Manned Guarding',
      text: 'Vetted, trained security officers providing a professional on-site presence day and night.',
    },
    {
      id: 'mobile-patrols',
      icon: '🚓',
      title: 'Mobile Patrols',
      text: 'Randomised patrol routes and rapid keyholding response that keep intruders guessing.',
    },
    {
      id: 'event-security',
      icon: '🎟️',
      title: 'Event Security',
      text: 'Crowd management, access control and door supervision for events of any size.',
    },
    {
      id: 'cctv-monitoring',
      icon: '📹',
      title: 'CCTV Monitoring',
      text: '24/7 remote monitoring with live verification and instant escalation to authorities.',
    },
    {
      id: 'residential-security',
      icon: '🏠',
      title: 'Residential Security',
      text: 'Discreet protection for private homes, estates and high-net-worth individuals.',
    },
    {
      id: 'alarm-response',
      icon: '🚨',
      title: 'Alarm Response',
      text: 'Trained responders dispatched the moment your alarm is triggered — no delays.',
    },
  ];
}
