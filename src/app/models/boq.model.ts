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
  'Monitors and Work Stations',
  'Switch & Components',
  'Rack & UPS',
  'Key Point of Interest Camera (KPOI)',
  'Automatic Number Plate Recognition (ANPR)',
  'Passive Components & Cables',
  'Access Control System',
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
  /** Comes from the catalogue. Staff cannot change it. */
  unitRate: number;
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
  total: number;
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
  issueDate: string;
  status: BoqStatus;
  total: number;
  sectionCount: number;
  lineCount: number;
  preparedByName: string | null;
  createdAt: string;
}

export interface BoqListQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: BoqStatus;
  mineOnly?: boolean;
}

/**
 * What the client may send for a line: which item, and how many.
 *
 * Deliberately no rate — the server reads that from the catalogue. Sending one
 * would be ignored, so the type does not pretend otherwise.
 */
export interface SaveBoqLine {
  cameraId: string;
  quantity: number;
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
  status: BoqStatus;
  notes: string | null;
  sections: SaveBoqSection[];
}
