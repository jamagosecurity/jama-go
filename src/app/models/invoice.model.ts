export interface Invoice {
  id: string;
  technicianInspectionId: string;
  diaInspectionId: string;
  diaNumber: string;
  quarter: number;
  invoiceNumber: string;
  generatedAt: string;
}

export interface InvoiceShareLink {
  token: string;
  expiresAtUtc: string;
}
