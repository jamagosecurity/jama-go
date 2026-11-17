import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
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

type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward';

type RecipientField = 'to' | 'cc' | 'bcc';

interface Compose {
  mode: ComposeMode;
  account: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  /** Plain-text version of what is in the editor. */
  body: string;
  /** The editor's formatted HTML (bold, lists, links). */
  html: string;
  attachments: File[];
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
    this.startCompose({ mode: 'new', account, to: [], cc: [], bcc: [], subject: '', body: '', html: '', attachments: [], quoted: '', replyToId: null });
  }

  reply(m: MailDetail, all = false): void {
    const own = new Set(this.accounts().map((a) => a.address.toLowerCase()));
    const list = (text: string) => this.recipients(text).filter((a) => ADDRESS.test(a));
    const to = m.folder === 'Sent' ? list(m.toAddresses) : [m.fromAddress];
    // Reply all: everyone else who got it goes in Cc — never our own mailboxes.
    const cc = all
      ? list(m.toAddresses).filter((a) => !own.has(a.toLowerCase()) && !to.some((t) => t.toLowerCase() === a.toLowerCase()))
      : [];
    const quoted = this.quote(m, `On ${this.when(m)}, ${m.fromName || m.fromAddress} wrote:`);
    this.startCompose({
      mode: all ? 'replyAll' : 'reply', account: m.accountKey, to, cc, bcc: [],
      subject: /^re:/i.test(m.subject) ? m.subject : `Re: ${m.subject}`,
      body: '', html: '', attachments: [], quoted, replyToId: m.id,
    });
    if (cc.length) this.showCc.set(true);
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
      mode: 'forward', account: m.accountKey, to: [], cc: [], bcc: [],
      subject: /^fwd?:/i.test(m.subject) ? m.subject : `Fwd: ${m.subject}`,
      body: '', html: '', attachments: [], quoted: `${header}\n\n${m.bodyText}`, replyToId: null,
    });
  }

  private startCompose(c: Compose): void {
    this.sendError.set(null);
    this.showCc.set(false);
    this.showBcc.set(false);
    this.drafts.set({ to: '', cc: '', bcc: '' });
    this.compose.set(c);
    // The editor is plain contenteditable: start it empty and put the cursor in it.
    setTimeout(() => {
      const ed = this.editor()?.nativeElement;
      if (ed) { ed.innerHTML = ''; (c.to.length ? ed : document.querySelector<HTMLInputElement>('.mc-chips input'))?.focus(); }
    });
  }

  // ===== Recipients as chips =====
  readonly showBcc = signal(false);
  protected readonly recipientFields: RecipientField[] = ['to', 'cc', 'bcc'];
  readonly drafts = signal<Record<RecipientField, string>>({ to: '', cc: '', bcc: '' });
  protected readonly isAddress = (a: string) => ADDRESS.test(a);

  setDraft(field: RecipientField, input: HTMLInputElement): void {
    const value = input.value;
    // Typing or pasting a comma, semicolon or space finishes the address.
    if (/[\s,;]/.test(value)) {
      const parts = value.split(SPLIT);
      const rest = parts.pop() ?? '';
      parts.filter(Boolean).forEach((p) => this.addRecipient(field, p));
      input.value = rest;
      this.drafts.update((d) => ({ ...d, [field]: rest }));
      return;
    }
    this.drafts.update((d) => ({ ...d, [field]: value }));
  }

  commitDraft(field: RecipientField, input?: HTMLInputElement): void {
    const v = (input?.value ?? this.drafts()[field]).trim();
    if (v) this.addRecipient(field, v);
    if (input) input.value = '';
    else document.querySelectorAll<HTMLInputElement>(`.mc-chips input[aria-label="${field}"]`).forEach((el) => (el.value = ''));
    this.drafts.update((d) => ({ ...d, [field]: '' }));
  }

  onRecipientKey(field: RecipientField, e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === 'Tab' && this.drafts()[field].trim()) { e.preventDefault(); this.commitDraft(field, e.target as HTMLInputElement); }
    else if (e.key === 'Backspace' && !this.drafts()[field]) {
      const list = this.compose()?.[field] ?? [];
      if (list.length) this.removeRecipient(field, list.length - 1);
    }
  }

  private addRecipient(field: RecipientField, address: string): void {
    const a = address.trim().replace(/^<|>$/g, '');
    if (!a) return;
    this.compose.update((c) => (c && !c[field].some((x) => x.toLowerCase() === a.toLowerCase()) ? { ...c, [field]: [...c[field], a] } : c));
  }

  removeRecipient(field: RecipientField, index: number): void {
    if (this.errorField() === field) { this.errorField.set(null); this.sendError.set(null); }
    this.compose.update((c) => (c ? { ...c, [field]: c[field].filter((_, i) => i !== index) } : c));
  }

  // ===== Formatting =====
  private readonly editor = viewChild<ElementRef<HTMLDivElement>>('editor');

  format(command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList' | 'removeFormat'): void {
    this.editor()?.nativeElement.focus();
    document.execCommand(command);
    if (command === 'removeFormat') document.execCommand('unlink');
    this.syncEditor();
  }

  addLink(): void {
    const url = prompt('Link address (https://…)', 'https://');
    if (!url || !/^(https?:\/\/|mailto:)/i.test(url.trim())) return;
    this.editor()?.nativeElement.focus();
    document.execCommand('createLink', false, url.trim());
    this.syncEditor();
  }

  syncEditor(): void {
    const ed = this.editor()?.nativeElement;
    if (!ed) return;
    if (this.errorField() === 'body' && ed.innerText.trim()) { this.errorField.set(null); this.sendError.set(null); }
    this.compose.update((c) => (c ? { ...c, body: ed.innerText.replace(/\n{3,}/g, '\n\n'), html: ed.innerHTML } : c));
  }

  // ===== Attachments =====
  protected readonly maxAttachBytes = 20 * 1024 * 1024;
  readonly dragging = signal(false);
  protected readonly attachTotal = computed(() => (this.compose()?.attachments ?? []).reduce((n, f) => n + f.size, 0));

  addFiles(list: FileList | null | undefined): void {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const blocked = files.find((f) => /\.(exe|bat|cmd|com|scr|js|vbs|ps1|msi|jar|reg|hta)$/i.test(f.name));
    if (blocked) { this.errorField.set('files'); this.sendError.set(`“${blocked.name}” is a program or script — mail servers block those. Zip it or send a link instead.`); return; }
    const c = this.compose();
    if (!c) return;
    const next = [...c.attachments, ...files];
    if (next.length > 10) { this.errorField.set('files'); this.sendError.set('That’s more than 10 files. Send the rest in a second email.'); return; }
    if (next.reduce((n, f) => n + f.size, 0) > this.maxAttachBytes) { this.errorField.set('files'); this.sendError.set(`Too big — attachments can be 20 MB in total (these would be ${this.size(next.reduce((n, f) => n + f.size, 0))}).`); return; }
    this.sendError.set(null);
    this.errorField.set(null);
    this.compose.set({ ...c, attachments: next });
  }

  removeFile(index: number): void {
    this.compose.update((c) => (c ? { ...c, attachments: c.attachments.filter((_, i) => i !== index) } : c));
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    this.addFiles(e.dataTransfer?.files);
  }

  protected size(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private readBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  private when(m: MailDetail): string {
    return new Date(m.sentAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  }

  private quote(m: MailDetail, lead: string): string {
    return `${lead}\n` + (m.bodyText || '').split('\n').map((l) => `> ${l}`).join('\n');
  }

  setField<K extends keyof Compose>(key: K, value: Compose[K]): void {
    if (this.errorField() === key) { this.errorField.set(null); this.sendError.set(null); }
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

  /** Which part of the form the current problem is in — that row turns red and gets the cursor. */
  readonly errorField = signal<'from' | 'to' | 'cc' | 'bcc' | 'subject' | 'body' | 'files' | null>(null);

  /** The same checks the API makes, so mistakes show here first — in plain words, pointing at the field. */
  private composeError(c: Compose): string | null {
    const fail = (field: Exclude<ReturnType<typeof this.errorField>, null>, message: string) => { this.errorField.set(field); return message; };
    this.errorField.set(null);
    if (!c.account) return fail('from', 'Choose which mailbox this goes from.');
    if (!c.to.length) return fail('to', 'Who is it for? Add at least one address in To.');
    for (const f of this.recipientFields) {
      const bad = c[f].find((a) => !ADDRESS.test(a));
      if (bad) return fail(f, `“${bad}” doesn’t look like an email address. Check it or remove it (×).`);
    }
    if (c.to.length > 20) return fail('to', 'Too many people in To — 20 at most. Put the rest in Cc or Bcc.');
    if (!c.subject.trim()) return fail('subject', 'Add a subject so they know what it is about.');
    if (c.subject.length > 300) return fail('subject', 'The subject is too long — keep it under 300 characters.');
    if (!c.body.trim()) return fail('body', 'The message is empty. Write something before sending.');
    return null;
  }

  /** Puts the cursor where the problem is. */
  private focusError(): void {
    const f = this.errorField();
    setTimeout(() => {
      if (f === 'body') this.editor()?.nativeElement.focus();
      else if (f === 'subject') document.querySelector<HTMLInputElement>('.mc-row input[maxlength="300"]')?.focus();
      else if (f === 'to' || f === 'cc' || f === 'bcc') document.querySelector<HTMLInputElement>(`.mc-chips input[aria-label="${f}"]`)?.focus();
    });
  }

  async send(): Promise<void> {
    (['to', 'cc', 'bcc'] as const).forEach((f) => this.commitDraft(f));
    this.syncEditor();
    const c = this.compose();
    if (!c || this.sending()) return;
    const problem = this.composeError(c);
    if (problem) { this.sendError.set(problem); this.focusError(); return; }
    this.sending.set(true);
    this.sendError.set(null);
    let attachments: { fileName: string; contentType: string; base64: string }[] = [];
    try {
      attachments = await Promise.all(c.attachments.map(async (f) => ({
        fileName: f.name, contentType: f.type || 'application/octet-stream', base64: await this.readBase64(f),
      })));
    } catch {
      this.sending.set(false);
      this.sendError.set('An attachment could not be read. Remove it and add it again.');
      return;
    }
    // Close straight away — the mail goes out while you carry on. If it fails, the draft comes back with the reason.
    const draftHtml = this.editor()?.nativeElement.innerHTML ?? c.html;
    const from = this.accounts().find((a) => a.key === c.account)?.address ?? c.account;
    this.compose.set(null);
    this.sending.set(false);
    this.notice.set(`Sending from ${from}…`);
    this.mail
      .send({
        accountKey: c.account,
        to: c.to,
        cc: c.cc,
        bcc: c.bcc,
        subject: c.subject.trim(),
        body: c.body,
        bodyHtml: c.html.trim() || null,
        attachments,
        replyToMessageId: c.replyToId,
        quoted: c.quoted.trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notice.set(`✓ Sent from ${from}.`);
          setTimeout(() => this.notice.set(null), 5000);
          this.load();
        },
        error: (e) => {
          this.notice.set(null);
          this.compose.set(c);
          this.sendError.set(getApiErrorMessage(e, 'The message could not be sent.'));
          setTimeout(() => { const ed = this.editor()?.nativeElement; if (ed) ed.innerHTML = draftHtml; });
        },
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

  /** Delete: gone from the list at once; on the server it moves to the mailbox's Trash, so it can be restored there. */
  readonly confirmDelete = signal<MailDetail | null>(null);

  deleteMessage(m: MailDetail): void {
    this.confirmDelete.set(m);
  }

  doDelete(): void {
    const m = this.confirmDelete();
    if (!m) return;
    this.confirmDelete.set(null);
    const before = this.items();
    this.items.set(before.filter((x) => x.id !== m.id));
    this.total.update((n) => Math.max(0, n - 1));
    this.open.set(null);
    this.mail.delete([m.id]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notice.set('Message deleted — moved to Trash.');
        setTimeout(() => this.notice.set(null), 4000);
        if (!m.isRead) this.mail.accounts().subscribe((a) => this.accounts.set(a));
      },
      error: (e) => {
        this.items.set(before);
        this.total.update((n) => n + 1);
        this.error.set(getApiErrorMessage(e, 'The message could not be deleted.'));
      },
    });
  }

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
