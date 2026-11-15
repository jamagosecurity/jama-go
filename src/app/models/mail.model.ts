export interface MailListItem {
  id: string;
  accountKey: string;
  accountAddress: string;
  folder: 'Inbox' | 'Sent';
  fromName: string;
  fromAddress: string;
  toAddresses: string;
  subject: string;
  sentAt: string;
  snippet: string;
  hasAttachments: boolean;
  isRead: boolean;
}

export interface MailDetail extends Omit<MailListItem, 'snippet'> {
  bodyText: string;
  bodyHtml: string | null;
  attachmentNames: string;
}

export interface MailPage {
  items: MailListItem[];
  total: number;
}

export interface MailAccount {
  key: string;
  address: string;
  configured: boolean;
  inboxCount: number;
  sentCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  signature: string;
  /** The signature card as sent; the logo is cid:jamago-logo. */
  signatureHtml: string;
  signerName: string;
  /** Received messages not read yet. */
  unreadCount: number;
  /** No password here, but its incoming mail arrives through the copy mailbox. */
  viaCopy: boolean;
}

/** What the compose window sends. Prices nothing, trusts nothing: the API checks every field again. */
export interface SendMailRequest {
  accountKey: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  replyToMessageId: string | null;
  /** The original under a reply or forward, shown below the signature. */
  quoted: string | null;
}

export interface MailSent {
  copySavedToSent: boolean;
  sentMessageId: string | null;
}
