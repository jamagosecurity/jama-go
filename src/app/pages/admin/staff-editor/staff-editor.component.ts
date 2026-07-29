import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import {
  CreateStaffRequest,
  PermissionDefinition,
  STAFF_DEPARTMENTS,
  StaffDepartment,
  UpdateStaffRequest,
} from '../../../models/staff.model';
import { StaffService } from '../../../services/staff.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

interface StaffAccountForm {
  fullName: string;
  email: string;
  password: string;
  department: StaffDepartment | null;
  /** Public "Our Team" visibility. */
  isActive: boolean;
  /** Login enabled. Deliberately separate — internal staff sign in without
   *  appearing on the marketing site. */
  canSignIn: boolean;
}

@Component({
  selector: 'app-staff-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-editor.component.html',
  styleUrl: './staff-editor.component.css',
})
export class StaffEditorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly staffService = inject(StaffService);
  private readonly destroyRef = inject(DestroyRef);

  readonly staffId = this.route.snapshot.paramMap.get('id');
  readonly isEditing = !!this.staffId;
  readonly loading = signal(this.isEditing);
  readonly saving = signal(false);
  readonly hasLoginAccount = signal(false);
  readonly error = signal<string | null>(null);
  readonly departments = STAFF_DEPARTMENTS;

  readonly permissionCatalogue = signal<PermissionDefinition[]>([]);
  /** Department -> the permissions that department starts with, from the API. */
  private readonly departmentDefaults = signal<Record<string, string[]>>({});
  /** Permission keys currently ticked. */
  readonly selectedPermissions = signal<ReadonlySet<string>>(new Set());
  /** Set once the admin ticks anything, so their choices are never overwritten. */
  private permissionsTouched = false;

  isGranted(key: string): boolean {
    return this.selectedPermissions().has(key);
  }

  /**
   * Department drives both the portal and the starting permissions, but the
   * defaults were previously only seeded server-side at creation. An admin who
   * picked the department afterwards — or changed it — kept whatever the account
   * happened to have, which is how a "New technician" ended up in the staff
   * portal holding only dia.view.
   *
   * Applying them here makes the consequence visible in the form, and still
   * editable, rather than being decided invisibly on save.
   */
  departmentChanged(): void {
    if (this.permissionsTouched) return;

    const defaults = this.form.department
      ? (this.departmentDefaults()[this.form.department] ?? [])
      : [];
    this.selectedPermissions.set(new Set(defaults));
  }

  togglePermission(key: string, checked: boolean): void {
    this.permissionsTouched = true;
    const next = new Set(this.selectedPermissions());
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
    this.selectedPermissions.set(next);
  }

  form: StaffAccountForm = {
    fullName: '',
    email: '',
    password: '',
    department: null,
    isActive: true,
    canSignIn: true,
  };

  constructor() {
    this.staffService
      .getPermissionCatalogue()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (catalogue) => {
          this.permissionCatalogue.set(catalogue.permissions);
          this.departmentDefaults.set(catalogue.departmentDefaults ?? {});
          // A brand new account starts on whatever department is preselected.
          if (!this.isEditing) this.departmentChanged();
        },
        error: () => undefined,
      });

    if (this.staffId) {
      this.loadStaff(this.staffId);
    }
  }

  save(event: Event): void {
    event.preventDefault();
    if (this.saving()) return;

    this.saving.set(true);
    this.error.set(null);

    const baseRequest = {
      fullName: this.form.fullName.trim(),
      email: this.form.email.trim().toLowerCase(),
      department: this.form.department,
      isActive: this.form.isActive,
      canSignIn: this.form.canSignIn,
    };

    const permissions = [...this.selectedPermissions()];

    const action = this.staffId
      ? this.staffService.update(this.staffId, {
          ...baseRequest,
          password: this.form.password || null,
        } satisfies UpdateStaffRequest)
      : this.staffService.create({
          ...baseRequest,
          password: this.form.password,
          permissions,
        } satisfies CreateStaffRequest);

    action
      .pipe(
        // Permissions live on the account, so they are saved through their own
        // endpoint once the staff record itself exists.
        switchMap((id) => this.staffService.setPermissions(this.staffId ?? id, permissions)),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => void this.router.navigate(['/admin/staff']),
        error: (error: unknown) =>
          this.error.set(getApiErrorMessage(error, 'Could not save staff member.')),
      });
  }

  cancel(): void {
    void this.router.navigate(['/admin/staff']);
  }

  private loadStaff(id: string): void {
    this.staffService
      .getById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (member) => {
          this.hasLoginAccount.set(member.hasLoginAccount);
          this.selectedPermissions.set(new Set(member.permissions ?? []));
          this.form = {
            fullName: member.fullName,
            email: member.email ?? '',
            password: '',
            department:
              STAFF_DEPARTMENTS.find((option) => option.label === member.department)?.value ?? null,
            isActive: member.isActive,
            canSignIn: member.canSignIn,
          };
        },
        error: (error: unknown) =>
          this.error.set(getApiErrorMessage(error, 'Could not load staff member.')),
      });
  }
}
