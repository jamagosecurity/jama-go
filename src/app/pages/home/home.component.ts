import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HeroComponent } from '../../components/hero/hero.component';
import { TrustBarComponent } from '../../components/trust-bar/trust-bar.component';
import { ServicesComponent } from '../../components/services/services.component';
import { WhyUsComponent } from '../../components/why-us/why-us.component';
import { StatsComponent } from '../../components/stats/stats.component';
import { SupportComponent } from '../../components/support/support.component';
import { OurTeamComponent } from '../../components/our-team/our-team.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroComponent,
    TrustBarComponent,
    ServicesComponent,
    WhyUsComponent,
    StatsComponent,
    SupportComponent,
    OurTeamComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
})
export class HomeComponent {}
