import {
  Directive,
  DestroyRef,
  ElementRef,
  Input,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LanguageService } from '../services/language.service';

@Directive({ selector: '[appI18n]', standalone: true })
export class I18nDirective {
  @Input({ required: true }) appI18n!: Record<string, string>;

  private readonly language = inject(LanguageService);
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly originals = new WeakMap<Text, string>();
  private readonly attributes = new WeakMap<Element, Map<string, string>>();
  private observer?: MutationObserver;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
    afterNextRender(() => {
      this.translateTree(this.element.nativeElement);
      this.observer = new MutationObserver((mutations) => this.translateMutations(mutations));
      this.observer.observe(this.element.nativeElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'],
      });
    });
    effect(() => {
      this.language.language();
      queueMicrotask(() => this.translateTree(this.element.nativeElement));
    });
  }

  private translateMutations(mutations: MutationRecord[]): void {
    if (!this.isBrowser) return;
    const arabic = this.language.isArabic();
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        this.translateText(mutation.target as Text, arabic);
      } else if (mutation.type === 'attributes') {
        this.translateAttributes(mutation.target as Element, arabic);
      } else {
        mutation.addedNodes.forEach((node) => this.translateTree(node, arabic));
      }
    }
  }

  private translateTree(node: Node, arabic = this.language.isArabic()): void {
    if (!this.isBrowser || !this.appI18n) return;
    if (node.nodeType === Node.TEXT_NODE) {
      this.translateText(node as Text, arabic);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const root = node as Element;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      this.translateText(current as Text, arabic);
      current = walker.nextNode();
    }
    this.translateAttributes(root, arabic);
    root.querySelectorAll('*').forEach((element) => this.translateAttributes(element, arabic));
  }

  private translateText(node: Text, arabic: boolean): void {
    const raw = node.nodeValue ?? '';
    const visible = raw.trim();
    if (!visible) return;

    if (this.appI18n[visible]) this.originals.set(node, visible);
    const english = this.originals.get(node) ?? visible;
    this.originals.set(node, english);
    const translated = arabic ? this.appI18n[english] ?? english : english;
    if (visible !== translated) node.nodeValue = raw.replace(visible, translated);
  }

  private translateAttributes(element: Element, arabic: boolean): void {
    let originals = this.attributes.get(element);
    if (!originals) {
      originals = new Map<string, string>();
      this.attributes.set(element, originals);
    }

    for (const name of ['placeholder', 'title', 'aria-label', 'alt']) {
      const current = element.getAttribute(name)?.trim();
      if (!current) continue;
      if (this.appI18n[current]) originals.set(name, current);
      const english = originals.get(name) ?? current;
      const translated = arabic ? this.appI18n[english] ?? english : english;
      if (current !== translated) element.setAttribute(name, translated);
    }
  }
}
