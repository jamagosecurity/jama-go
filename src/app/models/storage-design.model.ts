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
  /** 1, 5 or 6 — or null to weigh all three and take the cheapest per array. */
  raidLevel: number | null;
  failoverDays: number;
  failoverCameras: number;
  /** Pin the RECORDING disk, or null to let the server pick the best. */
  recommendDiskTerabytes: number | null;
  /** Pin the ANPR disk, chosen separately — the two arrays hold very different
   *  amounts, so the right disk for one is rarely right for the other. */
  anprDiskTerabytes: number | null;
  /** Disks that can actually be ordered, with prices where known. Cost is the
   *  only measure that trades "more small disks" against "fewer large ones". */
  candidateDisks: DiskCandidate[];
  /** What one enclosure costs. Charged per RAID group, because the group count
   *  moves with the disk size — leaving it out picks the wrong disk. */
  enclosurePricePerGroup: number | null;
  /** Drive bays per enclosure — the cap on how large one RAID group can get. */
  baysPerGroup: number;
  /** Standby disks for the whole array. Global — one spare covers every group
   *  on the controller, so two groups do not need two spares. */
  hotSpareDisks: number;
  /** MOI submission columns. Codec and FPS are descriptive; motion scales the
   *  footage — 50% motion-triggered recording stores half as much. */
  recordingCodec: string;
  fps: number;
  motionPercent: number;
  hddType: string;
  cameras: StorageCameraInput[];
  anpr: StorageAnprInput[];
  groups: StorageGroupInput[];
}

/** What the MOI sheet needs beyond the calculation: who it is for, and the
 *  recorder the quotation prices. */
export interface StorageSheetPdfRequest {
  projectName: string | null;
  revisionNo: string;
  recorderLabel: string | null;
  recorderChannels: number;
  design: CalculateStorageRequest;
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

/**
 * The array a requirement needs — disks and groups as an ANSWER, not something
 * typed in and graded. Sizing a job asks "how many disks do I buy?", which the
 * coverage percentage never answered.
 */
/** One RAID set, as it will actually be built. */
/** One disk size weighed up, so the choice is visible rather than asserted. */
/** A disk on offer: its size, and what one costs if we know. */
export interface DiskCandidate {
  terabytes: number;
  pricePerDisk: number | null;
}

export interface StorageDiskOption {
  diskTerabytes: number;
  totalDisks: number;
  groups: number;
  usableTerabytes: number;
  rawTerabytes: number;
  /** Usable capacity beyond what was needed. */
  overBuyTerabytes: number;
  /** What the disks alone cost. */
  diskCost: number | null;
  /** What the enclosures cost — one per RAID group. */
  enclosureCost: number | null;
  /** Disks plus enclosures. */
  totalCost: number | null;
  /** True for the one the server picked. */
  chosen: boolean;
}

/** What a single combined array would cost, when that is cheaper. */
export interface StorageSharedOption {
  totalDisks: number;
  groups: number;
  diskTerabytes: number;
  usableTerabytes: number;
  disksSaved: number;
  costSaved: number | null;
}

export interface StorageGroupLayout {
  number: number;
  dataDisks: number;
  parityDisks: number;
  totalDisks: number;
  /** MOI "Available storage" — data disks after the filesystem factor. */
  availableTerabytes: number;
  /** MOI "Proposed Storage" — data disks at label size. Parity and hot spares
   *  are added once at the summary, as "including RAID + Hotspare". */
  proposedTerabytes: number;
}

export interface StorageRecommendation {
  /** The level THIS array is built at. Per array, not per design: the two are
   *  weighed separately and routinely land on different levels. */
  raidLevel: number;
  dataDisks: number;
  parityDisks: number;
  /** Standby disks — racked, holding nothing until a member fails. */
  hotSpareDisks: number;
  /** Disks actually purchased — data, parity and hot spares. */
  totalDisks: number;
  groups: number;
  /** Members per RAID set, hot spares excluded. */
  disksPerGroup: number;
  baysPerGroup: number;
  diskTerabytes: number;
  /** Every disk at label size, before parity, spares or formatting. */
  rawTerabytes: number;
  usableTerabytes: number;
  /** Usable minus required. */
  spareTerabytes: number;
  /** Days the array actually holds — disks are bought whole, so this exceeds
   *  the days asked for. */
  retentionDaysAchieved: number;
  /** The groups one by one, so the split is shown rather than averaged. */
  layout: StorageGroupLayout[];
}

export interface StorageDesign {
  retentionDays: number;
  redundancy: number;
  filesystemFactor: number;
  raidLevel: number;

  // MOI submission columns. Codec and FPS explain how the bitrate was arrived
  // at; motion is applied to the footage, not decorative.
  recordingCodec: string;
  fps: number;
  motionPercent: number;
  hddType: string;

  cameras: StorageCameraLine[];
  cameraCount: number;
  videoTerabytesRaw: number;
  videoTerabytes: number;
  bandwidthMbps: number;

  anpr: StorageAnprLine[];
  anprTerabytes: number;

  failoverTerabytes: number;
  requiredTerabytes: number;

  /** The recording array — video plus failover, sized without the ANPR stills. */
  recommended: StorageRecommendation;
  /** A separate array for number-plate stills. All zeros when there are none. */
  recommendedAnpr: StorageRecommendation;
  /** Capacity the recording array must hold. */
  videoRequiredTerabytes: number;
  /** Capacity the ANPR array must hold. */
  anprRequiredTerabytes: number;
  /** Every disk size weighed up for the recording array, best first. */
  diskOptions: StorageDiskOption[];
  /** The same comparison for the ANPR array. Empty when there is none. */
  anprDiskOptions: StorageDiskOption[];
  /** One array holding both, when separating costs more than it is worth. */
  sharedAlternative: StorageSharedOption | null;

  groups: StorageGroup[];
  availableTerabytes: number;
  surplusTerabytes: number;
  coveragePercent: number;
  covered: boolean;
}

export const RAID_LEVELS: readonly { value: number; label: string }[] = [
  // RAID-1 first: on a small job it is the right answer and the other two force
  // a 3- or 4-disk minimum on a requirement that fits a single disk.
  { value: 1, label: 'RAID-1 — mirrored pair' },
  { value: 5, label: 'RAID-5 — 1 parity disk per group' },
  { value: 6, label: 'RAID-6 — 2 parity disks per group' },
];

/** Disk sizes actually stocked, so a group is sized from something buyable. */
export const DISK_SIZES: readonly number[] = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

/**
 * Drive bays enclosures are actually built with.
 *
 * A list rather than a free number, because the figure is not a preference — it
 * is how many slots the chassis has. Typing an arbitrary one silently wrecks the
 * design: 3 bays leaves 2 data disks per RAID-5 group, so a job needing 9 data
 * disks lands on 5 groups and 5 parity disks instead of 1 and 1. Same footage,
 * five more disks, and nothing on screen said why.
 */
export const BAY_OPTIONS: readonly number[] = [4, 6, 8, 12, 16, 24, 36];
