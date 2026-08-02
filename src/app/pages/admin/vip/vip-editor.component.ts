import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import {
  CreateVipClientRequest,
  UpdateVipClientRequest,
} from '../../../models/vip-client.model';
import { VipClientService } from '../../../services/vip-client.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

interface VipClientForm {
  clientName: string;
  projectName: string;
  email: string;
  password: string;
  folderName: string;
  isActive: boolean;
  canSignIn: boolean;
}

@Component({
  selector: 'app-vip-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vip-editor.component.html',
  styleUrl: '../staff-editor/staff-editor.component.css',
})
export class VipEditorComponent {
  private readonly service = inject(VipClientService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly vipId = this.route.snapshot.paramMap.get('id');
  readonly isEditing = !!this.vipId;
  readonly loading = signal(this.isEditing);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  form: VipClientForm = {
    clientName: '',
    projectName: '',
    email: '',
    password: '',
    folderName: '',
    isActive: true,
    canSignIn: true,
  };

  constructor() {
    if (this.vipId) this.load(this.vipId);
  }

  /**
   * Shown under the folder field so the admin sees what will be created before
   * saving. Blank means "use the default", which is built the same way here and
   * on the server.
   */
  get folderPreview(): string {
    if (this.form.folderName.trim()) return this.form.folderName.trim();
    const client = this.form.clientName.trim();
    const project = this.form.projectName.trim();
    return client && project ? `${client} - ${project}` : '—';
  }

  save(event: Event): void {
    event.preventDefault();
    if (this.saving()) return;

    this.saving.set(true);
    this.error.set(null);

    const base = {
      clientName: this.form.clientName.trim(),
      projectName: this.form.projectName.trim(),
      email: this.form.email.trim().toLowerCase(),
      folderName: this.form.folderName.trim() || null,
    };

    const action = this.vipId
      ? this.service.update(this.vipId, {
          ...base,
          password: this.form.password || null,
          isActive: this.form.isActive,
          canSignIn: this.form.canSignIn,
        } satisfies UpdateVipClientRequest)
      : this.service.create({
          ...base,
          password: this.form.password,
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
        next: (client) => {
          this.form = {
            clientName: client.clientName,
            projectName: client.projectName,
            email: client.email,
            password: '',
            folderName: client.folderName,
            isActive: client.isActive,
            canSignIn: client.canSignIn,
          };
        },
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Could not load the VIP client.')),
      });
  }
}
