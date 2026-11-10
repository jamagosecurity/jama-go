import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import {
  MaintenanceCategory,
  MaintenanceImage,
  MaintenanceIssueOption,
  MaintenanceLine,
  MaintenanceLineInput,
  maintenanceCategoryOptions,
} from '../../../models/maintenance.model';

/** Mirrors MaintenanceIssueCatalogue.StandardFee on the API — the price of any
 *  issue the catalogue does not list. */
const STANDARD_FEE = 250;

export interface ChecklistLine {
  category: MaintenanceCategory;
  issueType: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  quantity: number;
  unitFee: number;
  catalogueFee: number;
}

interface ChecklistRow {
  issueType: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  defaultFee: number;
  images: MaintenanceImage[];
  /** Set when this issue is ticked. */
  line: ChecklistLine | null;
}

export function toChecklistLines(lines: MaintenanceLine[]): ChecklistLine[] {
  return lines.map(({ category, issueType, descriptionEn, descriptionAr, quantity, unitFee, catalogueFee }) => ({
    category,
    issueType,
    descriptionEn,
    descriptionAr,
    quantity,
    unitFee,
    catalogueFee,
  }));
}

/** What Create/Update send. The fee goes only when it may be honoured — the
 *  server ignores it otherwise, but there is no reason to send it. */
export function toLineInputs(lines: ChecklistLine[], canSetFee: boolean): MaintenanceLineInput[] {
  return lines.map((l) => ({
    category: l.category,
    issueType: l.issueType,
    quantity: l.quantity,
    unitFee: canSetFee ? l.unitFee : null,
  }));
}

export function checklistSubtotal(lines: ChecklistLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.unitFee, 0);
}

const keyOf = (category: MaintenanceCategory, issueType: string) =>
  `${category}|${issueType.trim().toLowerCase()}`;

const readInput = (event: Event) => (event.target as HTMLInputElement).value.trim();

/**
 * The ticket's issues, laid out the way a quotation is: one numbered section
 * per category, every known issue listed with a tick box, its price and a
 * line total, then the subtotal, discount and amount payable at the end.
 *
 * "Other" has no listed issues, so its section takes a typed one instead.
 * Read-only mode (a closed ticket, or anyone without maintenance.manage
 * looking at one) shows only what was ticked.
 */
@Component({
  selector: 'app-maintenance-checklist',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './maintenance-checklist.component.html',
  styleUrl: './maintenance-checklist.component.css',
})
export class MaintenanceChecklistComponent {
  readonly catalogue = input<MaintenanceIssueOption[]>([]);
  /** maintenance.manage: prices and the discount become editable. */
  readonly canSetFee = input(false);
  readonly readonly = input(false);

  readonly lines = model<ChecklistLine[]>([]);
  readonly discount = model(0);

  protected readonly customDraft = signal('');

  protected readonly sections = computed(() => {
    const lines = this.lines();
    const catalogue = this.catalogue();
    const readonly = this.readonly();

    // The six built-ins plus any section admin has added, whether it is on the
    // price list or only on a ticket written before its last service was removed.
    const sections = maintenanceCategoryOptions([
      ...catalogue.map((o) => o.category),
      ...lines.map((l) => l.category),
    ]);

    return sections.map((category, index) => {
      const presets = catalogue.filter((o) => o.category === category.value);
      const presetKeys = new Set(presets.map((p) => keyOf(p.category, p.issueType)));
      const byKey = new Map(lines.map((l) => [keyOf(l.category, l.issueType), l]));

      const rows: ChecklistRow[] = [
        ...presets.map((p) => {
          const line = byKey.get(keyOf(p.category, p.issueType)) ?? null;
          // A ticked line shows what it was written with; an unticked one
          // shows the price list as it stands.
          return {
            issueType: p.issueType,
            descriptionEn: line ? line.descriptionEn : p.descriptionEn,
            descriptionAr: line ? line.descriptionAr : p.descriptionAr,
            defaultFee: p.defaultFee,
            images: p.images,
            line,
          };
        }),
        // Typed issues, and any line the catalogue no longer lists.
        ...lines
          .filter((l) => l.category === category.value && !presetKeys.has(keyOf(l.category, l.issueType)))
          .map((l) => ({
            issueType: l.issueType,
            descriptionEn: l.descriptionEn,
            descriptionAr: l.descriptionAr,
            defaultFee: l.catalogueFee,
            images: [],
            line: l,
          })),
      ];

      const ticked = rows.filter((r) => r.line);
      return {
        no: index + 1,
        category: category.value,
        title: category.label,
        rows: readonly ? ticked : rows,
        tickedCount: ticked.length,
        total: ticked.reduce((sum, r) => sum + r.line!.quantity * r.line!.unitFee, 0),
        takesTypedIssue: category.value === 'Other' && !readonly,
      };
    }).filter((s) => !readonly || s.tickedCount > 0);
  });

  protected readonly subtotal = computed(() => checklistSubtotal(this.lines()));
  protected readonly discountTooLarge = computed(() => this.discount() > this.subtotal());
  protected readonly payable = computed(() => Math.max(0, this.subtotal() - this.discount()));

  protected toggle(category: MaintenanceCategory, row: ChecklistRow): void {
    if (this.readonly()) return;
    if (row.line) {
      const remove = row.line;
      this.lines.update((lines) => lines.filter((l) => l !== remove));
      return;
    }
    this.lines.update((lines) => [
      ...lines,
      {
        category,
        issueType: row.issueType,
        descriptionEn: row.descriptionEn,
        descriptionAr: row.descriptionAr,
        quantity: 1,
        unitFee: row.defaultFee,
        catalogueFee: row.defaultFee,
      },
    ]);
  }

  // An empty or half-typed box is left alone rather than snapped back to a
  // number — clearing "5" to type "3" must not land on "13" — and the box is
  // put back to the line's real value when focus leaves it (restoreInput).

  protected onQuantityInput(line: ChecklistLine, event: Event): void {
    const raw = Math.floor(Number(readInput(event)));
    if (readInput(event) === '' || !Number.isFinite(raw) || raw < 1) return;
    this.replace(line, { ...line, quantity: Math.min(raw, 999) });
  }

  protected onFeeInput(line: ChecklistLine, event: Event): void {
    const raw = Number(readInput(event));
    if (readInput(event) === '' || !Number.isFinite(raw) || raw < 0) return;
    this.replace(line, { ...line, unitFee: raw });
  }

  protected restoreInput(event: Event, value: number): void {
    (event.target as HTMLInputElement).value = String(value);
  }

  protected resetFee(line: ChecklistLine): void {
    this.replace(line, { ...line, unitFee: line.catalogueFee });
  }

  /** Compared in fils, so 57 and 57.000000001 are not a "repriced" line. */
  protected isRepriced(line: ChecklistLine): boolean {
    return Math.round(line.unitFee * 100) !== Math.round(line.catalogueFee * 100);
  }

  protected addTypedIssue(category: MaintenanceCategory): void {
    const issueType = this.customDraft().trim();
    if (!issueType) return;

    const key = keyOf(category, issueType);
    if (!this.lines().some((l) => keyOf(l.category, l.issueType) === key)) {
      // Priced the way the server will price it: the catalogue's figure if the
      // typed name matches a listed issue anywhere, the standard fee if not.
      const listed = this.catalogue().find((o) => o.issueType.toLowerCase() === issueType.toLowerCase());
      const fee = listed?.defaultFee ?? STANDARD_FEE;
      this.lines.update((lines) => [
        ...lines,
        {
          category,
          issueType,
          descriptionEn: listed?.descriptionEn ?? null,
          descriptionAr: listed?.descriptionAr ?? null,
          quantity: 1,
          unitFee: fee,
          catalogueFee: fee,
        },
      ]);
    }
    this.customDraft.set('');
  }

  protected onDiscountInput(event: Event): void {
    const text = readInput(event);
    const raw = Number(text);
    // An emptied discount box means no discount.
    if (text === '') this.discount.set(0);
    else if (Number.isFinite(raw) && raw >= 0) this.discount.set(raw);
  }

  private replace(previous: ChecklistLine, next: ChecklistLine): void {
    this.lines.update((lines) => lines.map((l) => (l === previous ? next : l)));
  }
}
