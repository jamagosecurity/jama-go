import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { DiaWriteRequest } from '../../../../models/dia.model';
import { DiaService } from '../../../../services/dia.service';
import { getApiErrorMessage } from '../../../../utils/api-error.util';
import { DIA_BASE_PATH } from '../dia-base-path';
import { DiaEmptyStateComponent, DiaSkeletonComponent } from '../shared/dia-shared.components';

function requiredTrimmed(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim().length ? null : { required: true };
}

@Component({
  selector: 'app-dia-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    DiaEmptyStateComponent,
    DiaSkeletonComponent,
  ],
  templateUrl: './dia-form.component.html',
  styleUrl: '../dia.styles.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly service = inject(DiaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  /** Portal this screen is mounted under — see DIA_BASE_PATH. */
  protected readonly base = inject(DIA_BASE_PATH);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = Boolean(this.id);
  protected readonly loading = signal(this.isEdit);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');
  protected readonly saveError = signal('');
  protected readonly form = this.formBuilder.nonNullable.group({
    diaNumber: ['', [Validators.required, requiredTrimmed, Validators.maxLength(100)]],
    clientNumber: ['', [Validators.required, requiredTrimmed, Validators.maxLength(100)]],
    clientName: ['', [Validators.required, requiredTrimmed, Validators.maxLength(200)]],
    clientLocation: ['', [Validators.required, requiredTrimmed, Validators.maxLength(300)]],
  });

  ngOnInit(): void {
    if (this.id) this.load(this.id);
  }

  protected submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const request: DiaWriteRequest = {
      diaNumber: raw.diaNumber.trim(),
      clientNumber: raw.clientNumber.trim(),
      clientName: raw.clientName.trim(),
      clientLocation: raw.clientLocation.trim(),
    };
    this.saving.set(true);
    this.saveError.set('');
    this.form.disable();
    const operation = this.id ? this.service.update(this.id, request) : this.service.create(request);
    operation.pipe(finalize(() => {
      this.saving.set(false);
      this.form.enable();
    })).subscribe({
      next: () => {
        this.snackBar.open(`DIA ${this.isEdit ? 'updated' : 'created'} successfully.`, 'Dismiss', {
          duration: 3500,
        });
        void this.router.navigate([this.base, 'list']);
      },
      error: (error: unknown) =>
        this.saveError.set(getApiErrorMessage(error, `Unable to ${this.isEdit ? 'update' : 'create'} DIA.`)),
    });
  }

  protected retry(): void {
    if (this.id) this.load(this.id);
  }

  protected hasError(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.loadError.set('');
    this.service
      .getById(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (dia) =>
          this.form.setValue({
            diaNumber: dia.diaNumber,
            clientNumber: dia.clientNumber,
            clientName: dia.clientName,
            clientLocation: dia.clientLocation,
          }),
        error: (error: unknown) =>
          this.loadError.set(getApiErrorMessage(error, 'Unable to load this DIA record.')),
      });
  }
}
