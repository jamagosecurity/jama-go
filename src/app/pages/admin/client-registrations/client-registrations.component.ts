import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import {
  CLIENT_CATEGORY_LABELS,
  ClientCategory,
  ClientRegistration,
  ClientRegistrationCounts,
  ClientRegistrationStatus,
  ClientTeam,
} from '../../../models/client-registration.model';
import { ClientRegistrationService } from '../../../services/client-registration.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

/** Teams pre-ticked the moment a category is picked. Only a starting point —
 *  every box stays changeable before accepting. */
const DEFAULT_TEAMS: Record<ClientCategory, string[]> = {
  Moi: ['MoiDiaUpload', 'MoiDiaInspection'],
  NonMoi: ['Technician'],
};

/**
 * Clients who signed up on the website, and the admin's decision on each.
 *
 * Accepting asks two things — MOI or Non-MOI, and which teams — and for an MOI
 * client the DIA number too, because accepting one opens its DIA inspection in
 * the same save. The DIA's client number and location are pre-filled from the
 * registration but editable, since the DIA record is the official one.
 */
@Component({
  selector: 'app-client-registrations',
  standalone: true,
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-registrations.component.html',
  styleUrl: './client-registrations.component.css',
})
export class ClientRegistrationsComponent implements OnInit {
  private readonly service = inject(ClientRegistrationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchInput$ = new Subject<string>();

  protected readonly categoryLabels = CLIENT_CATEGORY_LABELS;

  protected readonly status = signal<ClientRegistrationStatus>('Pending');
  protected readonly search = signal('');
  protected readonly items = signal<ClientRegistration[]>([]);
  protected readonly counts = signal<ClientRegistrationCounts>({ pending: 0, approved: 0, rejected: 0 });
  protected readonly teams = signal<ClientTeam[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  // ===== Accept dialog =====
  protected readonly accepting = signal<ClientRegistration | null>(null);
  protected readonly acceptCategory = signal<ClientCategory | null>(null);
  protected readonly acceptTeams = signal<string[]>([]);
  protected readonly diaNumber = signal('');
  protected readonly diaClientNumber = signal('');
  protected readonly diaClientLocation = signal('');
  protected readonly acceptError = signal('');

  // ===== Reject dialog =====
  protected readonly rejecting = signal<ClientRegistration | null>(null);
  protected readonly rejectReason = signal('');
  protected readonly rejectError = signal('');

  protected readonly saving = signal(false);

  protected readonly emptyMessage = computed(() => {
    if (this.search()) return 'Nothing matches that search.';
    switch (this.status()) {
      case 'Pending':
        return 'No one is waiting — new registrations from the website show up here.';
      case 'Approved':
        return 'No clients accepted yet.';
      default:
        return 'No rejected registrations.';
    }
  });

  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.search.set(value.trim());
        this.load();
      });

    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');

    this.service
      .list(this.status(), this.search())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (list) => {
          this.items.set(list.items);
          this.counts.set(list.counts);
          this.teams.set(list.availableTeams);
        },
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Unable to load client registrations.')),
      });
  }

  protected setStatus(status: ClientRegistrationStatus): void {
    if (status === this.status()) return;
    this.status.set(status);
    this.notice.set('');
    this.load();
  }

  protected onSearch(event: Event): void {
    this.searchInput$.next((event.target as HTMLInputElement).value);
  }

  /** "Jane Doe <jane@jamago.qa>" reads as "Jane Doe" — the address is the
   *  same company domain on every row and only adds noise. */
  protected reviewer(name: string | null): string {
    return (name ?? '').replace(/\s*<[^>]*>\s*$/, '').trim();
  }

  // ===== Accept =====

  protected openAccept(item: ClientRegistration): void {
    this.accepting.set(item);
    this.acceptCategory.set(null);
    this.acceptTeams.set([]);
    this.diaNumber.set('');
    this.diaClientNumber.set(item.mobile);
    this.diaClientLocation.set(item.siteLocation);
    this.acceptError.set('');
  }

  protected closeAccept(): void {
    if (this.saving()) return;
    this.accepting.set(null);
  }

  protected chooseCategory(category: ClientCategory): void {
    this.acceptCategory.set(category);
    this.acceptTeams.set([...DEFAULT_TEAMS[category]]);
    this.acceptError.set('');
  }

  protected isTeamSelected(key: string): boolean {
    return this.acceptTeams().includes(key);
  }

  protected toggleTeam(key: string): void {
    this.acceptTeams.update((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
    this.acceptError.set('');
  }

  protected onInput(target: 'diaNumber' | 'diaClientNumber' | 'diaClientLocation', event: Event): void {
    this[target].set((event.target as HTMLInputElement).value);
    this.acceptError.set('');
  }

  protected confirmAccept(): void {
    const item = this.accepting();
    const category = this.acceptCategory();
    if (!item) return;

    // Checked here too so the dialog can say what is missing without a round
    // trip; the server checks the same things and its answer is final.
    if (!category) {
      this.acceptError.set('Choose MOI or Non-MOI.');
      return;
    }
    if (!this.acceptTeams().length) {
      this.acceptError.set('Allot at least one team.');
      return;
    }
    if (category === 'Moi' && !this.diaNumber().trim()) {
      this.acceptError.set('Enter the DIA number for this MOI client.');
      return;
    }

    this.saving.set(true);
    this.service
      .approve(item.id, {
        category,
        teams: this.acceptTeams(),
        diaNumber: category === 'Moi' ? this.diaNumber().trim() : null,
        diaClientNumber: category === 'Moi' ? this.diaClientNumber().trim() || null : null,
        diaClientLocation: category === 'Moi' ? this.diaClientLocation().trim() || null : null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (saved) => {
          this.accepting.set(null);
          this.notice.set(
            saved.diaNumber
              ? `${saved.fullName} accepted as MOI — DIA inspection ${saved.diaNumber} has been created. They can sign in now.`
              : `${saved.fullName} accepted as ${CLIENT_CATEGORY_LABELS[category]}. They can sign in now.`,
          );
          this.load();
        },
        error: (err: unknown) =>
          this.acceptError.set(getApiErrorMessage(err, 'Unable to accept this registration.')),
      });
  }

  // ===== Reject =====

  protected openReject(item: ClientRegistration): void {
    this.rejecting.set(item);
    this.rejectReason.set('');
    this.rejectError.set('');
  }

  protected closeReject(): void {
    if (this.saving()) return;
    this.rejecting.set(null);
  }

  protected onReasonInput(event: Event): void {
    this.rejectReason.set((event.target as HTMLTextAreaElement).value);
    this.rejectError.set('');
  }

  protected confirmReject(): void {
    const item = this.rejecting();
    if (!item) return;

    const reason = this.rejectReason().trim();
    if (reason.length < 5) {
      this.rejectError.set('Say why — at least a few words, so the next admin knows.');
      return;
    }

    this.saving.set(true);
    this.service
      .reject(item.id, reason)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (saved) => {
          this.rejecting.set(null);
          this.notice.set(`${saved.fullName}'s registration was rejected.`);
          this.load();
        },
        error: (err: unknown) =>
          this.rejectError.set(getApiErrorMessage(err, 'Unable to reject this registration.')),
      });
  }
}
