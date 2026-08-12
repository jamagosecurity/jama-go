export type UserRole = 'Admin' | 'Staff' | 'Technician' | 'Client';

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
  vipManage: 'vip.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  /** Effective permissions, already including everything an Admin holds. */
  permissions: string[];
  /**
   * The seeded root account, per the server's AdminSeed:Email. Only used to hide
   * actions no other admin may take — the API enforces the same rule itself, so
   * this never has to be trusted.
   */
  isSuperAdmin: boolean;
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
