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
  `<base target="_blank"><style>body{font:15px/1.65 -apple-system,"Segoe UI",system-ui,sans-serif;color:#1c2433;margin:0;padding:26px 30px 40px;word-wrap:break-word}` +
  `img{max-width:100%;height:auto}table{max-width:100%}a{color:#14305f}blockquote{margin:0 0 0 4px;padding-left:12px;border-left:3px solid #e3e0d8;color:#4b5260}` +
  `@media (max-width:600px){body{padding:16px 12px 32px}td[align=center][style*="padding:34px"]{padding:0!important}.px{padding-left:16px!important;padding-right:16px!important}}</style>`;

/** Pictures from outside are blocked by the frame's rules; drop them so no broken-image icons show. */
const REMOTE_IMG = /<img\b(?![^>]*\bsrc\s*=\s*["']?(?:data:))[^>]*>/gi;

type ComposeMode = 'new' | 'reply' | 'forward';

interface Compose {
  mode: ComposeMode;
  account: string;
  to: string;
  cc: string;
  subject: string;
  body: string;
  /** The original message under a reply or forward. */
  quoted: string;
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
  /** Only messages not read yet. */
  readonly unreadOnly = signal(false);
  readonly page = signal(1);

  readonly open = signal<MailDetail | null>(null);
  readonly opening = signal<string | null>(null);
  readonly showHtml = signal(true);
  /** The company logo and MOI-SSD badge as data: pictures, for our own emails (cid:…) in the viewer and preview. */
  private readonly logoData = signal<string | null>(null);
  private readonly moiData = signal<string | null>(null);

  /** Our own emails name their pictures cid:jamago-logo / cid:jamago-moi; swap in our copies. */
  private withOwnPictures(html: string): string {
    const logo = this.logoData();
    const moi = this.moiData();
    let out = html;
    if (logo) out = out.replace(/cid:jamago-logo/g, logo);
    if (moi) out = out.replace(/cid:jamago-moi/g, moi);
    return out;
  }

  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / 50)));
  readonly boxMenu = signal(false);

  /** The list under day headings: Today, Yesterday, This week, then by month. */
  readonly groups = computed(() => {
    const out: { label: string; items: MailListItem[] }[] = [];
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const day = 86_400_000;
    for (const m of this.items()) {
      const t = new Date(m.sentAt).getTime();
      const label = t >= start.getTime() ? 'Today'
        : t >= start.getTime() - day ? 'Yesterday'
        : t >= start.getTime() - 6 * day ? 'This week'
        : new Date(m.sentAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(m); else out.push({ label, items: [m] });
    }
    return out;
  });
  readonly currentBox = computed(() => this.accounts().find((a) => a.key === this.account()) ?? null);
  /** Unread in the mailbox being shown (or all of them). */
  readonly currentUnread = computed(() => this.currentBox()?.unreadCount ?? this.unreadAll());
  readonly unreadAll = computed(() => this.accounts().reduce((sum, a) => sum + (a.unreadCount ?? 0), 0));
  readonly allCount = computed(() => this.accounts().reduce((sum, a) => sum + a.inboxCount + a.sentCount, 0));
  readonly currentLabel = computed(() => {
    const box = this.accounts().find((a) => a.key === this.account())?.address ?? 'All mailboxes';
    return this.folder() === 'Inbox' ? `${box} · Incoming` : this.folder() === 'Sent' ? `${box} · Outgoing` : box;
  });
  protected readonly Math = Math;
  readonly noneConfigured = computed(() => this.accounts().length > 0 && this.accounts().every((a) => !a.configured));
  readonly failing = computed(() => this.accounts().filter((a) => a.configured && a.lastError));

  readonly frame = computed<SafeHtml | null>(() => {
    const m = this.open();
    if (!m || !m.bodyHtml || !this.showHtml()) return null;
    // Safe to trust here only because the iframe is sandboxed with no permissions
    // and the document carries its own restrictive CSP.
    // Our own emails carry the company logo inside the message (cid:jamago-logo); show it from our own copy, as a
    // data: picture the frame allows. Anything else from outside stays blocked.
    const body = this.withOwnPictures(m.bodyHtml).replace(REMOTE_IMG, '');
    return this.sanitizer.bypassSecurityTrustHtml(FRAME_HEAD + body);
  });

  // ===== Compose / reply / forward =====
  readonly compose = signal<Compose | null>(null);
  readonly sending = signal(false);
  readonly sendError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly showCc = signal(false);

  /** Mailboxes that have a password, i.e. the ones mail can actually be sent from. */
  readonly senders = computed(() => (this.auth.isAdmin() ? this.accounts().filter((a) => a.configured) : []));

  /** The From mailbox's signature card, as it will be sent, for the preview under the message. */
  readonly signaturePreview = computed<SafeHtml | null>(() => {
    const c = this.compose();
    const html = c ? this.accounts().find((a) => a.key === c.account)?.signatureHtml : null;
    if (!html) return null;
    const body = this.withOwnPictures(html);
    return this.sanitizer.bypassSecurityTrustHtml(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">` +
      `<base target="_blank"><style>body{margin:0;padding:0 4px 8px;font-family:system-ui,sans-serif}</style>` + body);
  });

  openNew(): void {
    const account = this.senders().find((a) => a.key === this.account())?.key ?? this.senders()[0]?.key ?? '';
    this.startCompose({ mode: 'new', account, to: '', cc: '', subject: '', body: '', quoted: '', replyToId: null });
  }

  reply(m: MailDetail): void {
    const to = m.folder === 'Sent' ? m.toAddresses : m.fromAddress;
    const quoted = this.quote(m, `On ${this.when(m)}, ${m.fromName || m.fromAddress} wrote:`);
    this.startCompose({
      mode: 'reply', account: m.accountKey, to, cc: '',
      subject: /^re:/i.test(m.subject) ? m.subject : `Re: ${m.subject}`,
      body: '', quoted, replyToId: m.id,
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
      body: '', quoted: `${header}\n\n${m.bodyText}`, replyToId: null,
    });
  }

  private startCompose(c: Compose): void {
    this.sendError.set(null);
    this.showCc.set(false);
    this.compose.set(c);
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

  /** Changing the From mailbox changes whose signature goes under the message. */
  changeAccount(next: string): void {
    this.compose.update((c) => (c ? { ...c, account: next } : c));
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
        quoted: c.quoted.trim() || null,
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
    this.loadPicture('/JamaGoLogo-trim.png', this.logoData);
    this.loadPicture('/moi-ssd-badge.jpg', this.moiData);
  }

  private loadPicture(url: string, into: ReturnType<typeof signal<string | null>>): void {
    fetch(url)
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = () => into.set(String(reader.result));
        reader.readAsDataURL(blob);
      })
      .catch(() => undefined);
  }

  load(): void {
    this.loading.set(true);
    this.mail
      .messages({ account: this.account(), folder: this.folder(), search: this.search(), page: this.page(), unread: this.unreadOnly() })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => { this.items.set(p.items); this.total.set(p.total); this.error.set(null); },
        error: (e) => this.error.set(getApiErrorMessage(e)),
      });
  }

  pickAccount(key: string): void { this.account.set(key); this.page.set(1); this.open.set(null); this.load(); }
  pickFolder(f: string): void { this.folder.set(f); this.unreadOnly.set(false); this.page.set(1); this.load(); }
  pickUnread(): void { this.unreadOnly.set(true); this.folder.set(''); this.page.set(1); this.load(); }
  goto(p: number): void { this.page.set(Math.min(Math.max(1, p), this.pages())); this.load(); }

  onSearch(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 300);
  }

  view(item: MailListItem): void {
    this.opening.set(item.id);
    this.mail.message(item.id).pipe(finalize(() => this.opening.set(null)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (m) => {
        this.open.set(m);
        this.showHtml.set(!!m.bodyHtml);
        if (!item.isRead) this.markRead(item.id, item.accountKey, true);
      },
      error: (e) => this.error.set(getApiErrorMessage(e)),
    });
  }

  /** Read / unread: shown at once, then saved here and on the mail server. */
  markRead(id: string, accountKey: string, read: boolean): void {
    const item = this.items().find((x) => x.id === id);
    if (item && item.isRead === read) return;
    this.items.update((list) => list.map((x) => (x.id === id ? { ...x, isRead: read } : x)));
    this.open.update((m) => (m && m.id === id ? { ...m, isRead: read } : m));
    if (!item || item.folder === 'Inbox') {
      this.accounts.update((list) => list.map((a) => (a.key === accountKey
        ? { ...a, unreadCount: Math.max(0, (a.unreadCount ?? 0) + (read ? -1 : 1)) } : a)));
    }
    this.mail.setRead(id, read).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: (e) => this.error.set(getApiErrorMessage(e, 'Could not change the read mark.')),
    });
  }

  /** Mark the open message unread and go back to the list, like a mail app. */
  markUnread(m: MailDetail): void {
    this.markRead(m.id, m.accountKey, false);
    this.open.set(null);
  }

  close(): void { this.open.set(null); }

  /** Two letters for an avatar: "Mail Delivery System" → "MD", "info@jamago.qa" → "IN". */
  initials(text: string): string {
    const clean = (text || '?').split('@')[0].replace(/[^\p{L}\p{N}\s._-]/gu, ' ').trim();
    const words = clean.split(/[\s._-]+/).filter(Boolean);
    const letters = words.length > 1 ? words[0][0] + words[1][0] : clean.slice(0, 2);
    return (letters || '?').toUpperCase();
  }

  /** A steady colour per person, from the brand family. */
  tone(text: string): string {
    const palette = ['#14305f', '#2d96d5', '#0f6b5f', '#b86b12', '#7a3e9d', '#a40f14', '#3c5a8a', '#1f7a8c'];
    let h = 0;
    for (const ch of (text || '').toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return palette[h % palette.length];
  }

  /** Today: the time. This year: day and month. Older: the full date. */
  shortDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /** Who the row is "about": the sender for received mail, the recipient for sent. */
  party(item: MailListItem): string {
    return item.folder === 'Sent' ? item.toAddresses : item.fromName || item.fromAddress;
  }
}
