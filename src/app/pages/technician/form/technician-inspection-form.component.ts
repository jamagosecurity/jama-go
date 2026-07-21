import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { TechnicianInspection } from '../../../models/technician.model';
import { TechnicianService } from '../../../services/technician.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

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
  styleUrl: '../technician.styles.css',
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
      details: [''],
    }),
  });

  protected get cameras(): FormArray {
    return this.form.controls.cameras;
  }

  ngOnInit(): void {
    this.load();
  }

  protected addCamera(): void {
    this.cameras.push(
      this.fb.nonNullable.group({
        brand: ['', Validators.required],
        model: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
        location: [''],
        remarks: [''],
      }),
    );
  }

  protected removeCamera(index: number): void {
    this.cameras.removeAt(index);
  }

  protected saveDraft(): void {
    if (this.saving() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.persist(false);
  }

  protected review(): void {
    if (this.saving() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.persist(true);
  }

  private persist(goToReview: boolean): void {
    const inspection = this.inspection();
    if (!inspection) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    type CameraFormValue = {
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
        kpoi: raw.kpoi.details?.trim() ? { details: raw.kpoi.details.trim() } : null,
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
    inspection.cameras.forEach(() => this.addCamera());
    if (!inspection.cameras.length) this.addCamera();
    this.form.patchValue({
      cameras: inspection.cameras.map((camera) => ({
        brand: camera.brand,
        model: camera.model,
        quantity: camera.quantity,
        location: camera.location ?? '',
        remarks: camera.remarks ?? '',
      })),
      network: inspection.network ?? {},
      vms: inspection.vms ?? {},
      upsGeneral: inspection.upsGeneral ?? { generatorAvailable: false },
      anpr: inspection.anpr ?? { anprInstalled: false },
      kpoi: inspection.kpoi ?? { details: '' },
    });
  }
}
