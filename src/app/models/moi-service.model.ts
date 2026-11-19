import { MaintenanceCategory } from './maintenance.model';

/** MOI price-list categories are whatever the team creates; shown as typed, "Other" last. */
export function moiCategoryLabel(category: MaintenanceCategory): string {
  return category;
}

export function moiCategoryOptions(listed: Iterable<MaintenanceCategory> = []): { value: MaintenanceCategory; label: string }[] {
  const seen = new Set<string>();
  const out: { value: MaintenanceCategory; label: string }[] = [];
  for (const c of listed) {
    if (c && !seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); out.push({ value: c, label: c }); }
  }
  return out.sort((a, b) => (a.value.toLowerCase() === 'other' ? 1 : b.value.toLowerCase() === 'other' ? -1 : a.label.localeCompare(b.label)));
}
