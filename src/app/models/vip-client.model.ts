/** Fixed folder set every VIP project is created with. */
export type VipFolderKind = 'ClientInput' | 'QuoteInvoice' | 'DsaDocs' | 'DiaDocs';

export interface VipClientDocument {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string | null;
}

export interface VipClientFolder {
  id: string;
  kind: VipFolderKind;
  name: string;
  displayOrder: number;
  documents: VipClientDocument[];
}

export interface VipClientListItem {
  id: string;
  clientName: string;
  projectName: string;
  folderName: string;
  email: string;
  isActive: boolean;
  canSignIn: boolean;
  documentCount: number;
  createdAt: string;
}

export interface VipClientDetail {
  id: string;
  clientName: string;
  projectName: string;
  folderName: string;
  email: string;
  isActive: boolean;
  canSignIn: boolean;
  createdAt: string;
  folders: VipClientFolder[];
}

export interface CreateVipClientRequest {
  clientName: string;
  projectName: string;
  email: string;
  password: string;
  /** Omit to default to "{clientName} - {projectName}". */
  folderName?: string | null;
}

export interface UpdateVipClientRequest {
  clientName: string;
  projectName: string;
  email: string;
  /** Blank keeps the current password. */
  password?: string | null;
  folderName?: string | null;
  isActive: boolean;
  canSignIn: boolean;
}
