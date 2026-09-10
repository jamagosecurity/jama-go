import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { Camera, matchCameraBrand } from '../../models/camera.model';
import {
  QUOTATION_STATUSES,
  Quotation,
  QuotationStatus,
  SaveQuotationLine,
  SaveQuotationRequest,
  lineTotalOf,
  quotationTotalsOf,
} from '../../models/quotation.model';
import { CameraService } from '../../services/camera.service';
import { QuotationService } from '../../services/quotation.service';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { downloadBlob } from '../../utils/download.util';
import { fieldErrorMessage, shouldShowError } from '../../utils/form-validators.util';
import { quotationShareMessage, whatsAppShareUrl } from '../../utils/share.util';

/** A quote line while it is being edited. */
interface EditableLine extends SaveQuotationLine {
  /** Stable key for @for tracking — the server ids only exist after a save. */
  key: string;
}

@Component({
  selector: 'app-quotation-editor',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quotation-editor.component.html',
  styleUrl: './quotations.css',
})
export class QuotationEditorComponent implements OnInit {
  private readonly service = inject(QuotationService);
  private readonly cameras = inject(CameraService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = QUOTATION_STATUSES;
  protected readonly brandLogo = matchCameraBrand;

  protected readonly quotation = signal<Quotation | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly downloading = signal(false);
  protected readonly formError = signal('');

  protected readonly lines = signal<EditableLine[]>([]);

  /** The lump sum given off the finished quote, in QAR. Kept as a signal rather
   *  than a form control so the totals recompute as it is typed. */
  protected readonly specialDiscount = signal(0);

  /** Catalogue search for the item picker. */
  protected readonly pickerControl = new FormControl('', { nonNullable: true });
  protected readonly pickerResults = signal<Camera[]>([]);
  protected readonly pickerBusy = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    customerName: ['', [Validators.required, Validators.maxLength(200)]],
    customerCompany: ['', [Validators.maxLength(200)]],
    customerEmail: ['', [Validators.email, Validators.maxLength(256)]],
    customerPhone: ['', [Validators.maxLength(40)]],
    customerAddress: ['', [Validators.maxLength(500)]],
    issueDate: [this.today(), Validators.required],
    validUntil: [this.inDays(30)],
    status: this.formBuilder.nonNullable.control<QuotationStatus>('Draft', Validators.required),
    notes: ['', [Validators.maxLength(2000)]],
    terms: ['Prices are in QAR and valid until the date shown.', [Validators.maxLength(2000)]],
  });

  protected readonly isEditing = computed(() => this.quotation() !== null);

  /** Mirrors the server's arithmetic so the figures move as the user types. The
   *  server recomputes on save and its answer is what gets stored. */
  protected readonly totals = computed(() =>
    quotationTotalsOf(this.lines(), this.specialDiscount()),
  );
  protected readonly lineTotal = lineTotalOf;

  /** A discount bigger than the quote is a mistyped figure, not an offer — the
   *  server rejects it, so the editor says so before the save is attempted. */
  protected readonly discountTooLarge = computed(
    () => this.specialDiscount() > this.totals().totalBeforeDiscount,
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') this.loadQuotation(id);

    this.pickerControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.searchCatalogue(term));

    // Seed the picker so the panel opens with stock already listed rather than
    // an empty box the user has to guess at.
    this.searchCatalogue('');
  }

  private loadQuotation(id: string): void {
    this.loading.set(true);
    this.service
      .getById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (quote) => {
          this.quotation.set(quote);
          this.form.reset({
            customerName: quote.customerName,
            customerCompany: quote.customerCompany ?? '',
            customerEmail: quote.customerEmail ?? '',
            customerPhone: quote.customerPhone ?? '',
            customerAddress: quote.customerAddress ?? '',
            issueDate: quote.issueDate,
            validUntil: quote.validUntil ?? '',
            status: quote.status,
            notes: quote.notes ?? '',
            terms: quote.terms ?? '',
          });
          this.specialDiscount.set(quote.specialDiscount);
          this.lines.set(
            quote.lines.map((line, index) => ({
              key: `saved-${line.id}-${index}`,
              cameraId: line.cameraId,
              itemName: line.itemName,
              modelNo: line.modelNo,
              brand: line.brand,
              description: line.description,
              quantity: line.quantity,
              unitRate: line.unitRate,
              discountPercent: line.discountPercent,
              taxPercent: line.taxPercent,
            })),
          );
        },
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to load the quotation.')),
      });
  }

  private searchCatalogue(term: string): void {
    this.pickerBusy.set(true);
    this.cameras
      .list({ pageNumber: 1, pageSize: 8, search: term.trim() || undefined })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pickerBusy.set(false)),
      )
      .subscribe({
        next: (page) => this.pickerResults.set(page.items),
        error: () => this.pickerResults.set([]),
      });
  }

  // ===== Lines =====

  /**
   * Adds a catalogue item as a line, copying its name, model, brand, price and
   * tax across. From here the line is independent: repricing the stock item does
   * not reach back into a quote already written.
   */
  protected addFromCatalogue(item: Camera): void {
    const existing = this.lines().findIndex((line) => line.cameraId === item.id);
    if (existing >= 0) {
      // Already on the quote — bump the quantity rather than adding a duplicate row.
      this.updateLine(existing, 'quantity', this.lines()[existing].quantity + 1);
      return;
    }

    this.lines.update((current) => [
      ...current,
      {
        key: `cat-${item.id}-${Date.now()}`,
        cameraId: item.id,
        itemName: item.itemName,
        modelNo: item.modelNo || null,
        brand: item.brand,
        description: item.descriptionEn,
        quantity: 1,
        unitRate: item.rate ?? 0,
        discountPercent: item.discount ?? 0,
        taxPercent: item.taxRate ?? 0,
      },
    ]);
  }

  /** A line for something not in the catalogue — labour, delivery, a one-off. */
  protected addBlankLine(): void {
    this.lines.update((current) => [
      ...current,
      {
        key: `free-${Date.now()}-${current.length}`,
        cameraId: null,
        itemName: '',
        modelNo: null,
        brand: null,
        description: null,
        quantity: 1,
        unitRate: 0,
        discountPercent: 0,
        taxPercent: 0,
      },
    ]);
  }

  protected removeLine(index: number): void {
    this.lines.update((current) => current.filter((_, i) => i !== index));
  }

  protected moveLine(index: number, delta: number): void {
    const next = index + delta;
    this.lines.update((current) => {
      if (next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  protected updateLine(index: number, field: keyof SaveQuotationLine, value: unknown): void {
    this.lines.update((current) =>
      current.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  }

  protected onLineInput(index: number, field: keyof SaveQuotationLine, event: Event): void {
    const input = event.target as HTMLInputElement;
    const numeric: (keyof SaveQuotationLine)[] = [
      'quantity',
      'unitRate',
      'discountPercent',
      'taxPercent',
    ];

    if (numeric.includes(field)) {
      // A cleared box reads as 0 rather than NaN, which would poison every total.
      const parsed = Number(input.value);
      this.updateLine(index, field, Number.isFinite(parsed) ? parsed : 0);
      return;
    }

    this.updateLine(index, field, input.value);
  }

  /** The discount box. A cleared or nonsense value reads as no discount rather
   *  than NaN, which would wipe out the total below it. */
  protected onDiscountInput(event: Event): void {
    const parsed = Number((event.target as HTMLInputElement).value);
    this.specialDiscount.set(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
  }

  // ===== Save =====

  protected save(event: Event): void {
    event.preventDefault();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.lines().length) {
      this.formError.set('Add at least one line to the quotation.');
      return;
    }

    if (this.lines().some((line) => !line.itemName.trim())) {
      this.formError.set('Every line needs an item name.');
      return;
    }

    if (this.discountTooLarge()) {
      this.formError.set('Discount cannot be more than the quotation total.');
      return;
    }

    const raw = this.form.getRawValue();
    const request: SaveQuotationRequest = {
      customerName: raw.customerName.trim(),
      customerCompany: raw.customerCompany.trim() || null,
      customerEmail: raw.customerEmail.trim() || null,
      customerPhone: raw.customerPhone.trim() || null,
      customerAddress: raw.customerAddress.trim() || null,
      issueDate: raw.issueDate,
      validUntil: raw.validUntil || null,
      status: raw.status,
      notes: raw.notes.trim() || null,
      terms: raw.terms.trim() || null,
      specialDiscount: this.specialDiscount(),
      lines: this.lines().map(({ key, ...line }) => ({ ...line, itemName: line.itemName.trim() })),
    };

    const existing = this.quotation();
    const save$ = existing
      ? this.service.update(existing.id, request)
      : this.service.create(request);

    this.saving.set(true);
    this.formError.set('');

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (saved) => {
          this.quotation.set(saved);
          // Taken back from the response, not left as typed: the server has the
          // last word on the discount it stored.
          this.specialDiscount.set(saved.specialDiscount);
          // A new quote has just been given its number and id, so move the URL
          // onto it — a refresh or a back button must not land on /new again.
          if (!existing) void this.router.navigate(['/quotations', saved.id]);
        },
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to save the quotation.')),
      });
  }

  protected download(): void {
    const quote = this.quotation();
    if (!quote) return;

    this.downloading.set(true);
    this.formError.set('');

    this.service
      .downloadPdf(quote.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.downloading.set(false)),
      )
      .subscribe({
        next: (blob) => downloadBlob(blob, `${quote.quoteNumber}.pdf`),
        error: (err: unknown) =>
          this.formError.set(getApiErrorMessage(err, 'Unable to download the PDF.')),
      });
  }

  /** Downloads the PDF, then opens WhatsApp with the covering message ready —
   *  wa.me cannot carry a file, so the sender attaches the download by hand. */
  protected shareWhatsApp(): void {
    const quote = this.quotation();
    if (!quote) return;

    this.download();
    window.open(
      whatsAppShareUrl(quote.customerPhone, quotationShareMessage(quote)),
      '_blank',
      'noopener,noreferrer',
    );
  }

  // ===== Helpers =====

  protected showError(field: string): boolean {
    return shouldShowError(this.form.get(field));
  }

  protected errorFor(field: string, label: string): string {
    return fieldErrorMessage(this.form.get(field), label);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private inDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
