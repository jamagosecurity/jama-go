import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ContactService } from '../../../services/contact.service';
import { ContactSubmission } from '../../../models/contact.model';
import { getApiErrorMessage } from '../../../utils/api-error.util';

@Component({
  selector: 'app-admin-contacts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-contacts.component.html',
  styleUrl: './admin-contacts.component.css',
})
export class AdminContactsComponent {
  private readonly contactService = inject(ContactService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submissions = signal<ContactSubmission[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  /** The row showing its Delete / Keep confirmation, as the other lists do. */
  readonly pendingDeleteId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  /** The enquiry whose full message is open; the rest show two lines. */
  readonly expandedId = signal<string | null>(null);

  readonly recentCount = computed(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.submissions().filter((s) => Date.parse(s.createdAt) >= weekAgo).length;
  });

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const items = [...this.submissions()].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    if (!q) {
      return items;
    }
    return items.filter((item) =>
      [item.fullName, item.email, item.phone, item.service, item.message, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  });

  constructor() {
    this.reload();
  }

  onSearch(value: string): void {
    this.query.set(value);
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.contactService
      .getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => this.submissions.set(items),
        error: (err: unknown) => {
          this.error.set(getApiErrorMessage(err, 'Could not load contact submissions.'));
        },
      });
  }

  toggleMessage(id: string): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  confirmDelete(item: ContactSubmission): void {
    if (this.deletingId()) return;
    this.deletingId.set(item.id);
    this.error.set(null);
    this.contactService
      .remove(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          this.submissions.update((all) => all.filter((s) => s.id !== item.id));
          this.pendingDeleteId.set(null);
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Could not delete that enquiry.')),
      });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'EN';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
}
