import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { CameraDetail, TechnicianInspection } from '../../../models/technician.model';
import { TechnicianService } from '../../../services/technician.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

/** One wizard step per inspection section. Order drives the rail and the nav. */
type StepKey = 'cameras' | 'network' | 'vms' | 'upsGeneral' | 'anpr' | 'kpoi';

interface WizardStep {
  readonly key: StepKey;
  readonly label: string;
  readonly hint: string;
}

@Component({
  selector: 'app-technician-inspection-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  templateUrl: './technician-inspection-form.component.html',
  styleUrls: ['../technician.styles.css', './technician-inspection-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicianInspectionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TechnicianService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly inspection = signal<TechnicianInspection | null>(null);

  protected readonly steps: readonly WizardStep[] = [
    { key: 'cameras', label: 'Cameras', hint: 'Brand, model, quantity and placement for each camera on site.' },
    { key: 'network', label: 'Network', hint: 'Switches, routers, firewall and rack condition.' },
    { key: 'vms', label: 'VMS', hint: 'Video management platform, licensing and server health.' },
    { key: 'upsGeneral', label: 'UPS / General', hint: 'Power backup, battery condition and generator cover.' },
    { key: 'anpr', label: 'ANPR', hint: 'Plate recognition hardware, software and configuration.' },
    { key: 'kpoi', label: "K'Poi", hint: 'IVD / IVSS, camera, lens and storage details.' },
  ];

  protected readonly stepIndex = signal(0);
  /** Sections the technician explicitly skipped — cleared and flagged, not blocked. */
  protected readonly skipped = signal<ReadonlySet<StepKey>>(new Set<StepKey>());
  /** Sections that have been filled in with at least one value. */
  protected readonly completed = signal<ReadonlySet<StepKey>>(new Set<StepKey>());

  protected readonly currentStep = computed(() => this.steps[this.stepIndex()]);
  protected readonly isFirstStep = computed(() => this.stepIndex() === 0);
  protected readonly isLastStep = computed(() => this.stepIndex() === this.steps.length - 1);
  protected readonly progress = computed(() =>
    Math.round(((this.stepIndex() + 1) / this.steps.length) * 100),
  );

  protected readonly form = this.fb.nonNullable.group({
    cameras: this.fb.array([]),
    network: this.fb.group({
      switchBrand: [''],
      switchModel: [''],
      routerBrand: [''],
      routerModel: [''],
      firewall: [''],
      rackDetails: [''],
      networkRemarks: [''],
    }),
    vms: this.fb.group({
      vmsName: [''],
      version: [''],
      licenseDetails: [''],
      serverDetails: [''],
      healthStatus: [''],
      remarks: [''],
    }),
    upsGeneral: this.fb.group({
      upsBrand: [''],
      upsCapacity: [''],
      batteryStatus: [''],
      generatorAvailable: [false],
      generatorDetails: [''],
      generalRemarks: [''],
    }),
    anpr: this.fb.group({
      anprInstalled: [false],
      cameraDetails: [''],
      configuration: [''],
      softwareVersion: [''],
      remarks: [''],
    }),
    kpoi: this.fb.group({
      ivdIvss: [''],
      kpoiCamera: [''],
      lens: [''],
      hardDisc: [''],
    }),
  });

  protected get cameras(): FormArray {
    return this.form.controls.cameras;
  }

  ngOnInit(): void {
    this.load();
  }

  // ===== Wizard navigation =====

  protected isSkipped(key: StepKey): boolean {
    return this.skipped().has(key);
  }

  protected isCompleted(key: StepKey): boolean {
    return this.completed().has(key);
  }

  protected goTo(index: number): void {
    if (index < 0 || index >= this.steps.length || index === this.stepIndex()) return;
    this.stepIndex.set(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Advance. Only the camera step carries validators, so this blocks solely on
   * half-filled camera rows — the technician must either complete them or skip.
   */
  protected next(): void {
    const step = this.currentStep();
    const control = this.form.get(step.key);
    if (control?.invalid) {
      control.markAllAsTouched();
      this.snackBar.open(
        `Complete the ${step.label} fields, or use Skip if this section does not apply.`,
        'Dismiss',
        { duration: 4000 },
      );
      return;
    }
    this.recordProgress(step.key);
    this.goTo(this.stepIndex() + 1);
  }

  protected back(): void {
    this.goTo(this.stepIndex() - 1);
  }

  /**
   * Clear the section, flag it as skipped and move on. Clearing is what lets a
   * half-filled camera row stop blocking submission — but it also destroys
   * typed data, so the skip is always offered back as an Undo.
   */
  protected skip(): void {
    const step = this.currentStep();
    const snapshot = this.snapshotStep(step.key);
    this.resetStep(step.key);
    this.skipped.update((set) => new Set(set).add(step.key));
    this.completed.update((set) => {
      const next = new Set(set);
      next.delete(step.key);
      return next;
    });

    this.snackBar
      .open(`${step.label} skipped.`, 'Undo', { duration: 6000 })
      .onAction()
      .subscribe(() => this.restoreStep(step.key, snapshot));

    if (this.isLastStep()) return;
    this.goTo(this.stepIndex() + 1);
  }

  private snapshotStep(key: StepKey): unknown {
    if (key === 'cameras') return this.cameras.getRawValue();
    return (this.form.get(key) as FormGroup | null)?.getRawValue() ?? null;
  }

  private restoreStep(key: StepKey, snapshot: unknown): void {
    if (key === 'cameras') {
      this.cameras.clear();
      (snapshot as CameraDetail[]).forEach((camera) => this.addCamera(camera));
    } else {
      (this.form.get(key) as FormGroup | null)?.patchValue(snapshot as Record<string, unknown>);
    }
    this.skipped.update((set) => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
    this.recordProgress(key);
    this.goTo(this.steps.findIndex((step) => step.key === key));
  }

  /** A step counts as done once it holds a value; that also clears any skip flag. */
  private recordProgress(key: StepKey): void {
    const filled = this.stepHasValue(key);
    this.completed.update((set) => {
      const next = new Set(set);
      if (filled) next.add(key);
      else next.delete(key);
      return next;
    });
    if (!filled) return;
    this.skipped.update((set) => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
  }

  private stepHasValue(key: StepKey): boolean {
    if (key === 'cameras') return this.cameras.length > 0;
    const value = this.form.get(key)?.value as Record<string, unknown> | undefined;
    if (!value) return false;
    return Object.values(value).some((entry) => entry !== '' && entry !== null && entry !== false);
  }

  /**
   * Blank a section without changing control types — `reset()` on these
   * (nullable) groups would send nulls where the API has been receiving "".
   */
  private resetStep(key: StepKey): void {
    if (key === 'cameras') {
      this.cameras.clear();
      return;
    }
    const group = this.form.get(key) as FormGroup | null;
    if (!group) return;
    const blank: Record<string, unknown> = {};
    Object.entries(group.controls).forEach(([name, control]) => {
      blank[name] = typeof control.value === 'boolean' ? false : '';
    });
    group.reset(blank);
  }

  // ===== Cameras =====

  protected addCamera(existing?: CameraDetail): void {
    this.cameras.push(
      this.fb.nonNullable.group({
        id: [existing?.id ?? null],
        brand: [existing?.brand ?? '', Validators.required],
        model: [existing?.model ?? '', Validators.required],
        quantity: [existing?.quantity ?? 1, [Validators.required, Validators.min(1)]],
        location: [existing?.location ?? ''],
        remarks: [existing?.remarks ?? ''],
      }),
    );
    this.skipped.update((set) => {
      const next = new Set(set);
      next.delete('cameras');
      return next;
    });
  }

  protected removeCamera(index: number): void {
    this.cameras.removeAt(index);
  }

  // ===== Persistence =====

  protected saveDraft(): void {
    if (this.saving() || this.blockOnFirstInvalidStep()) return;
    this.persist(false);
  }

  protected review(): void {
    if (this.saving() || this.blockOnFirstInvalidStep()) return;
    this.persist(true);
  }

  /**
   * Jumps to the offending step rather than just marking the whole form touched —
   * with one section on screen at a time, the errors are otherwise invisible.
   */
  private blockOnFirstInvalidStep(): boolean {
    const index = this.steps.findIndex((step) => this.form.get(step.key)?.invalid);
    if (index < 0) return false;
    const step = this.steps[index];
    this.form.get(step.key)?.markAllAsTouched();
    this.goTo(index);
    this.snackBar.open(
      `Complete the ${step.label} fields, or use Skip if this section does not apply.`,
      'Dismiss',
      { duration: 4000 },
    );
    return true;
  }

  private persist(goToReview: boolean): void {
    const inspection = this.inspection();
    if (!inspection) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    type CameraFormValue = {
      id: string | null;
      brand: string;
      model: string;
      quantity: number;
      location: string;
      remarks: string;
    };
    this.service
      .saveDraft({
        inspectionId: inspection.id,
        cameras: (raw.cameras as CameraFormValue[]).map((camera) => ({
          id: camera.id,
          brand: camera.brand.trim(),
          model: camera.model.trim(),
          quantity: Number(camera.quantity),
          location: camera.location?.trim() || null,
          remarks: camera.remarks?.trim() || null,
        })),
        network: raw.network,
        vms: raw.vms,
        upsGeneral: {
          ...raw.upsGeneral,
          generatorAvailable: raw.upsGeneral.generatorAvailable ?? false,
        },
        anpr: {
          ...raw.anpr,
          anprInstalled: raw.anpr.anprInstalled ?? false,
        },
        kpoi: {
          ivdIvss: raw.kpoi.ivdIvss?.trim() || null,
          kpoiCamera: raw.kpoi.kpoiCamera?.trim() || null,
          lens: raw.kpoi.lens?.trim() || null,
          hardDisc: raw.kpoi.hardDisc?.trim() || null,
        },
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Draft saved.', 'Dismiss', { duration: 3000 });
          if (goToReview) void this.router.navigate(['/technician/inspection', inspection.id, 'review']);
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Unable to save draft.')),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getInspectionById(this.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (inspection) => {
          if (inspection.isReadOnly) {
            void this.router.navigate(['/technician/inspection', inspection.id, 'review']);
            return;
          }
          this.inspection.set(inspection);
          this.patchForm(inspection);
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err, 'Unable to load inspection.')),
      });
  }

  private patchForm(inspection: TechnicianInspection): void {
    inspection.cameras.forEach((camera) => this.addCamera(camera));
    if (!inspection.cameras.length) this.addCamera();
    this.form.patchValue({
      network: inspection.network ?? {},
      vms: inspection.vms ?? {},
      upsGeneral: inspection.upsGeneral ?? { generatorAvailable: false },
      anpr: inspection.anpr ?? { anprInstalled: false },
      kpoi: {
        ivdIvss: inspection.kpoi?.ivdIvss ?? '',
        kpoiCamera: inspection.kpoi?.kpoiCamera ?? '',
        lens: inspection.kpoi?.lens ?? '',
        hardDisc: inspection.kpoi?.hardDisc ?? '',
      },
    });
    // Sections that arrived with saved data show as done in the rail on load.
    this.completed.update(() => {
      const done = new Set<StepKey>();
      this.steps.forEach((step) => {
        if (this.stepHasValue(step.key)) done.add(step.key);
      });
      return done;
    });
  }
}
