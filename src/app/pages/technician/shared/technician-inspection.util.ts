import {
  AnprConfiguration,
  KpoiDetail,
  NetworkDetail,
  TechnicianInspection,
  UpsGeneralDetail,
  VmsDetail,
} from '../../../models/technician.model';

export function networkText(source: NetworkDetail | null | undefined): string {
  if (!source) return '';
  if (source.networkRemarks?.trim()) return source.networkRemarks.trim();

  const parts = [
    joinParts('Switch', source.switchBrand, source.switchModel),
    joinParts('Router', source.routerBrand, source.routerModel),
    source.firewall?.trim() ? `Firewall: ${source.firewall.trim()}` : '',
    source.rackDetails?.trim() ? `Rack: ${source.rackDetails.trim()}` : '',
  ].filter(Boolean);

  return parts.join('\n');
}

export function vmsText(source: VmsDetail | null | undefined): string {
  if (!source) return '';
  if (source.remarks?.trim()) return source.remarks.trim();

  const parts = [
    joinParts('VMS', source.vmsName, source.version),
    source.licenseDetails?.trim() ? `License: ${source.licenseDetails.trim()}` : '',
    source.serverDetails?.trim() ? `Server: ${source.serverDetails.trim()}` : '',
    source.healthStatus?.trim() ? `Health: ${source.healthStatus.trim()}` : '',
  ].filter(Boolean);

  return parts.join('\n');
}

export function upsGeneralText(source: UpsGeneralDetail | null | undefined): string {
  if (!source) return '';
  if (source.generalRemarks?.trim()) return source.generalRemarks.trim();

  const parts = [
    joinParts('UPS', source.upsBrand, source.upsCapacity),
    source.batteryStatus?.trim() ? `Battery: ${source.batteryStatus.trim()}` : '',
    source.generatorAvailable
      ? `Generator: Yes${source.generatorDetails?.trim() ? ` (${source.generatorDetails.trim()})` : ''}`
      : '',
  ].filter(Boolean);

  return parts.join('\n');
}

export function anprText(source: AnprConfiguration | null | undefined): string {
  if (!source) return '';
  if (source.configuration?.trim()) return source.configuration.trim();
  if (source.remarks?.trim()) return source.remarks.trim();

  const parts = [
    `Installed: ${source.anprInstalled ? 'Yes' : 'No'}`,
    source.softwareVersion?.trim() ? `Software: ${source.softwareVersion.trim()}` : '',
    source.cameraDetails?.trim() ? `Cameras: ${source.cameraDetails.trim()}` : '',
  ].filter(Boolean);

  return parts.join('\n');
}

export function kpoiText(source: KpoiDetail | null | undefined): string {
  return source?.details?.trim() ?? '';
}

export function inspectionHasKeyInfo(inspection: TechnicianInspection): boolean {
  return (
    inspection.cameras.length > 0 ||
    !!networkText(inspection.network) ||
    !!vmsText(inspection.vms) ||
    !!upsGeneralText(inspection.upsGeneral) ||
    !!anprText(inspection.anpr) ||
    !!kpoiText(inspection.kpoi)
  );
}

function joinParts(label: string, ...values: (string | null | undefined)[]): string {
  const text = values
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' ');
  return text ? `${label}: ${text}` : '';
}
