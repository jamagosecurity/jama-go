import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { PdfPreviewComponent } from '../../../components/pdf-preview/pdf-preview.component';
import { EXPORT_FORMATS } from '../../../models/export-format.model';
import { ProformaCustomer, ProformaFileFormat, ProformaSheet } from '../../../models/proforma.model';
import { ProformaService } from '../../../services/proforma.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { downloadBlob } from '../../../utils/download.util';

/** A failed blob request carries its JSON error as a Blob; read it so the message can be shown. */
async function blobErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
    try {
      const body = JSON.parse(await error.error.text());
      return getApiErrorMessage(new HttpErrorResponse({ error: body, status: error.status }), fallback);
    } catch { /* not JSON */ }
  }
  return getApiErrorMessage(error, fallback);
}

type CustomerField = 'name' | 'project' | 'contactNumber' | 'location';

/**
 * A quotation opened as its proforma invoice, laid out like the printed one. The customer details come from the
 * quotation and can be typed over right on the invoice, for this proforma only; the client's P.O. is typed into the
 * notes line. Preview shows the PDF without saving; Download saves and gives an approved quotation its PI number.
 */
@Component({
  selector: 'app-proforma-sheet',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, PdfPreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './proforma-sheet.component.html',
  styleUrl: './proforma-sheet.component.css',
})
export class ProformaSheetComponent implements OnInit {
  private readonly api = inject(ProformaService);
  private readonly route = inject(ActivatedRoute);

  protected readonly sheet = signal<ProformaSheet | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly flash = signal('');
  protected readonly busy = signal(false);
  protected readonly previewPdf = signal<Blob | null>(null);
  /** The format being downloaded right now, if any. */
  protected readonly downloading = signal<ProformaFileFormat | null>(null);

  protected readonly formats = EXPORT_FORMATS;

  // What is typed on the invoice.
  protected readonly customer = signal<ProformaCustomer>({ name: '', project: '', contactNumber: '', location: '' });
  protected readonly poNumber = signal('');
  protected readonly poDate = signal('');

  /** The customer box, in the printed order. */
  protected readonly fields: ReadonlyArray<{ key: CustomerField; label: string; max: number }> = [
    { key: 'name', label: 'Name', max: 200 },
    { key: 'project', label: 'Project', max: 200 },
    { key: 'contactNumber', label: 'Contact Number', max: 40 },
    { key: 'location', label: 'Location', max: 200 },
  ];

  protected readonly canEdit = computed(() => this.sheet()?.status === 'Approved');

  /** Something typed differs from what is saved (and would print). */
  protected readonly unsaved = computed(() => {
    const s = this.sheet();
    if (!s || !this.canEdit()) return false;
    const d = s.document;
    const c = this.customer();
    const same = (typed: string, printed: string | null, quotation: string | null) =>
      (typed.trim() || (quotation ?? '').trim()) === (printed ?? '').trim();
    return !same(c.name, d.clientName, s.quotation.name)
      || !same(c.project, d.projectName, s.quotation.project)
      || !same(c.contactNumber, d.contactNumber, s.quotation.contactNumber)
      || !same(c.location, d.location, s.quotation.location)
      || this.poNumber().trim() !== (d.poNumber ?? '')
      || (this.poNumber().trim() ? this.poDate() : '') !== (d.poNumber ? d.poDate ?? '' : '');
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(switchMap((params) => {
        this.loading.set(true);
        return this.api.sheet(params.get('id') ?? '').pipe(finalize(() => this.loading.set(false)));
      }))
      .subscribe({
        next: (sheet) => this.show(sheet),
        error: (e) => this.error.set(getApiErrorMessage(e, 'Could not open the quotation.')),
      });
  }

  protected setCustomer(field: CustomerField, value: string): void {
    this.customer.update((c) => ({ ...c, [field]: value }));
  }

  /** The quotation's own value of a customer detail. */
  protected original(field: CustomerField): string {
    return this.sheet()?.quotation[field] ?? '';
  }

  protected changed(field: CustomerField): boolean {
    const typed = this.customer()[field].trim();
    return typed !== '' && typed !== this.original(field).trim();
  }

  protected undo(field: CustomerField): void {
    this.setCustomer(field, this.original(field));
  }

  protected preview(): void {
    const s = this.sheet();
    if (!s || this.busy() || !this.checkPo()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.preview(s.boqId, this.poNumber(), this.poDate(), this.customer()).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (blob) => this.previewPdf.set(blob),
      error: async (e) => this.error.set(await blobErrorMessage(e, 'Could not show the preview.')),
    });
  }

  /**
   * Approved: save what was typed (the PI number is given the first time), then download in the chosen format.
   * Otherwise: the draft, as it is.
   */
  protected download(format: ProformaFileFormat = 'pdf'): void {
    const s = this.sheet();
    if (!s || this.busy() || !this.checkPo()) return;
    const ext = this.formats.find((f) => f.key === format)?.ext ?? 'pdf';
    this.previewPdf.set(null);
    this.error.set('');
    this.flash.set('');
    this.busy.set(true);
    this.downloading.set(format);

    if (!this.canEdit()) {
      this.fetchFile(s.boqId, format, `Proforma-DRAFT-${s.document.quoteNumber.split(' ')[0]}.${ext}`);
      return;
    }

    this.api.save(s.boqId, this.poNumber(), this.poDate(), this.customer())
      .pipe(switchMap(() => this.api.sheet(s.boqId)))
      .subscribe({
        next: (fresh) => {
          this.show(fresh);
          this.fetchFile(fresh.boqId, format, `${fresh.document.number}.${ext}`);
        },
        error: (e) => {
          this.busy.set(false);
          this.downloading.set(null);
          this.error.set(getApiErrorMessage(e, 'Could not save the proforma.'));
        },
      });
  }

  private fetchFile(boqId: string, format: ProformaFileFormat, fileName: string): void {
    this.api.file(boqId, format).pipe(finalize(() => {
      this.busy.set(false);
      this.downloading.set(null);
    })).subscribe({
      next: (blob) => {
        downloadBlob(blob, fileName);
        this.flash.set(`Downloaded ${fileName}`);
      },
      error: async (e) => this.error.set(await blobErrorMessage(e, 'Could not download the proforma.')),
    });
  }

  private checkPo(): boolean {
    if (this.canEdit() && this.poDate() && !this.poNumber().trim()) {
      this.error.set('Enter the P.O. number for that P.O. date.');
      return false;
    }
    return true;
  }

  private show(sheet: ProformaSheet): void {
    this.sheet.set(sheet);
    const d = sheet.document;
    this.customer.set({
      name: d.clientName ?? '',
      project: d.projectName ?? '',
      contactNumber: d.contactNumber ?? '',
      location: d.location ?? '',
    });
    this.poNumber.set(d.poNumber ?? '');
    this.poDate.set(d.poDate ?? '');
  }
}
