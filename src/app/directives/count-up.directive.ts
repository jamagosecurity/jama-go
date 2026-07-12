import {
  Directive,
  ElementRef,
  Input,
  AfterViewInit,
  OnDestroy,
  numberAttribute,
} from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements AfterViewInit, OnDestroy {
  @Input({ alias: 'appCountUp', transform: numberAttribute }) target = 0;
  @Input() countPrefix = '';
  @Input() countSuffix = '';
  @Input({ transform: numberAttribute }) countDecimals = 0;
  @Input({ transform: numberAttribute }) countDuration = 1800;

  private observer?: IntersectionObserver;
  private frameId = 0;
  private started = false;

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.render(0);

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.started) {
            this.started = true;
            this.animate();
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.35 },
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.frameId) cancelAnimationFrame(this.frameId);
  }

  private animate(): void {
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / this.countDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = this.target * eased;
      this.render(current);

      if (progress < 1) {
        this.frameId = requestAnimationFrame(tick);
      } else {
        this.render(this.target);
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  private render(value: number): void {
    const formatted =
      this.countDecimals > 0 ? value.toFixed(this.countDecimals) : String(Math.round(value));

    this.el.nativeElement.textContent = `${this.countPrefix}${formatted}${this.countSuffix}`;
  }
}
