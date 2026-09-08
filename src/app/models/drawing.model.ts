/** Mirrors Jama.Domain.Enums.DrawingStatus — the server sends the enum NAME. */
export type DrawingStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';

export const DRAWING_STATUSES: readonly { value: DrawingStatus; label: string }[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
];

/** Mirrors Jama.Domain.Enums.DrawingApprovalAction. */
export type DrawingApprovalAction =
  | 'Created'
  | 'Submitted'
  | 'Approved'
  | 'Rejected'
  /** Changed after a decision — super administrator only. */
  | 'Amended';

/**
 * One step in a drawing's approval history.
 *
 * The actor's name is the one recorded at the time, not the account's name
 * today — a trail that rewrites itself is no trail.
 */
export interface DrawingApprovalEvent {
  id: string;
  action: DrawingApprovalAction;
  actorId: string;
  actorName: string | null;
  /** Given on a rejection, and only there. */
  reason: string | null;
  at: string;
}

/**
 * One uploaded file: the native DWG/DXF, a plotted PDF, or a ZIP with xrefs.
 * A drawing normally carries at least the DWG and the PDF — neither DWG nor
 * DXF renders in a browser, so the PDF is what an approver actually looks at.
 */
export interface DrawingFile {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string | null;
  createdAt: string;
}

export interface Drawing {
  id: string;
  drawingNumber: string;
  projectName: string;
  clientName: string | null;
  siteLocation: string | null;
  contactNumber: string | null;
  notes: string | null;
  status: DrawingStatus;
  preparedById: string;
  preparedByName: string | null;

  // ===== Approval =====
  submittedAt: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  /** Why the current rejection was given — what a rework starts from. */
  rejectionReason: string | null;
  /**
   * Whether the details and files may still be changed. Comes from the
   * server rather than being worked out from the status here, so the editor
   * cannot believe something the API will refuse.
   */
  isEditable: boolean;
  rejectionCount: number;
  submissionCount: number;

  files: DrawingFile[];
  /** Every step, oldest first. Append-only. */
  history: DrawingApprovalEvent[];

  createdAt: string;
  updatedAt: string | null;
}

export interface DrawingListItem {
  id: string;
  drawingNumber: string;
  projectName: string;
  clientName: string | null;
  status: DrawingStatus;
  preparedByName: string | null;
  submittedAt: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  fileCount: number;
  createdAt: string;
}

export interface DrawingListQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: DrawingStatus;
  mineOnly?: boolean;
}

/** What the client may send when creating or updating a drawing's details —
 *  its content is its files, uploaded separately. */
export interface SaveDrawingRequest {
  projectName: string;
  clientName: string | null;
  siteLocation: string | null;
  contactNumber: string | null;
  notes: string | null;
}
