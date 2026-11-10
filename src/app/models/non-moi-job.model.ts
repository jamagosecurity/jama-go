/** A Non-MOI job admin issued to one technician. Mirrors NonMoiJobDto. */
export interface NonMoiJob {
  id: string;
  jobNumber: string;
  customerName: string;
  customerNumber: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  descriptionEn: string;
  descriptionAr: string | null;
  assignedToId: string;
  assignedToName: string;
  createdAt: string;
  updatedAt: string | null;
  status: NonMoiJobStatus;
  completedAt: string | null;
  workTotal: number;
  completionNotes: string | null;
  lines: NonMoiJobLine[];
  customerEmail: string | null;
  /** Who issued the job: only this person (and administrators) can close the deal. */
  assignedById: string;
  assignedByName: string;
  discount: number;
  /** What the client pays: the total less the discount. */
  amountPayable: number;
  closedAt: string | null;
  closedByName: string | null;
  emailSentAt: string | null;
  whatsAppSentAt: string | null;
  /** Which version of the bill the client is looking at; 1 until a change request leads to a new one. */
  billRevision: number;
  /** The client's latest answer on the current revision. */
  clientDecision: 'Approved' | 'Rejected' | 'Commented' | null;
  clientMessage: string | null;
  clientResponderName: string | null;
  clientRespondedAt: string | null;
  events: NonMoiJobEvent[];
}

/**
 * Where a job is. Assigned: with the technician. Completed: he has finished, waiting for the issuer to send the bill.
 * Sent: the bill is with the client. ChangesRequested: the client rejected or commented — back to the issuer.
 * Closed: the client approved, so the deal is final.
 */
export type NonMoiJobStatus = 'Assigned' | 'Completed' | 'Sent' | 'ChangesRequested' | 'Closed';

/** One step in the bill's history. */
export interface NonMoiJobEvent {
  action: 'Sent' | 'Approved' | 'Rejected' | 'Commented';
  actorName: string;
  note: string | null;
  revision: number;
  amountPayable: number;
  at: string;
}

/** One issue the technician fixed, priced from the Non-MOI price list at completion. */
export interface NonMoiJobLine {
  category: string;
  issueType: string;
  quantity: number;
  unitFee: number;
  lineTotal: number;
}

/** What the technician sends to finish a job — no prices; the server looks them up. */
export interface CompleteNonMoiJob {
  lines: { category: string; issueType: string; quantity: number }[];
  notes: string | null;
}

/** A technician a job can be issued to. */
export interface JobTechnician {
  adminUserId: string;
  fullName: string;
}

/** What admin sends to issue or edit a job. */
export interface SaveNonMoiJob {
  customerName: string;
  customerNumber: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  descriptionEn: string;
  descriptionAr: string | null;
  assignedToId: string;
  customerEmail: string | null;
}

/** What the person closing the deal sends: a discount, and how the client gets the bill. */
export interface CloseNonMoiJob {
  discount: number;
  email: string | null;
  sendEmail: boolean;
  sendWhatsApp: boolean;
  mailboxKey: string | null;
}

/** How a bill can be sent from this server: which mailboxes, and whether WhatsApp is set up at all. */
export interface BillSendOptions {
  mailboxes: BillMailbox[];
  whatsAppAvailable: boolean;
}

/** A company mailbox a bill can be sent from. Never carries a password. */
export interface BillMailbox {
  key: string;
  address: string;
}

/** What the client's own page shows (reached from the link in their email or WhatsApp message). */
export interface PublicJobBill {
  jobNumber: string;
  customerName: string;
  location: string;
  revision: number;
  status: NonMoiJobStatus;
  lines: { issue: string; category: string; quantity: number; unitFee: number; lineTotal: number }[];
  total: number;
  discount: number;
  amountPayable: number;
  paymentAccountName: string;
  paymentCrNumber: string;
  paymentIban: string;
  canRespond: boolean;
  decision: 'Approved' | 'Rejected' | 'Commented' | null;
  decisionMessage: string | null;
  decidedAt: string | null;
}

export type ClientDecisionKind = 'approve' | 'reject' | 'comment';
