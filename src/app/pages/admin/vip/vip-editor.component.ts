import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import {
  CreateVipClientRequest,
  UpdateVipClientRequest,
} from '../../../models/vip-client.model';
import { VipClientService } from '../../../services/vip-client.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';
import {
  fieldErrorMessage,
  shouldShowError,
  strongPassword,
} from '../../../utils/form-validators.util';

@Component({
  selector: 'app-vip-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vip-editor.component.html',
  styleUrl: '../staff-editor/staff-editor.component.css',
})
export class VipEditorComponent {
  private readonly service = inject(VipClientService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly vipId = this.route.snapshot.paramMap.get('id');
  readonly isEditing = !!this.vipId;
  readonly loading = signal(this.isEditing);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Reactive rather than template-driven, matching the DIA form. Validation
   * lives with the model, so the same rules drive both the disabled state and
   * the per-field messages instead of being scattered across the template.
   */
  readonly form = this.formBuilder.nonNullable.group({
    clientName: ['', [Validators.required, Validators.maxLength(200)]],
    projectName: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    // Required only when creating — blank on edit keeps the current password.
    password: ['', this.isEditing ? [strongPassword] : [Validators.required, strongPassword]],
    folderName: ['', [Validators.maxLength(400)]],
    isActive: [true],
    canSignIn: [true],
  });

  constructor() {
    if (this.vipId) this.load(this.vipId);
  }

  private static readonly LABELS: Record<string, string> = {
    clientName: 'Client name',
    projectName: 'Project name',
    email: 'Email',
    password: 'Password',
    folderName: 'Folder name',
  };

  showError(name: string): boolean {
    return shouldShowError(this.form.get(name));
  }

  errorFor(name: string): string {
    return fieldErrorMessage(this.form.get(name), VipEditorComponent.LABELS[name] ?? 'This field');
  }

  /**
   * Shown under the folder field so the admin sees what will be created before
   * saving. Blank means "use the default", built the same way as on the server.
   */
  get folderPreview(): string {
    const custom = this.form.controls.folderName.value.trim();
    if (custom) return custom;

    const client = this.form.controls.clientName.value.trim();
    const project = this.form.controls.projectName.value.trim();
    return client && project ? `${client} - ${project}` : '—';
  }

  save(): void {
    if (this.saving()) return;

    if (this.form.invalid) {
      // Reveals every message at once rather than only the field just left.
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();
    const base = {
      clientName: value.clientName.trim(),
      projectName: value.projectName.trim(),
      email: value.email.trim().toLowerCase(),
      folderName: value.folderName.trim() || null,
    };

    const action = this.vipId
      ? this.service.update(this.vipId, {
          ...base,
          password: value.password || null,
          isActive: value.isActive,
          canSignIn: value.canSignIn,
        } satisfies UpdateVipClientRequest)
      : this.service.create({
          ...base,
          password: value.password,
        } satisfies CreateVipClientRequest);

    action
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (id) => void this.router.navigate(['/admin/vip', this.vipId ?? id]),
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Could not save the VIP client.')),
      });
  }

  cancel(): void {
    void this.router.navigate(['/admin/vip']);
  }

  private load(id: string): void {
    this.service
      .getById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (client) =>
          this.form.patchValue({
            clientName: client.clientName,
            projectName: client.projectName,
            email: client.email,
            folderName: client.folderName,
            isActive: client.isActive,
            canSignIn: client.canSignIn,
          }),
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Could not load the VIP client.')),
      });
  }
}
