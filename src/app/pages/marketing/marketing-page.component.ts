import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { RevealDirective } from '../../directives/reveal.directive';
import { LanguageService } from '../../services/language.service';
import { MARKETING_PAGES, PAGE_ART_DIRECTION } from './marketing-page.content';
import { MARKETING_PAGES_AR } from './marketing-page.ar';

@Component({
  selector: 'app-marketing-page',
  standalone: true,
  imports: [RouterLink, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './marketing-page.component.html',
  styleUrl: './marketing-page.component.css',
})
export class MarketingPageComponent {
  protected readonly language = inject(LanguageService);
  private readonly title = inject(Title);
  private readonly key = inject(ActivatedRoute).snapshot.data['marketingPage'] as string;
  private readonly baseContent = MARKETING_PAGES[this.key];

  protected readonly content = computed(() => {
    const localized = this.language.text(this.baseContent, MARKETING_PAGES_AR[this.key] ?? this.baseContent);
    return { ...localized, ...PAGE_ART_DIRECTION[this.key] };
  });

  protected readonly promises = computed(() =>
    this.language.text(
      [
        { value: 'Free', label: 'Site survey and consultation' },
        { value: 'Clear', label: 'Itemised recommendation' },
        { value: 'One team', label: 'From design to support' },
      ],
      [
        { value: 'مجاناً', label: 'معاينة واستشارة للموقع' },
        { value: 'واضح', label: 'توصية مفصلة بكل الأسعار' },
        { value: 'فريق واحد', label: 'من التصميم إلى الدعم' },
      ],
    ),
  );

  constructor() {
    if (!this.baseContent) throw new Error(`Unknown marketing page: ${this.key}`);
    effect(() => {
      this.title.setTitle(`${this.content().eyebrow} — Jama Go Security`);
    });
  }
}
