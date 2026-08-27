import { Option } from './camera.model';

/** Mirrors Jama.Domain.Enums.QuotationStatus — the server sends the enum NAME. */
export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';

export const QUOTATION_STATUSES: readonly Option<QuotationStatus>[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Sent', label: 'Sent' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Expired', label: 'Expired' },
];

export interface QuotationLine {
  id: string;
  /** Soft link to the catalogue item. Null for a free-typed line, or once that
   *  item has been deleted — the copied name and price stay either way. */
  cameraId: string | null;
  itemName: string;
  modelNo: string | null;
  brand: string | null;
  description: string | null;
  quantity: number;
  unitRate: number;
  discountPercent: number;
  taxPercent: number;
  /** Server-computed: net of discount, inclusive of tax. */
  lineTotal: number;
  sortOrder: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerCompany: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  /** ISO date, no time — the API uses DateOnly. */
  issueDate: string;
  validUntil: string | null;
  status: QuotationStatus;
  notes: string | null;
  terms: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  lines: QuotationLine[];
  createdAt: string;
  updatedAt: string | null;
}

/** The list carries no lines, only how many there are. */
export interface QuotationListItem {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerCompany: string | null;
  issueDate: string;
  validUntil: string | null;
  status: QuotationStatus;
  grandTotal: number;
  lineCount: number;
  createdAt: string;
}

export interface QuotationSummary {
  totalQuotations: number;
  draftCount: number;
  sentCount: number;
  acceptedCount: number;
  acceptedValue: number;
  openValue: number;
}

export interface QuotationListQuery {
  pageNumber?: number;
  pageSize?: number;
  /** Matches on quote number, customer name or company. */
  search?: string;
  status?: QuotationStatus;
}

export interface SaveQuotationLine {
  cameraId: string | null;
  itemName: string;
  modelNo: string | null;
  brand: string | null;
  description: string | null;
  quantity: number;
  unitRate: number;
  discountPercent: number;
  taxPercent: number;
}

export interface SaveQuotationRequest {
  customerName: string;
  customerCompany: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  issueDate: string;
  validUntil: string | null;
  status: QuotationStatus;
  notes: string | null;
  terms: string | null;
  lines: SaveQuotationLine[];
}

/**
 * Mirrors QuotationMath on the server so the editor can show a running total
 * while typing. The server recomputes on save and its answer wins — this exists
 * for feedback, never as the source of the figure.
 */
export function lineTotalOf(line: {
  quantity: number;
  unitRate: number;
  discountPercent: number;
  taxPercent: number;
}): number {
  const gross = round2(line.quantity * line.unitRate);
  const discount = round2((gross * line.discountPercent) / 100);
  const net = gross - discount;
  return net + round2((net * line.taxPercent) / 100);
}

export function quotationTotalsOf(lines: SaveQuotationLine[]) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const line of lines) {
    const gross = round2(line.quantity * line.unitRate);
    const discount = round2((gross * line.discountPercent) / 100);
    const net = gross - discount;
    subtotal += gross;
    discountTotal += discount;
    taxTotal += round2((net * line.taxPercent) / 100);
  }

  return {
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal: subtotal - discountTotal + taxTotal,
  };
}

/** Two decimals, half away from zero — matches the server's rounding. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
