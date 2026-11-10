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
  status: 'Assigned' | 'Completed';
  completedAt: string | null;
  workTotal: number;
  completionNotes: string | null;
  lines: NonMoiJobLine[];
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
}
