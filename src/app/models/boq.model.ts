import { CameraResolution, Option, UnitOfMeasurement } from './camera.model';

/** Mirrors Jama.Domain.Enums.BoqStatus — the server sends the enum NAME. */
export type BoqStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';

export const BOQ_STATUSES: readonly Option<BoqStatus>[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
];

/**
 * Mirrors Jama.Application.Boqs.BoqSectionTitles — the server refuses anything
 * else, so this list and that one must not drift.
 */
export const BOQ_SECTION_TITLES: readonly string[] = [
  'Main CCTV System',
  'Camera Accessories',
  'NVR & Storage',
  'VMS & Server',
  'Monitors and Work Stations',
  'Switch & Components',
  'Rack & UPS',
  'Key Point of Interest Camera (KPOI)',
  'Automatic Number Plate Recognition (ANPR)',
  'Passive Components & Cables',
  'Access Control System',
  'Service',
];

export interface BoqLine {
  id: string;
  cameraId: string | null;
  /** Reader-facing number, e.g. "1.2". Server-derived from position. */
  number: string;
  itemName: string;
  modelNo: string | null;
  brand: string | null;
  /** Form factor as the catalogue held it when the line was written. */
  type: string | null;
  uom: UnitOfMeasurement;
  quantity: number;
  /**
   * The recording profile frozen onto this line when it was written — what
   * storage sizing reads, so a bill sizes the same today as when it was quoted.
   * Not the catalogue's current value, and deliberately so.
   *
   * Unspecified/null on everything that is not a camera, and on a camera whose
   * profile nobody had filled in at the time.
   */
  resolution: CameraResolution;
  bitrateMbps: number | null;
  /** What this line is charged at — the catalogue rate unless someone with the
   *  rate override grant typed a different one. */
  unitRate: number;
  /** What the catalogue held when the line was written. Equal to unitRate on an
   *  ordinary line; different means a discount, and the pair is what makes that
   *  discount visible instead of lost. */
  catalogueRate: number;
  lineTotal: number;
  sortOrder: number;
}

export interface BoqSection {
  id: string;
  title: string;
  sortOrder: number;
  subtotal: number;
  lines: BoqLine[];
}

export interface Boq {
  id: string;
  boqNumber: string;
  projectName: string;
  siteLocation: string | null;
  clientName: string | null;
  /** Free text — Qatari numbers are written with spaces, and a client may give
   *  an extension or a second line. */
  contactNumber: string | null;
  issueDate: string;
  status: BoqStatus;
  notes: string | null;
  preparedById: string;
  preparedByName: string | null;
  /** Sum of the lines, before any discount. */
  total: number;
  /** A lump sum agreed off the total, in QAR. Zero when none was given. */
  specialDiscount: number;
  /** What is payable: the lines less the discount. */
  grandTotal: number;

  // ===== Approval =====
  submittedAt: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  /** Why the current rejection was given — what a rework starts from. */
  rejectionReason: string | null;
  /**
   * Whether the lines may still be changed. Comes from the server rather than
   * being worked out from the status here, so the editor cannot believe
   * something the API will refuse.
   */
  isEditable: boolean;
  /** How many times it has been sent back, and how many times submitted — so
   *  "approved at the third attempt" needs no counting by hand. */
  rejectionCount: number;
  submissionCount: number;
  /** Every step, oldest first. Append-only. */
  history: BoqApprovalEvent[];

  sections: BoqSection[];
  createdAt: string;
  updatedAt: string | null;
}

export interface BoqListItem {
  id: string;
  boqNumber: string;
  projectName: string;
  siteLocation: string | null;
  clientName: string | null;
  contactNumber: string | null;
  issueDate: string;
  status: BoqStatus;
  total: number;
  specialDiscount: number;
  grandTotal: number;
  submittedAt: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  rejectionCount: number;
  submissionCount: number;
  sectionCount: number;
  lineCount: number;
  preparedByName: string | null;
  createdAt: string;
}

/** Mirrors Jama.Domain.Enums.BoqApprovalAction. */
export type BoqApprovalAction =
  | 'Created'
  | 'Submitted'
  | 'Approved'
  | 'Rejected'
  /** Changed after a decision — super administrator only. */
  | 'Amended';

/**
 * One step in a quotation's approval history.
 *
 * The actor's name is the one recorded at the time, not the account's name
 * today — a trail that rewrites itself is no trail.
 */
export interface BoqApprovalEvent {
  id: string;
  action: BoqApprovalAction;
  actorId: string;
  actorName: string | null;
  /** Given on a rejection, and only there. */
  reason: string | null;
  at: string;
}

export interface BoqListQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: BoqStatus;
  mineOnly?: boolean;
}

/**
 * What the client may send for a line: which item, how many, and — from an
 * account holding the rate override grant — at what rate.
 *
 * Still no name, model or unit: those describe the item and the server reads
 * them from the catalogue.
 */
export interface SaveBoqLine {
  /**
   * The line's own id, for a line already on this BOQ. It is what keeps a line
   * whose stock item has since been deleted — that line has no cameraId left,
   * so the id is the only way to say which line is being kept.
   */
  id: string | null;
  /** Null once the stock item behind the line has been deleted. */
  cameraId: string | null;
  quantity: number;
  /**
   * A rate to use instead of the catalogue's, or null to take the catalogue's.
   *
   * The server refuses a value that differs from the catalogue when the account
   * lacks the grant, rather than dropping it quietly — so this is never sent
   * hopefully. The editor only sets it where it is allowed to.
   */
  unitRate: number | null;
}

export interface SaveBoqSection {
  title: string;
  lines: SaveBoqLine[];
}

export interface SaveBoqRequest {
  projectName: string;
  siteLocation: string | null;
  clientName: string | null;
  contactNumber: string | null;
  issueDate: string;
  notes: string | null;
  /**
   * A lump sum off the finished quotation, in QAR. Zero for no discount.
   *
   * Only the amount is sent — the server works out what is payable from the
   * lines it priced, so a client cannot state its own final figure.
   */
  specialDiscount: number;
  sections: SaveBoqSection[];
}

/**
 * One decision an administrator is told about: what was decided, on whose
 * quotation, by whom, and — for a rejection — why.
 *
 * Read off the approval trail rather than a notifications table, so it can never
 * disagree with the history on the quotation itself.
 */
export interface BoqNotification {
  id: string;
  boqId: string;
  boqNumber: string;
  projectName: string;
  clientName: string | null;
  amount: number;
  action: BoqApprovalAction;
  /** Who decided. */
  actorName: string | null;
  /** Whose quotation was answered. */
  preparedByName: string | null;
  reason: string | null;
  at: string;
  isUnread: boolean;
  /** Which submission this decision answered — 3 means approved at the third
   *  time of asking. */
  attempt: number;
  /** How many times this quotation has been sent back, all told. */
  rejectionCount: number;
  /** Whether the signed-in account built it, which changes only the wording. */
  isMine: boolean;
}

export interface BoqNotifications {
  items: BoqNotification[];
  unreadCount: number;
}
