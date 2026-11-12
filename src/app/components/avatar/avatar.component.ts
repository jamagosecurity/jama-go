import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ProfileService } from '../../services/profile.service';

/**
 * A person's picture, or their initials when they have none. The picture is fetched with the sign-in and cached per
 * version, so a new upload shows at once everywhere and an unchanged one is never downloaded twice.
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="av" [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="size() * 0.38" aria-hidden="true">
      @if (src(); as url) { <img [src]="url" alt="" draggable="false" /> } @else { {{ initials() }} }
    </span>
  `,
  styles: `
    :host { display: inline-flex; flex: none; }
    .av {
      display: inline-grid; place-items: center; overflow: hidden; border-radius: 50%;
      background: linear-gradient(145deg, #dededa 0%, #b5b4a8 55%, #8f8d77 100%);
      color: #14305f; font-weight: 800; letter-spacing: 0.02em; line-height: 1; user-select: none;
    }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
  `,
})
export class AvatarComponent {
  private readonly profiles = inject(ProfileService);

  readonly userId = input<string | null | undefined>(null);
  readonly name = input<string>('');
  /** 0 or empty = no picture. */
  readonly version = input<number | null | undefined>(0);
  readonly size = input<number>(40);

  protected readonly src = signal<string | null>(null);

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  });

  constructor() {
    effect((onCleanup) => {
      const id = this.userId();
      const version = this.version() ?? 0;
      if (!id || version <= 0) {
        this.src.set(null);
        return;
      }
      const sub = this.profiles.photo(id, version).subscribe((url) => this.src.set(url));
      onCleanup(() => sub.unsubscribe());
    });
  }
}
