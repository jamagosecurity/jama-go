import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';
import { Boq } from '../../../models/boq.model';
import { BoqService } from '../../../services/boq.service';
import { downloadBlob } from '../../../utils/download.util';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import { BOQ_BASE_PATH } from './boq-base-path';

/**
 * The signed contract for one approved quotation — the full Arabic
 * supply-and-installation wording, pre-filled from the quotation's own
 * figures (client, site, grand total, revision number) and editable before
 * download, the same way the quotation's own Terms & Conditions page is.
 *
 * Saving is separate from amending the quotation itself: the priced lines
 * are closed once approved and changing them needs boq.amend and a reason
 * (see UpdateBoqCommandHandler); the contract's paperwork wording is not a
 * change to what was agreed on, so anyone who can build or approve
 * quotations can fill it in without that heavier flow.
 */
@Component({
  selector: 'app-contract-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contract-editor.component.html',
  styleUrls: [
    '../../admin/staff-editor/staff-editor.component.css',
    './contract-editor.component.css',
  ],
})
export class ContractEditorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(BoqService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  /** Portal this screen is mounted under — see BOQ_BASE_PATH. */
  protected readonly basePath = inject(BOQ_BASE_PATH);

  private readonly boqId = this.route.snapshot.paramMap.get('id')!;

  protected readonly boq = signal<Boq | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly downloading = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    contractText: [''],
  });

  /** Same two conventions ContractPdfGenerator reads: a line starting
   *  "البند" prints bold as a clause heading, one starting "- " prints as a
   *  bulleted point, everything else is a plain paragraph. Live, so staff
   *  can see how a line will be read the moment they type it rather than
   *  guessing and finding out only in the downloaded PDF. */
  private readonly contractTextValue = toSignal(this.form.controls.contractText.valueChanges, {
    initialValue: '',
  });

  protected readonly detectedHeadings = computed(() =>
    ContractEditorComponent.detectHeadings(this.contractTextValue()),
  );

  private static readonly ClauseHeading = /^البند\s+\S/;

  private static detectHeadings(text: string): string[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => ContractEditorComponent.ClauseHeading.test(line));
  }

  constructor() {
    this.service
      .getById(this.boqId)
      .pipe(
        tap((boq) => this.boq.set(boq)),
        switchMap((boq) => {
          // A saved edit wins outright. Only once nothing has ever been
          // saved does the screen need the default fetched — asking for it
          // on an unapproved quotation would just 400.
          if (boq.contractText) {
            this.form.controls.contractText.setValue(boq.contractText);
            return of(null);
          }
          if (boq.status !== 'Approved') return of(null);

          return this.service.getDefaultContractText(boq.id).pipe(
            tap((text) => this.form.controls.contractText.setValue(text)),
            catchError((err: unknown) => {
              this.error.set(getApiErrorMessage(err, 'Could not load the default contract text.'));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Could not load this quotation.')),
      });
  }

  protected save(): void {
    if (this.saving()) return;

    this.saving.set(true);
    this.error.set('');
    this.notice.set('');

    this.service
      .updateContractText(this.boqId, this.form.controls.contractText.value)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.notice.set('Contract saved.'),
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Could not save the contract.')),
      });
  }

  /** Downloads whatever would print right now — the saved text if Save was
   *  ever pressed, otherwise the same default shown in the box, so a staff
   *  member who only wants to glance at the PDF need not save first. */
  protected download(): void {
    if (this.downloading()) return;

    this.downloading.set(true);
    this.error.set('');

    const boq = this.boq();
    this.service
      .downloadContract(this.boqId)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.downloading.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, `${boq?.boqNumber ?? 'Quotation'} Contract.pdf`),
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Could not download the contract.')),
      });
  }

  protected back(): void {
    void this.router.navigate([this.basePath, this.boqId]);
  }
}
