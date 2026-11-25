import { BoqStatus } from './boq.model';

/** The file formats a proforma downloads in. */
export type ProformaFileFormat = 'pdf' | 'excel' | 'word';

/** The kept part of a quotation's proforma invoice. */
export interface Proforma {
  number: string;
  issuedOn: string;
  issuedByName: string;
  poNumber: string | null;
  poDate: string | null;
  /** Customer details changed for this proforma only; null = as on the quotation. */
  customerName: string | null;
  projectName: string | null;
  contactNumber: string | null;
  location: string | null;
}

/** Customer details as typed on screen for a proforma. Empty = as on the quotation. */
export interface ProformaCustomer {
  name: string;
  project: string;
  contactNumber: string;
  location: string;
}

/** A quotation in the administrator's list. */
export interface AdminQuotation {
  id: string;
  boqNumber: string;
  revisionNumber: number;
  projectName: string;
  siteLocation: string | null;
  clientName: string | null;
  contactNumber: string | null;
  issueDate: string;
  status: BoqStatus;
  grandTotal: number;
  preparedByName: string | null;
  createdAt: string;
  proforma: Proforma | null;
}

export interface ProformaLine {
  /** Running number across the whole document. */
  number: number;
  description: string;
  brand: string | null;
  model: string | null;
  /** As printed: Pcs, Mtr, Box, Set, Roll, Lot. */
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ProformaSection {
  title: string;
  lines: ProformaLine[];
}

/** Exactly what the proforma PDF prints now. */
export interface ProformaDocument {
  /** Null until the PI number is given (or always, for a quotation not approved yet). */
  number: string | null;
  date: string;
  quoteNumber: string;
  quoteDate: string;
  ref: string | null;
  clientName: string | null;
  projectName: string;
  contactNumber: string | null;
  location: string | null;
  sections: ProformaSection[];
  subtotal: number;
  discount: number;
  netTotal: number;
  poNumber: string | null;
  poDate: string | null;
  /** The quotation is not approved: it prints as a DRAFT with no PI number. */
  draft: boolean;
}

/** A quotation opened as its proforma invoice on screen. */
export interface ProformaSheet {
  boqId: string;
  status: BoqStatus;
  document: ProformaDocument;
  proforma: Proforma | null;
  /** The quotation's own customer details. */
  quotation: { name: string | null; project: string | null; contactNumber: string | null; location: string | null };
  amountInWords: string;
  terms: string[];
  payment: { accountHolder: string; accountNumber: string; bank: string; branch: string; swiftCode: string };
  company: { name: string; address: string; mobiles: string };
}
