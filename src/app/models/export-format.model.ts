/** The file formats a document downloads in: the same document in each. */
export type ExportFormat = 'pdf' | 'excel' | 'word';

export const EXPORT_FORMATS: ReadonlyArray<{ key: ExportFormat; label: string; ext: string }> = [
  { key: 'pdf', label: 'PDF', ext: 'pdf' },
  { key: 'excel', label: 'Excel', ext: 'xlsx' },
  { key: 'word', label: 'Word', ext: 'docx' },
];

export const exportExtension = (format: ExportFormat): string =>
  EXPORT_FORMATS.find((f) => f.key === format)?.ext ?? 'pdf';
