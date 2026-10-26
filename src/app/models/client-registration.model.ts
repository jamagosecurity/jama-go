/** Mirrors Jama.Domain.Enums.ClientRegistrationStatus — sent as the enum NAME. */
export type ClientRegistrationStatus = 'Pending' | 'Approved' | 'Rejected';

/** Mirrors Jama.Domain.Enums.ClientCategory. */
export type ClientCategory = 'Moi' | 'NonMoi';

export const CLIENT_CATEGORY_LABELS: Record<ClientCategory, string> = {
  Moi: 'MOI',
  NonMoi: 'Non-MOI',
};

/** A staff department that can be allotted to a client, by its stable key. */
export interface ClientTeam {
  key: string;
  name: string;
}

export interface ClientRegistration {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  siteLocation: string;
  status: ClientRegistrationStatus;
  category: ClientCategory | null;
  teams: ClientTeam[];
  diaInspectionId: string | null;
  diaNumber: string | null;
  createdAt: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface ClientRegistrationCounts {
  pending: number;
  approved: number;
  rejected: number;
}

export interface ClientRegistrationList {
  items: ClientRegistration[];
  counts: ClientRegistrationCounts;
  availableTeams: ClientTeam[];
}

/** What a signed-in client sees about themselves — no reviewer, no reason. */
export interface MyClientRegistration {
  fullName: string;
  email: string;
  mobile: string;
  siteLocation: string;
  status: ClientRegistrationStatus;
  category: ClientCategory | null;
  teams: ClientTeam[];
  diaNumber: string | null;
  diaActive: boolean;
  createdAt: string;
  reviewedAt: string | null;
}

export interface RegisterClientRequest {
  fullName: string;
  email: string;
  mobile: string;
  siteLocation: string;
  password: string;
}

export interface ApproveClientRegistrationRequest {
  category: ClientCategory;
  teams: string[];
  diaNumber?: string | null;
  diaClientNumber?: string | null;
  diaClientLocation?: string | null;
}
