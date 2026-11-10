/** A section of the checklist: one of the six built-in keys below, or the name
 *  admin typed when adding a category of their own. */
export type MaintenanceCategory = string;

/** The built-in sections, in checklist order. Admin-added ones are not listed
 *  here — they come from the price list; see maintenanceCategoryOptions. */
export const MAINTENANCE_CATEGORIES: readonly { value: MaintenanceCategory; label: string }[] = [
  { value: 'PowerService', label: 'Power service' },
  { value: 'Connectivity', label: 'Connectivity' },
  { value: 'Camera', label: 'Camera' },
  { value: 'NvrStorage', label: 'NVR & storage' },
  { value: 'Software', label: 'Software' },
  { value: 'Other', label: 'Other' },
];

/** Mirrors Jama.Domain.Enums.MaintenanceStatus. */
export type MaintenanceStatus = 'Open' | 'InProgress' | 'Resolved' | 'Cancelled';

export const MAINTENANCE_STATUSES: readonly { value: MaintenanceStatus; label: string }[] = [
  { value: 'Open', label: 'Open' },
  { value: 'InProgress', label: 'In progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export function maintenanceCategoryLabel(category: MaintenanceCategory): string {
  return MAINTENANCE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

/** Every section in checklist order: the built-ins, then any admin added
 *  (in the order given), with Other always last. */
export function maintenanceCategoryOptions(
  extra: Iterable<MaintenanceCategory> = [],
): { value: MaintenanceCategory; label: string }[] {
  const builtIn = MAINTENANCE_CATEGORIES.filter((c) => c.value !== 'Other');
  const known = new Set(MAINTENANCE_CATEGORIES.map((c) => c.value));
  const added: { value: MaintenanceCategory; label: string }[] = [];
  for (const category of extra) {
    if (category && !known.has(category)) {
      known.add(category);
      added.push({ value: category, label: category });
    }
  }
  return [...builtIn, ...added, ...MAINTENANCE_CATEGORIES.filter((c) => c.value === 'Other')];
}

/** One picture of a service on the price list. */
export interface MaintenanceImage {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sortOrder: number;
  /** Relative URL the browser can use straight in an img src. */
  url: string;
}

/** One issue on a ticket. catalogueFee is what the catalogue charged when the
 *  line was written; unitFee differs only where maintenance.manage repriced it. */
export interface MaintenanceLine {
  id: string;
  category: MaintenanceCategory;
  issueType: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  quantity: number;
  unitFee: number;
  catalogueFee: number;
  lineTotal: number;
}

export interface MaintenanceRequest {
  id: string;
  requestNumber: string;
  lines: MaintenanceLine[];
  description: string | null;
  siteLocation: string | null;
  clientName: string | null;
  clientEmail: string;
  contactNumber: string | null;
  status: MaintenanceStatus;
  subtotal: number;
  discount: number;
  /** What the client pays: subtotal less discount. */
  serviceFee: number;
  reportedById: string;
  reportedByName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  resolutionNotes: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface MaintenanceRequestListItem {
  id: string;
  requestNumber: string;
  /** "Camera replacement + 2 more" */
  summary: string;
  categories: MaintenanceCategory[];
  lineCount: number;
  siteLocation: string | null;
  clientName: string | null;
  status: MaintenanceStatus;
  serviceFee: number;
  reportedByName: string | null;
  assignedToName: string | null;
  createdAt: string;
}

/** One service on the Non-MOI price list admin maintains. */
export interface MaintenanceIssueOption {
  id: string;
  category: MaintenanceCategory;
  issueType: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  defaultFee: number;
  images: MaintenanceImage[];
}

/** What admin sends to add or edit a service on the Non-MOI price list. */
export interface SaveMaintenanceCatalogueItem {
  category: MaintenanceCategory;
  name: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  price: number;
}

export interface AssignableStaff {
  adminUserId: string;
  fullName: string;
  department: string | null;
}

/** unitFee is honoured only from maintenance.manage — anyone else's line is
 *  charged at the catalogue price server-side. */
export interface MaintenanceLineInput {
  category: MaintenanceCategory;
  issueType: string;
  quantity: number;
  unitFee: number | null;
}

export interface CreateMaintenanceRequest {
  lines: MaintenanceLineInput[];
  description: string | null;
  siteLocation: string | null;
  clientName: string | null;
  /** Required. */
  clientEmail: string;
  contactNumber: string | null;
  /** Lump sum in QAR; maintenance.manage only, same as unitFee. */
  discount: number | null;
}

export type UpdateMaintenanceRequest = CreateMaintenanceRequest;

export interface MaintenanceRequestListQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: MaintenanceStatus;
  category?: MaintenanceCategory;
  unassignedOnly?: boolean;
}
