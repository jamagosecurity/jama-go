export type UserRole = 'Admin' | 'Staff' | 'Technician';

/**
 * Permission keys, mirroring Jama.Application.Common.Permissions on the API.
 * Used to drive navigation only — every endpoint enforces its own requirement,
 * so hiding a link is never the security boundary.
 */
export const PERMISSIONS = {
  diaView: 'dia.view',
  diaUpload: 'dia.upload',
  diaInspect: 'dia.inspect',
  invoiceView: 'invoice.view',
  contactView: 'contact.view',
  panelsManage: 'panels.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  /** Effective permissions, already including everything an Admin holds. */
  permissions: string[];
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

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
