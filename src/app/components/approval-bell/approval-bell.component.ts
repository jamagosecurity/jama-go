import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { BoqNotification } from '../../models/boq.model';
import { BoqService } from '../../services/boq.service';

/** How often the badge catches up with decisions taken elsewhere. Slow enough to
 *  be nearly free, quick enough that "did that go through?" is answered by
 *  looking rather than refreshing. */
const POLL_MS = 60_000;

/**
 * Approvals and rejections, for whoever is signed in.
 *
 * One component in both portals rather than a copy in each layout: an
 * administrator and the person who built the quotation are told about the same
 * event in the same words, and two copies of this markup would be two places for
 * that wording to drift.
 *
 * WHO sees WHICH decision is settled by the API — an administrator gets
 * everything, everybody else their own work and their own decisions — so this
 * shows what it is given without filtering anything itself.
 */
@Component({
  selector: 'app-approval-bell',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './approval-bell.component.html',
  styleUrl: './approval-bell.component.css',
})
export class ApprovalBellComponent implements OnInit {
  private readonly boqs = inject(BoqService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Where quotations live in the portal hosting this — /admin/boq or /staff/boq. */
  @Input({ required: true }) basePath = '/admin/boq';

  protected readonly notifications = signal<BoqNotification[]>([]);
  protected readonly unreadCount = signal(0);
  protected readonly panelOpen = signal(false);

  ngOnInit(): void {
    this.load();

    // Decisions are taken by other people, on other screens. Without a poll the
    // badge would only ever be right at the moment the page was loaded.
    interval(POLL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  private load(): void {
    this.boqs
      .notifications()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.notifications.set(result.items);
          this.unreadCount.set(result.unreadCount);
        },
        // Silent: a header badge is not worth an error banner across every
        // screen, and the next poll will try again.
        error: () => {},
      });
  }

  protected togglePanel(): void {
    const opening = !this.panelOpen();
    this.panelOpen.set(opening);

    // Opening it IS reading it. Cleared here rather than waiting for the server,
    // so the badge does not sit there while the list is on screen; the request
    // makes it stick.
    if (opening && this.unreadCount() > 0) {
      this.unreadCount.set(0);
      this.boqs
        .markNotificationsSeen()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: () => this.load(), error: () => {} });
    }
  }

  protected open(item: BoqNotification): void {
    this.panelOpen.set(false);
    void this.router.navigate([this.basePath, item.boqId]);
  }

  /**
   * The headline, in the second person when it is the reader's own work.
   *
   * "Your quotation was rejected" and "Sara's quotation was rejected" are
   * different pieces of news, and the panel is read by both people.
   */
  protected headline(item: BoqNotification): string {
    const what = item.action === 'Approved' ? 'approved' : 'rejected';
    return item.isMine ? `Your quotation was ${what}` : `${item.boqNumber} ${what}`;
  }

  /** "Approved at the 3rd attempt, after 2 rejections" — only when there is
   *  something to say, so an ordinary first-time approval stays quiet. */
  protected attempts(item: BoqNotification): string {
    if (item.rejectionCount === 0) return '';

    const times = item.rejectionCount === 1 ? 'once' : `${item.rejectionCount} times`;
    return item.action === 'Approved'
      ? `Approved at attempt ${item.attempt} — sent back ${times} before`
      : `Sent back ${times} so far`;
  }
}
