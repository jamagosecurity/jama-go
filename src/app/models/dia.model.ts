export type DiaStatus =
  | 'Inactive'
  | 'Quarter1'
  | 'Quarter2'
  | 'Quarter3'
  | 'Quarter4'
  | 'Completed';

export interface Dia {
  id: string;
  diaNumber: string;
  clientNumber: string;
  clientName: string;
  clientLocation: string;
  createdDate: string;
  activatedDate: string | null;
  isActive: boolean;
  /** Soft-deleted. Only true when the list is filtered to archived records. */
  isArchived: boolean;
  status: DiaStatus;
  currentQuarter: number | null;
  quarterStartDate: string | null;
  quarterEndDate: string | null;
  nextInspectionDate: string | null;
  remainingDays: number;
  progressPercent: number;
  createdBy: string | null;
  updatedBy: string | null;
  updatedDate: string | null;
}

export interface DiaWriteRequest {
  diaNumber: string;
  clientNumber: string;
  clientName: string;
  clientLocation: string;
}

export interface DiaListQuery {
  pageNumber: number;
  pageSize: number;
  search?: string;
  status?: DiaStatus;
  /** List archived records instead of live ones. Mutually exclusive with status. */
  archived?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedData<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface DiaDashboard {
  total: number;
  active: number;
  inactive: number;
  quarter1: number;
  quarter2: number;
  quarter3: number;
  quarter4: number;
  completed: number;
}

export interface DiaInspectionHistory {
  id: string;
  diaInspectionId: string;
  action: 'Create' | 'Update' | 'Activate' | 'Deactivate' | 'Archive';
  actorId: string;
  actorName: string | null;
  createdDate: string;
  beforeJson: string | null;
  afterJson: string | null;
}

export const DIA_STATUSES: readonly DiaStatus[] = [
  'Inactive',
  'Quarter1',
  'Quarter2',
  'Quarter3',
  'Quarter4',
  'Completed',
];
