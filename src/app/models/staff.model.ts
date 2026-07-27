export const STAFF_DEPARTMENTS = [
  { value: 'Technician', label: 'Technician' },
  { value: 'MoiDiaUpload', label: 'MOI DIA Upload' },
  { value: 'MoiDiaInspection', label: 'MOI DIA Inspection' },
  { value: 'Panels', label: 'Panels' },
] as const;

export type StaffDepartment = (typeof STAFF_DEPARTMENTS)[number]['value'];

export interface StaffMember {
  id: string;
  fullName: string;
  role: string;
  responsibility: string;
  department: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface AdminStaffMember extends StaffMember {
  email: string | null;
  hasLoginAccount: boolean;
  /** Login account enabled. Separate from isActive, which is public visibility. */
  canSignIn: boolean;
  /** Permission keys granted to this member's login account. */
  permissions: string[];
}

/** One grantable permission, as described by the API catalogue. */
export interface PermissionDefinition {
  key: string;
  name: string;
  description: string;
}

export interface CreateStaffRequest {
  fullName: string;
  email: string;
  password: string;
  department: StaffDepartment | null;
  /** Show in the public Our Team section. */
  isActive: boolean;
  /** Allow this account to sign in. Independent of isActive. */
  canSignIn: boolean;
  /** Omit to fall back to the department's default grants. */
  permissions?: string[];
}

export interface UpdateStaffRequest {
  fullName: string;
  email: string;
  password?: string | null;
  department: StaffDepartment | null;
  /** Show in the public Our Team section. */
  isActive: boolean;
  /** Allow this account to sign in. Independent of isActive. */
  canSignIn: boolean;
}

/** Staff editing their own profile — intentionally narrower than UpdateStaffRequest. */
export interface UpdateMyStaffProfileRequest {
  fullName: string;
  responsibility: string;
}
