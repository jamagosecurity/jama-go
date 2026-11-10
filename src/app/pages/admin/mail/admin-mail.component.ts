import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { MailAccount, MailDetail, MailListItem } from '../../../models/mail.model';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { MailService } from '../../../services/mail.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

/** CSP inside the frame: no scripts, no remote images/fonts/frames — a received
 *  email can phone home or run code otherwise. Inline styles and data: images only. */
const FRAME_HEAD =
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">` +
  `<base target="_blank"><style>body{font:14px/1.5 system-ui,sans-serif;color:#1c2433;margin:12px;word-wrap:break-word}</style>`;

type ComposeMode = 'new' | 'reply' | 'forward';

interface Compose {
  mode: ComposeMode;
  account: string;
  to: string;
  cc: string;
  subject: string;
  body: string;
  replyToId: string | null;
}

const ADDRESS = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
const SPLIT = /[\s,;]+/;

@Component({
  selector: 'app-admin-mail',
  standalone: true,
  imports: [DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-mail.component.html',
  styleUrl: './admin-mail.component.css',
})
export class AdminMailComponent {
  private readonly mail = inject(MailService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);

  readonly accounts = signal<MailAccount[]>([]);
  readonly items = signal<MailListItem[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly account = signal('');
  readonly folder = signal('');
  readonly search = signal('');
  readonly page = signal(1);

  readonly open = signal<MailDetail | null>(null);
  readonly opening = signal<string | null>(null);
  readonly showHtml = signal(true);

  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / 50)));
  readonly noneConfigured = computed(() => this.accounts().length > 0 && this.accounts().every((a) => !a.configured));
  readonly failing = computed(() => this.accounts().filter((a) => a.configured && a.lastError));

  readonly frame = computed<SafeHtml | null>(() => {
    const m = this.open();
    if (!m || !m.bodyHtml || !this.showHtml()) return null;
    // Safe to trust here only because the iframe is sandboxed with no permissions
    // and the document carries its own restrictive CSP.
    return this.sanitizer.bypassSecurityTrustHtml(FRAME_HEAD + m.bodyHtml);
  });

  // ===== Compose / reply / forward =====
  readonly compose = signal<Compose | null>(null);
  readonly sending = signal(false);
  readonly sendError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly showCc = signal(false);

  /** Mailboxes that have a password, i.e. the ones mail can actually be sent from. */
  readonly senders = computed(() => (this.auth.isAdmin() ? this.accounts().filter((a) => a.configured) : []));

  private signatureOf(accountKey: string): string {
    const sig = this.accounts().find((a) => a.key === accountKey)?.signature?.trim();
    return sig ? `-- \n${sig}` : '';
  }

  openNew(): void {
    const account = this.senders().find((a) => a.key === this.account())?.key ?? this.senders()[0]?.key ?? '';
    this.startCompose({ mode: 'new', account, to: '', cc: '', subject: '', body: this.withSignature('', account), replyToId: null });
  }

  reply(m: MailDetail): void {
    const to = m.folder === 'Sent' ? m.toAddresses : m.fromAddress;
    const quoted = this.quote(m, `On ${this.when(m)}, ${m.fromName || m.fromAddress} wrote:`);
    this.startCompose({
      mode: 'reply', account: m.accountKey, to, cc: '',
      subject: /^re:/i.test(m.subject) ? m.subject : `Re: ${m.subject}`,
      body: this.withSignature('', m.accountKey) + `\n\n${quoted}`, replyToId: m.id,
    });
  }

  forward(m: MailDetail): void {
    const header = [
      '---------- Forwarded message ----------',
      `From: ${m.fromName ? `${m.fromName} <${m.fromAddress}>` : m.fromAddress}`,
      `Date: ${this.when(m)}`,
      `Subject: ${m.subject}`,
      `To: ${m.toAddresses}`,
    ].join('\n');
    this.startCompose({
      mode: 'forward', account: m.accountKey, to: '', cc: '',
      subject: /^fwd?:/i.test(m.subject) ? m.subject : `Fwd: ${m.subject}`,
      body: this.withSignature('', m.accountKey) + `\n\n${header}\n\n${m.bodyText}`, replyToId: null,
    });
  }

  private startCompose(c: Compose): void {
    this.sendError.set(null);
    this.showCc.set(false);
    this.compose.set(c);
  }

  private withSignature(body: string, account: string): string {
    const sig = this.signatureOf(account);
    return sig ? `${body}\n\n${sig}` : body;
  }

  private when(m: MailDetail): string {
    return new Date(m.sentAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  }

  private quote(m: MailDetail, lead: string): string {
    return `${lead}\n` + (m.bodyText || '').split('\n').map((l) => `> ${l}`).join('\n');
  }

  setField<K extends keyof Compose>(key: K, value: Compose[K]): void {
    this.compose.update((c) => (c ? { ...c, [key]: value } : c));
  }

  /** Changing the From mailbox swaps its signature for the new one, if it was left untouched. */
  changeAccount(next: string): void {
    const c = this.compose();
    if (!c) return;
    const oldSig = this.signatureOf(c.account);
    const newSig = this.signatureOf(next);
    const body = oldSig && c.body.includes(oldSig) ? c.body.replace(oldSig, newSig) : c.body;
    this.compose.set({ ...c, account: next, body });
  }

  closeCompose(): void {
    if (this.sending()) return;
    this.compose.set(null);
  }

  private recipients(text: string): string[] {
    return text.split(SPLIT).map((x) => x.trim()).filter(Boolean);
  }

  /** The same checks the API makes, so mistakes show here first. */
  private composeError(c: Compose): string | null {
    if (!c.account) return 'Choose which mailbox to send from.';
    const to = this.recipients(c.to);
    if (!to.length) return 'Add at least one recipient.';
    const bad = [...to, ...this.recipients(c.cc)].find((a) => !ADDRESS.test(a));
    if (bad) return `"${bad}" is not a valid email address.`;
    if (to.length > 20) return 'At most 20 recipients.';
    if (!c.subject.trim()) return 'Write a subject.';
    if (c.subject.length > 300) return 'The subject must be 300 characters or fewer.';
    if (!c.body.trim()) return 'Write a message.';
    return null;
  }

  send(): void {
    const c = this.compose();
    if (!c || this.sending()) return;
    const problem = this.composeError(c);
    if (problem) { this.sendError.set(problem); return; }
    this.sending.set(true);
    this.sendError.set(null);
    this.mail
      .send({
        accountKey: c.account,
        to: this.recipients(c.to),
        cc: this.recipients(c.cc),
        subject: c.subject.trim(),
        body: c.body,
        replyToMessageId: c.replyToId,
      })
      .pipe(finalize(() => this.sending.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const from = this.accounts().find((a) => a.key === c.account)?.address ?? c.account;
          this.compose.set(null);
          this.open.set(null);
          this.notice.set(`Sent from ${from}.` + (res.copySavedToSent ? '' : ' (A copy could not be saved to its Sent folder.)'));
          setTimeout(() => this.notice.set(null), 6000);
          this.load();
        },
        error: (e) => this.sendError.set(getApiErrorMessage(e, 'The message could not be sent.')),
      });
  }

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.mail.accounts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (a) => this.accounts.set(a),
      error: (e) => this.error.set(getApiErrorMessage(e)),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.mail
      .messages({ account: this.account(), folder: this.folder(), search: this.search(), page: this.page() })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => { this.items.set(p.items); this.total.set(p.total); this.error.set(null); },
        error: (e) => this.error.set(getApiErrorMessage(e)),
      });
  }

  pickAccount(key: string): void { this.account.set(key); this.page.set(1); this.load(); }
  pickFolder(f: string): void { this.folder.set(f); this.page.set(1); this.load(); }
  goto(p: number): void { this.page.set(Math.min(Math.max(1, p), this.pages())); this.load(); }

  onSearch(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 300);
  }

  view(item: MailListItem): void {
    this.opening.set(item.id);
    this.mail.message(item.id).pipe(finalize(() => this.opening.set(null)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (m) => { this.open.set(m); this.showHtml.set(!!m.bodyHtml); },
      error: (e) => this.error.set(getApiErrorMessage(e)),
    });
  }

  close(): void { this.open.set(null); }

  /** Who the row is "about": the sender for received mail, the recipient for sent. */
  party(item: MailListItem): string {
    return item.folder === 'Sent' ? item.toAddresses : item.fromName || item.fromAddress;
  }
}
