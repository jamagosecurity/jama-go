/**
 * The CCTV storage sizing model. Mirrors
 * Jama.Application.StorageDesigns — the calculation itself lives on the server
 * so one set of numbers answers for the quotation, the calculator and anything
 * printed later.
 */

export interface StorageCameraInput {
  label: string;
  count: number;
  bitrateMbps: number;
}

export interface StorageAnprInput {
  label: string;
  count: number;
  kilobytesPerImage: number;
  imagesPerEvent: number;
  eventsPerDay: number;
}

export interface StorageGroupInput {
  label: string;
  totalDisks: number;
  diskTerabytes: number;
}

export interface CalculateStorageRequest {
  retentionDays: number;
  redundancy: number;
  filesystemFactor: number;
  /** 5 or 6 — the number of parity disks per group is derived from it. */
  raidLevel: number;
  failoverDays: number;
  failoverCameras: number;
  cameras: StorageCameraInput[];
  anpr: StorageAnprInput[];
  groups: StorageGroupInput[];
}

export interface StorageCameraLine {
  label: string;
  count: number;
  bitrateMbps: number;
  perCameraTerabytes: number;
  terabytesRaw: number;
  bandwidthMbps: number;
}

export interface StorageAnprLine {
  label: string;
  count: number;
  perCameraTerabytes: number;
  terabytes: number;
  disksNeeded: number;
}

export interface StorageGroup {
  label: string;
  totalDisks: number;
  parityDisks: number;
  dataDisks: number;
  diskTerabytes: number;
  availableTerabytes: number;
  cameraCeiling: number;
}

export interface StorageDesign {
  retentionDays: number;
  redundancy: number;
  filesystemFactor: number;
  raidLevel: number;

  cameras: StorageCameraLine[];
  cameraCount: number;
  videoTerabytesRaw: number;
  videoTerabytes: number;
  bandwidthMbps: number;

  anpr: StorageAnprLine[];
  anprTerabytes: number;

  failoverTerabytes: number;
  requiredTerabytes: number;

  groups: StorageGroup[];
  availableTerabytes: number;
  surplusTerabytes: number;
  coveragePercent: number;
  covered: boolean;
}

export const RAID_LEVELS: readonly { value: number; label: string }[] = [
  { value: 5, label: 'RAID-5 — 1 parity disk per group' },
  { value: 6, label: 'RAID-6 — 2 parity disks per group' },
];

/** Disk sizes actually stocked, so a group is sized from something buyable. */
export const DISK_SIZES: readonly number[] = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
