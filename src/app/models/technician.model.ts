export type UserRole = 'Admin' | 'Staff' | 'Technician';

export type TechnicianCycleStatus =
  | 'NotStarted'
  | 'Quarter1'
  | 'Quarter2'
  | 'Quarter3'
  | 'Quarter4'
  | 'Completed';

export type TechnicianInspectionStatus = 'Draft' | 'Submitted';

export type TechnicianDiaAction = 'StartInspection' | 'Continue' | 'View';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  expiresAtUtc: string;
  user: UserSummary;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TechnicianDiaListItem {
  id: string;
  diaNumber: string;
  clientNumber: string;
  clientName: string;
  clientLocation: string;
  activatedDate: string | null;
  inspectionStatus: TechnicianCycleStatus;
  currentQuarter: number | null;
  action: TechnicianDiaAction;
  currentInspectionId: string | null;
}

export interface CameraDetail {
  id?: string | null;
  brand: string;
  model: string;
  quantity: number;
  location?: string | null;
  remarks?: string | null;
}

export interface NetworkDetail {
  switchBrand?: string | null;
  switchModel?: string | null;
  routerBrand?: string | null;
  routerModel?: string | null;
  firewall?: string | null;
  rackDetails?: string | null;
  networkRemarks?: string | null;
}

export interface VmsDetail {
  vmsName?: string | null;
  version?: string | null;
  licenseDetails?: string | null;
  serverDetails?: string | null;
  healthStatus?: string | null;
  remarks?: string | null;
}

export interface UpsGeneralDetail {
  upsBrand?: string | null;
  upsCapacity?: string | null;
  batteryStatus?: string | null;
  generatorAvailable: boolean;
  generatorDetails?: string | null;
  generalRemarks?: string | null;
}

export interface AnprConfiguration {
  anprInstalled: boolean;
  cameraDetails?: string | null;
  configuration?: string | null;
  softwareVersion?: string | null;
  remarks?: string | null;
}

export interface KpoiDetail {
  details?: string | null;
}

export interface TechnicianInspection {
  id: string;
  diaInspectionId: string;
  quarter: number;
  status: TechnicianInspectionStatus;
  submittedAt: string | null;
  isReadOnly: boolean;
  cameras: CameraDetail[];
  network: NetworkDetail | null;
  vms: VmsDetail | null;
  upsGeneral: UpsGeneralDetail | null;
  anpr: AnprConfiguration | null;
  kpoi: KpoiDetail | null;
}

export interface TechnicianDiaDetail {
  id: string;
  diaNumber: string;
  clientNumber: string;
  clientName: string;
  clientLocation: string;
  activatedDate: string | null;
  inspectionStartedDate: string | null;
  inspectionStatus: TechnicianCycleStatus;
  currentQuarter: number | null;
  quarterStartDate: string | null;
  quarterEndDate: string | null;
  remainingDays: number;
  progressPercent: number;
  action: TechnicianDiaAction;
  currentInspectionId: string | null;
  currentInspection: TechnicianInspection | null;
}

export interface InspectionInvoice {
  id: string;
  technicianInspectionId: string;
  diaInspectionId: string;
  diaNumber: string;
  quarter: number;
  invoiceNumber: string;
  generatedAt: string;
}

export interface TechnicianInspectionHistory {
  id: string;
  technicianInspectionId: string;
  diaInspectionId: string | null;
  action: string;
  actorId: string;
  actorName: string | null;
  createdDate: string;
  beforeJson: string | null;
  afterJson: string | null;
}

export interface TechnicianFinalSummary {
  diaInspectionId: string;
  diaNumber: string;
  clientName: string;
  inspectionStartedDate: string | null;
  inspections: TechnicianInspection[];
  invoices: InspectionInvoice[];
  history: TechnicianInspectionHistory[];
}

export interface SaveTechnicianDraftRequest {
  inspectionId: string;
  cameras: CameraDetail[];
  network: NetworkDetail | null;
  vms: VmsDetail | null;
  upsGeneral: UpsGeneralDetail | null;
  anpr: AnprConfiguration | null;
  kpoi: KpoiDetail | null;
}

export interface PaginatedData<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
