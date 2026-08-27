/**
 * Camera form factors, mirroring Jama.Domain.Enums.CameraType on the API.
 *
 * The server stores and sends the enum NAME, so these strings are the wire
 * values and must match the C# member names exactly. Display copy lives in
 * CAMERA_TYPES below — "Ptz" is the value, "PTZ" is what a person reads.
 */
export type CameraType = 'Bullet' | 'Dome' | 'Ptz' | 'Fisheye' | 'Thermal' | 'Anpr' | 'Box';

export interface CameraTypeOption {
  value: CameraType;
  label: string;
}

export const CAMERA_TYPES: readonly CameraTypeOption[] = [
  { value: 'Bullet', label: 'Bullet' },
  { value: 'Dome', label: 'Dome' },
  { value: 'Ptz', label: 'PTZ' },
  { value: 'Fisheye', label: 'Fisheye' },
  { value: 'Thermal', label: 'Thermal' },
  { value: 'Anpr', label: 'ANPR' },
  { value: 'Box', label: 'Box' },
];

const CAMERA_TYPE_LABELS = new Map<CameraType, string>(
  CAMERA_TYPES.map((option) => [option.value, option.label]),
);

/** Falls back to the raw value so a type added on the API still renders. */
export function cameraTypeLabel(type: CameraType): string {
  return CAMERA_TYPE_LABELS.get(type) ?? type;
}

/** Mirrors Jama.Domain.Enums. The server sends and accepts the enum NAME. */
export type ProductCategory =
  | 'Cctv' | 'AccessControl' | 'Alarm' | 'Network'
  | 'Cable' | 'Storage' | 'Monitor' | 'PowerSupply' | 'Accessory' | 'Other';

export type UnitOfMeasurement = 'Piece' | 'Box' | 'Set' | 'Metre' | 'Roll' | 'Pack' | 'Pair';

export type ItemType = 'Product' | 'Service';

export type WarrantyUnit = 'Day' | 'Month' | 'Year';

export interface Option<T> {
  value: T;
  label: string;
}

export const PRODUCT_CATEGORIES: readonly Option<ProductCategory>[] = [
  { value: 'Cctv', label: 'CCTV' },
  { value: 'AccessControl', label: 'Access control' },
  { value: 'Alarm', label: 'Alarm' },
  { value: 'Network', label: 'Network' },
  { value: 'Cable', label: 'Cable' },
  { value: 'Storage', label: 'Storage' },
  { value: 'Monitor', label: 'Monitor / workstation' },
  { value: 'PowerSupply', label: 'Power supply' },
  { value: 'Accessory', label: 'Accessory' },
  { value: 'Other', label: 'Other' },
];

export const UNITS_OF_MEASUREMENT: readonly Option<UnitOfMeasurement>[] = [
  // Stored as 'Piece'; written as 'pcs' wherever it is shown, including the PDF.
  { value: 'Piece', label: 'pcs' },
  { value: 'Box', label: 'Box' },
  { value: 'Set', label: 'Set' },
  { value: 'Metre', label: 'Metre' },
  { value: 'Roll', label: 'Roll' },
  { value: 'Pack', label: 'Pack' },
  { value: 'Pair', label: 'Pair' },
];

/** Mirrors Jama.Domain.Enums.CameraResolution. */
export type CameraResolution =
  | 'Unspecified' | 'OneMp' | 'TwoMp' | 'ThreeMp' | 'FourMp'
  | 'FiveMp' | 'SixMp' | 'EightMp' | 'TwelveMp';

export const CAMERA_RESOLUTIONS: readonly Option<CameraResolution>[] = [
  { value: 'Unspecified', label: 'Not set' },
  { value: 'OneMp', label: '1 MP' },
  { value: 'TwoMp', label: '2 MP' },
  { value: 'ThreeMp', label: '3 MP' },
  { value: 'FourMp', label: '4 MP' },
  { value: 'FiveMp', label: '5 MP' },
  { value: 'SixMp', label: '6 MP' },
  { value: 'EightMp', label: '8 MP' },
  { value: 'TwelveMp', label: '12 MP' },
];

/** Typical recording bitrates, offered as a starting point. The installer can
 *  type anything — codec, frame rate and scene complexity all move it. */
export const SUGGESTED_BITRATE_MBPS: Readonly<Record<CameraResolution, number | null>> = {
  Unspecified: null,
  OneMp: 1.5,
  TwoMp: 2.5,
  ThreeMp: 3,
  FourMp: 4,
  FiveMp: 5,
  SixMp: 6,
  EightMp: 8,
  TwelveMp: 12,
};

export const ITEM_TYPES: readonly Option<ItemType>[] = [
  { value: 'Product', label: 'Product' },
  { value: 'Service', label: 'Service' },
];

export const WARRANTY_UNITS: readonly Option<WarrantyUnit>[] = [
  { value: 'Day', label: 'Day' },
  { value: 'Month', label: 'Month' },
  { value: 'Year', label: 'Year' },
];

/**
 * Tax choices. `null` is "No Taxation", which is a different thing from 0% —
 * one means the question does not apply, the other is a rate deliberately set.
 */
export const TAX_OPTIONS: readonly Option<number | null>[] = [
  { value: null, label: 'No Taxation' },
  { value: 0, label: '0%' },
  { value: 5, label: '5%' },
];

export interface CameraImage {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sortOrder: number;
  /** Relative URL; goes straight into an img src. */
  url: string;
}

export interface CameraBrand {
  /** Canonical spelling written to the API when the tile is picked. */
  name: string;
  logo: string;
  /** Lowercase spellings that should resolve to this brand, `name` included.
   *  "UNV" is how Uniview is printed on the box, so both must match. */
  aliases: readonly string[];
}

/**
 * Brands with artwork on hand. Not a closed list — the brand field stays free
 * text, and anything not here simply renders as its name.
 */
export const CAMERA_BRANDS: readonly CameraBrand[] = [
  { name: 'Hikvision', logo: '/brands/hikvision.png', aliases: ['hikvision', 'hik'] },
  { name: 'Dahua', logo: '/brands/dahua.png', aliases: ['dahua', 'dahua technology'] },
  { name: 'Uniview', logo: '/brands/uniview.png', aliases: ['uniview', 'unv'] },
  { name: 'Tiandy', logo: '/brands/tiandy.png', aliases: ['tiandy'] },
];

const BRAND_BY_ALIAS = new Map<string, CameraBrand>(
  CAMERA_BRANDS.flatMap((brand) =>
    [brand.name.toLowerCase(), ...brand.aliases].map((alias) => [alias, brand] as const),
  ),
);

/** The brand a free-text value refers to, or null when it is one we have no art for. */
export function matchCameraBrand(brand: string | null | undefined): CameraBrand | null {
  return BRAND_BY_ALIAS.get((brand ?? '').trim().toLowerCase()) ?? null;
}

/** Fallback mark for an unknown brand: its first two letters. */
export function brandInitials(brand: string): string {
  return brand.trim().slice(0, 2).toUpperCase() || '?';
}

export interface CameraBrandCount {
  brand: string;
  itemCount: number;
}

export interface CameraTypeCount {
  type: CameraType;
  itemCount: number;
  unitCount: number;
}

export interface CameraSummary {
  totalLines: number;
  totalUnits: number;
  brandCount: number;
  lowStockCount: number;
  /** Rate x quantity across the whole inventory, in QAR. */
  stockValue: number;
}

export interface Camera {
  id: string;
  brand: string;
  type: CameraType;
  /** Manufacturer model number. Empty string when not recorded, never null —
   *  it forms part of the server's unique key with brand and type. */
  modelNo: string;
  itemName: string;
  category: ProductCategory;
  searchKey: string | null;
  /** The two descriptions are independent — either may be filled without the other. */
  descriptionEn: string | null;
  descriptionAr: string | null;

  supplierCost: number | null;
  margin: number | null;
  rate: number | null;
  discount: number | null;
  quantity: number;
  lowStock: number | null;
  hsnCode: string | null;
  uom: UnitOfMeasurement;
  /** null = No Taxation. */
  taxRate: number | null;
  itemType: ItemType;

  /** Recording profile — what the storage calculator sizes from. */
  resolution: CameraResolution;
  bitrateMbps: number | null;

  warrantyValue: number | null;
  warrantyUnit: WarrantyUnit | null;
  notes: string | null;

  images: CameraImage[];
  /** Server-computed: quantity has fallen to the item's own threshold. */
  isLowStock: boolean;

  createdAt: string;
  updatedAt: string | null;
}

export interface CameraListQuery {
  pageNumber?: number;
  pageSize?: number;
  /** Matches on brand or model number. */
  search?: string;
  type?: CameraType;
  category?: ProductCategory;
  /** Exact brand, from /brands. */
  brand?: string;
  lowStockOnly?: boolean;
}

/** Create and update take the same fields; the id travels in the URL. */
export interface SaveCameraRequest {
  brand: string;
  type: CameraType;
  modelNo: string;
  itemName: string;
  category: ProductCategory;
  searchKey: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;

  supplierCost: number | null;
  margin: number | null;
  rate: number | null;
  discount: number | null;
  quantity: number;
  lowStock: number | null;
  hsnCode: string | null;
  uom: UnitOfMeasurement;
  taxRate: number | null;
  itemType: ItemType;
  resolution: CameraResolution;
  bitrateMbps: number | null;

  warrantyValue: number | null;
  warrantyUnit: WarrantyUnit | null;
  notes: string | null;
}
