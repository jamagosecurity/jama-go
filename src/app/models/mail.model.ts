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
}

/** What the compose window sends. Prices nothing, trusts nothing: the API checks every field again. */
export interface SendMailRequest {
  accountKey: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  replyToMessageId: string | null;
}

export interface MailSent {
  copySavedToSent: boolean;
  sentMessageId: string | null;
}
