import { PLATFORM_ID, Injectable, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type SiteLanguage = 'en' | 'ar';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly storageKey = 'jamago-language';
  readonly language = signal<SiteLanguage>('en');
  readonly isArabic = computed(() => this.language() === 'ar');

  constructor() {
    if (this.isBrowser) {
      const saved = localStorage.getItem(this.storageKey);
      if (saved === 'ar' || saved === 'en') this.language.set(saved);
    }

    effect(() => {
      const language = this.language();
      if (!this.isBrowser) return;
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      localStorage.setItem(this.storageKey, language);
    });
  }

  text<T>(english: T, arabic: T): T {
    return this.language() === 'ar' ? arabic : english;
  }

  toggle(): void {
    this.language.update((current) => (current === 'en' ? 'ar' : 'en'));
  }
}
