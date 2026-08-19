import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * The CCTV storage sizing plan, derived from
 * "DAHUA CCTV STORAGE CALCULATION -V5 (2).xlsx".
 *
 * A reference page, not a tool: it documents the calculation model, the worked
 * numbers behind each figure, and the defects found in the workbook. The
 * arithmetic shown here was verified against Dahua's Storage Selector and the
 * workbook cell by cell — G4 = 3.089905, I4 = 327.5299, H17 = 158.4, I17 = 51.
 *
 * Everything below is static content. Building the working calculator is the
 * next step, outlined in the closing section.
 */

export interface WorkedStep {
  label: string;
  working: string;
  result: string;
}

export interface ChainHop {
  op: string;
  value: string;
  unit: string;
  final?: boolean;
}

export interface ModelInput {
  symbol: string;
  name: string;
  value: string;
  origin: string;
}

export interface TopologyRow {
  nvr: string;
  group: string;
  totalDisks: number;
  parity: number;
  dataDisks: number;
  diskTb: number;
  spares: string;
  availableTb: string;
  ceiling: number;
  continuation?: boolean;
}

export interface AnprRow {
  server: string;
  group: string;
  totalDisks: number;
  dataDisks: number;
  diskTb: number;
  sheetSays: string;
  correct: string;
}

export interface Defect {
  title: string;
  detail: string;
  fix: string;
}

@Component({
  selector: 'app-storage-plan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './storage-plan.component.html',
  styleUrl: './storage-plan.component.css',
})
export class StoragePlanComponent {
  /** Dahua's own fixture: 2 MP × 100 cameras on a 120-day plan. */
  readonly chain: ChainHop[] = [
    { op: 'start', value: '2.50', unit: 'Mbps' },
    { op: '× 86 400 s', value: '216,000', unit: 'Mb per day' },
    { op: '× 120 days', value: '25,920,000', unit: 'Mb total' },
    { op: '÷ 8', value: '3,240,000', unit: 'MB — bits to bytes' },
    { op: '÷ 1024', value: '3,164.06', unit: 'GB' },
    { op: '÷ 1024', value: '3.0899', unit: 'TB per camera', final: true },
  ];

  readonly modelInputs: ModelInput[] = [
    { symbol: 'D', name: 'Retention days', value: '120', origin: 'baked into every formula' },
    { symbol: 'R', name: 'Video redundancy', value: '1.06', origin: 'H4, mislabelled' },
    { symbol: 'Φ', name: 'Filesystem factor', value: '0.90', origin: '0.9 / 90% literals' },
    { symbol: 'P', name: 'Parity disks per group', value: '1 or 2', origin: 'column D' },
    { symbol: 'Dᶠ', name: 'Failover retention days', value: '30', origin: 'the ÷4 in column J' },
  ];

  readonly projectSteps: WorkedStep[] = [
    { label: 'Per camera', working: '2.5 Mbps over 120 days', result: '3.0899 TB' },
    { label: '× cameras', working: '3.0899 × 100', result: '308.99 TB' },
    { label: '× redundancy', working: '308.99 × 1.06', result: '327.53 TB' },
    { label: 'Bandwidth', working: '2.5 × 100', result: '250.0 Mbps' },
  ];

  readonly failoverSteps: WorkedStep[] = [
    { label: 'Cameras covered', working: 'NVR-04 group ceiling', result: '9' },
    { label: 'Retention ratio', working: '30 ÷ 120 days', result: '0.250' },
    { label: 'Failover storage', working: '9 × 3.0899 × 0.250', result: '6.95 TB' },
  ];

  readonly anprSteps: WorkedStep[] = [
    { label: 'Per image', working: '500 KB — header says "Kb/s", but it is KB per image', result: '' },
    { label: 'Images per event', working: 'the undocumented leading 2 — plate crop + overview', result: '2' },
    { label: 'Raw volume', working: '2 × 500 × 7,000 × 120', result: '840,000,000 KB' },
    { label: 'To TB', working: '840,000,000 ÷ 1024³', result: '0.78231 TB' },
    { label: '× 4 cameras', working: '0.78231 × 4', result: '3.1292 TB' },
    { label: 'Usable per disk', working: '8 TB × 0.9', result: '7.2 TB' },
    { label: 'Disks needed', working: 'ceil(3.1292 ÷ 7.2)', result: '1 HDD' },
  ];

  /** Cell-for-cell from sheet "Storage calculation RAID-5", rows 11–20. */
  readonly raid5: TopologyRow[] = [
    { nvr: 'NVR-04 Bay-1', group: 'GRP-1', totalDisks: 3, parity: 1, dataDisks: 2, diskTb: 16, spares: '0', availableTb: '28.8', ceiling: 9 },
    { nvr: 'NVR-08 Bay-1', group: 'GRP-1', totalDisks: 7, parity: 1, dataDisks: 6, diskTb: 16, spares: '1', availableTb: '86.4', ceiling: 27 },
    { nvr: 'NVR-16 Bay-1', group: 'GRP-1', totalDisks: 8, parity: 1, dataDisks: 7, diskTb: 16, spares: '1', availableTb: '100.8', ceiling: 32 },
    { nvr: '', group: 'GRP-2', totalDisks: 7, parity: 1, dataDisks: 6, diskTb: 16, spares: '—', availableTb: '86.4', ceiling: 27, continuation: true },
    { nvr: 'EVS-24 Bay-1', group: 'GRP-1', totalDisks: 12, parity: 1, dataDisks: 11, diskTb: 16, spares: '1', availableTb: '158.4', ceiling: 51 },
    { nvr: '', group: 'GRP-2', totalDisks: 11, parity: 1, dataDisks: 10, diskTb: 16, spares: '—', availableTb: '144.0', ceiling: 46, continuation: true },
    { nvr: 'EVS-48 Bay-1', group: 'GRP-1', totalDisks: 12, parity: 1, dataDisks: 11, diskTb: 16, spares: '1', availableTb: '158.4', ceiling: 51 },
    { nvr: '', group: 'GRP-2', totalDisks: 12, parity: 1, dataDisks: 11, diskTb: 16, spares: '—', availableTb: '158.4', ceiling: 51, continuation: true },
    { nvr: '', group: 'GRP-3', totalDisks: 12, parity: 1, dataDisks: 11, diskTb: 16, spares: '—', availableTb: '158.4', ceiling: 51, continuation: true },
    { nvr: '', group: 'GRP-4', totalDisks: 11, parity: 1, dataDisks: 10, diskTb: 16, spares: '—', availableTb: '144.0', ceiling: 46, continuation: true },
  ];

  /** Cell-for-cell from sheet "Storage calculation RAID-6", rows 10–18. */
  readonly raid6: TopologyRow[] = [
    { nvr: 'NVR-08 Bay-1', group: 'GRP-1', totalDisks: 7, parity: 2, dataDisks: 5, diskTb: 16, spares: '1', availableTb: '72.0', ceiling: 23 },
    { nvr: 'NVR-16 Bay-1', group: 'GRP-1', totalDisks: 8, parity: 2, dataDisks: 6, diskTb: 16, spares: '1', availableTb: '86.4', ceiling: 27 },
    { nvr: '', group: 'GRP-2', totalDisks: 7, parity: 2, dataDisks: 5, diskTb: 16, spares: '—', availableTb: '72.0', ceiling: 23, continuation: true },
    { nvr: 'EVS-24 Bay-1', group: 'GRP-1', totalDisks: 12, parity: 2, dataDisks: 10, diskTb: 16, spares: '1', availableTb: '144.0', ceiling: 46 },
    { nvr: '', group: 'GRP-2', totalDisks: 11, parity: 2, dataDisks: 9, diskTb: 16, spares: '—', availableTb: '129.6', ceiling: 41, continuation: true },
    { nvr: 'EVS-48 Bay-1', group: 'GRP-1', totalDisks: 12, parity: 2, dataDisks: 10, diskTb: 16, spares: '1', availableTb: '144.0', ceiling: 46 },
    { nvr: '', group: 'GRP-2', totalDisks: 12, parity: 2, dataDisks: 10, diskTb: 16, spares: '—', availableTb: '144.0', ceiling: 46, continuation: true },
    { nvr: '', group: 'GRP-3', totalDisks: 12, parity: 2, dataDisks: 10, diskTb: 16, spares: '—', availableTb: '144.0', ceiling: 46, continuation: true },
    { nvr: '', group: 'GRP-4', totalDisks: 11, parity: 2, dataDisks: 9, diskTb: 16, spares: '—', availableTb: '129.6', ceiling: 41, continuation: true },
  ];

  /** The ANPR array, where parity is wrongly counted as usable capacity. */
  readonly anprRows: AnprRow[] = [
    { server: 'NVR5816-EI-1', group: 'GRP-1', totalDisks: 7, dataDisks: 6, diskTb: 8, sheetSays: '50.4', correct: '43.2' },
    { server: 'NVR5832-EI-2', group: 'GRP-1', totalDisks: 7, dataDisks: 6, diskTb: 8, sheetSays: '50.4', correct: '43.2' },
    { server: 'NVR5064-EI-3', group: 'GRP-1', totalDisks: 7, dataDisks: 6, diskTb: 8, sheetSays: '50.4', correct: '43.2' },
    { server: '', group: 'GRP-2', totalDisks: 8, dataDisks: 7, diskTb: 8, sheetSays: '57.6', correct: '50.4' },
  ];

  readonly defects: Defect[] = [
    {
      title: 'Retention days is hardcoded inside every formula',
      detail:
        'E4*60*60*24*120/8/1024/1024. The "120 days" in the title is rich text, so editing it changes nothing. A 90-day project means hand-editing every formula on both sheets.',
      fix: 'Retention becomes one input driving all five blocks',
    },
    {
      title: 'The ANPR block counts parity disks as usable capacity',
      detail:
        'The main table uses E×C×0.9, where C is disks after parity. The ANPR table uses F×E×90%, where F is total disks. Every ANPR group is overstated by a full disk — 28.8 TB across the array.',
      fix: 'One capacity function, parity subtracted everywhere',
    },
    {
      title: 'Labels describe the wrong quantity',
      detail:
        'H4 "Capacity loss due to formatting" is really the video redundancy factor. I10 "Max Cameras Allocated" is a capacity ceiling, not an allocation — and its column sums to 391 on a 100-camera job.',
      fix: 'Renamed, plus a coverage % that answers the real question',
    },
    {
      title: 'Magic numbers with no explanation',
      detail:
        'The ÷4 in failover silently means 30 days. The leading 2 in the ANPR snapshot formula silently means two images per event. Neither is written down anywhere in the workbook.',
      fix: 'Both promoted to named, editable inputs',
    },
    {
      title: 'Three inputs that feed nothing',
      detail:
        'Encoding Mode, Recording Resolution and Frame Rate connect to no formula at all. Bitrate — the value they should determine — is typed in by hand.',
      fix: 'A resolution × codec × fps table suggests the bitrate, still overridable',
    },
    {
      title: 'No validation anywhere',
      detail:
        'Nothing stops an "NVR-04 Bay" row holding 12 disks, and nothing checks that available capacity actually covers what the cameras need.',
      fix: 'Bay-count and parity checks, plus a pass/fail coverage verdict',
    },
    {
      title: 'Copy-paste drift between the two sheets',
      detail:
        'Sheet 2 is RAID-6, but row A32 still reads "RAID-5 & STORAGE TOPOLOGY CALCULATION", and H33 = SUM(H32:I32) reaches into an empty column I.',
      fix: 'RAID level becomes a dropdown — one sheet, not two',
    },
  ];
}
