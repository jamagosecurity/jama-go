/** MOI and Non-MOI cash are handed over separately. */
export type CashKind = 'moi' | 'nonmoi';

/** One cash payment inside a handover. */
export interface HandoverPayment {
  paymentId: string;
  jobId: string;
  jobNumber: string;
  customerName: string;
  amount: number;
  /** yyyy-MM-dd, the Doha day the money came in. */
  receivedOn: string;
  recordedByName: string;
  note: string | null;
}

/** One person's cash that has not been handed over yet. A null collectorId is cash received at the office. */
export interface PendingHandover {
  collectorId: string | null;
  collectorName: string;
  total: number;
  oldestDay: string;
  newestDay: string;
  payments: HandoverPayment[];
}

export interface PendingHandovers {
  kind: string;
  today: string;
  total: number;
  groups: PendingHandover[];
}

/** What the accountant counted for one person. Difference is received − expected: below zero is missing, above is extra. */
export interface CashHandover {
  id: string;
  kind: string;
  collectorId: string | null;
  collectorName: string;
  expected: number;
  received: number;
  difference: number;
  note: string | null;
  receivedByName: string;
  receivedAt: string;
  payments: HandoverPayment[];
}

export interface ConfirmHandover {
  kind: CashKind;
  collectorId: string | null;
  /** The figure the page showed; the server refuses if cash changed since. */
  expectedAmount: number;
  receivedAmount: number;
  note: string | null;
}

export interface OnlinePayment {
  paymentId: string;
  jobId: string;
  jobNumber: string;
  customerName: string;
  amount: number;
  receivedOn: string;
  recordedByName: string;
  hasReceipt: boolean;
  note: string | null;
}

export interface OnlinePayments {
  kind: string;
  from: string;
  to: string;
  total: number;
  rows: OnlinePayment[];
}
