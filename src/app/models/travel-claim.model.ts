/** Uber bills: staff claim back rides they paid; the accountant approves and pays them back. */
export type TravelTripType = 'OfficeToAccommodation' | 'AccommodationToOffice' | 'Site';
export type TravelClaimStatus = 'Submitted' | 'Approved' | 'Rejected' | 'Paid' | 'Withdrawn';
export type ReimbursementMethod = 'Cash' | 'BankTransfer';

/** What was read from Uber's PDF. */
export interface UberReceiptReading {
  amount: number | null;
  tripOn: string | null;
  tripTime: string | null;
  pickup: string | null;
  dropoff: string | null;
  complete: boolean;
}

export interface TravelClaimLine {
  id: string;
  kind: 'Ride' | 'Lunch';
  billAmount: number;
  amount: number;
  persons: number;
  ratePerPerson: number | null;
  readFromReceipt: boolean;
  fileName: string;
}

export interface TravelClaimPerson { personId: string; name: string; ateLunch: boolean; }
export interface TravelClaimEvent { action: string; actorName: string; at: string; note: string | null; amount: number | null; }

export interface TravelClaim {
  id: string;
  claimNumber: string;
  claimantId: string;
  claimantName: string;
  tripOn: string;
  tripTime: string | null;
  tripType: TravelTripType;
  siteName: string | null;
  pickup: string | null;
  dropoff: string | null;
  claimantAteLunch: boolean;
  /** What was claimed. */
  total: number;
  /** What the accountant approved (equal to or less than claimed); null until approved. */
  approvedAmount: number | null;
  adjustmentReason: string | null;
  /** What is owed / was paid: the approved amount once there is one, otherwise what was claimed. */
  payable: number;
  note: string | null;
  status: TravelClaimStatus;
  submittedAt: string;
  approvedAt: string | null;
  approvedByName: string | null;
  rejectedAt: string | null;
  rejectedByName: string | null;
  rejectReason: string | null;
  withdrawnAt: string | null;
  paidAt: string | null;
  paidByName: string | null;
  paidMethod: ReimbursementMethod | null;
  reimbursementNumber: string | null;
  /** Days from submitted to paid back (or closed); while open, days so far. */
  daysWaiting: number;
  lines: TravelClaimLine[];
  people: TravelClaimPerson[];
  events: TravelClaimEvent[];
}

export interface TravelBalance {
  personId: string;
  name: string;
  waitingApproval: number;
  waitingCount: number;
  owed: number;
  owedCount: number;
  paidThisMonth: number;
  paidTotal: number;
  lastPaidAt: string | null;
  oldestOpenDays: number;
}

export interface Reimbursement {
  id: string;
  number: string;
  payeeId: string;
  payeeName: string;
  amount: number;
  method: ReimbursementMethod;
  reference: string | null;
  paidAt: string;
  paidByName: string;
  claimNumbers: string[];
}

export interface MyTravelClaims { balance: TravelBalance; lunchRate: number; claims: TravelClaim[]; }

export interface TravelClaimsBoard {
  lunchRate: number;
  toApproveTotal: number;
  toApproveCount: number;
  owedTotal: number;
  owedCount: number;
  paidThisMonth: number;
  people: TravelBalance[];
  claims: TravelClaim[];
  reimbursements: Reimbursement[];
}

/** One bill to approve: at the amount claimed (null) or lower, with the reason. */
export interface TravelClaimApproval { claimId: string; approvedAmount: number | null; reason: string | null; }

export interface TravelPersonOption { id: string; name: string; }
export interface LunchRate { amountPerPerson: number; effectiveFrom: string; setByName: string; setAt: string; }
export interface LunchRates { current: number; history: LunchRate[]; }

export interface SubmitTravelClaim {
  receipt: File;
  tripType: TravelTripType;
  siteName: string | null;
  companions: string[];
  ateLunch: string[];
  lunchBillAmount: number | null;
  lunchBill: File | null;
  note: string | null;
}

export const TRIP_TYPES: { value: TravelTripType; label: string }[] = [
  { value: 'OfficeToAccommodation', label: 'Office → Accommodation' },
  { value: 'AccommodationToOffice', label: 'Accommodation → Office' },
  { value: 'Site', label: 'Site' },
];

export function tripLabel(type: TravelTripType, site?: string | null): string {
  const base = TRIP_TYPES.find((t) => t.value === type)?.label ?? type;
  return type === 'Site' && site ? `Site · ${site}` : base;
}

export const CLAIM_STATUS: Record<TravelClaimStatus, { label: string; tone: string }> = {
  Submitted: { label: 'Waiting for approval', tone: 'amber' },
  Approved: { label: 'Approved · to be paid back', tone: 'blue' },
  Paid: { label: 'Paid back', tone: 'green' },
  Rejected: { label: 'Rejected', tone: 'red' },
  Withdrawn: { label: 'Withdrawn', tone: 'grey' },
};

export const METHOD_LABEL: Record<ReimbursementMethod, string> = { Cash: 'Cash', BankTransfer: 'Bank transfer' };
