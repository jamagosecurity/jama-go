import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import {
  fieldErrorMessage,
  shouldShowError,
  strongPassword,
} from '../../../utils/form-validators.util';

@Component({
  selector: 'app-staff-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-editor.component.html',
  styleUrl: './staff-editor.component.css',
})
export class StaffEditorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly staffService = inject(StaffService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly staffId = this.route.snapshot.paramMap.get('id');
  readonly isEditing = !!this.staffId;
  readonly loading = signal(this.isEditing);
  readonly saving = signal(false);
  readonly hasLoginAccount = signal(false);
  readonly error = signal<string | null>(null);
  readonly departments = STAFF_DEPARTMENTS;

  /** Area headings, matched by permission key prefix so adding a permission to
   *  an existing area needs no change here. */
  private static readonly AREAS: ReadonlyArray<{ prefix: string; label: string }> = [
    { prefix: 'dia.', label: 'DIA records & inspections' },
    { prefix: 'invoice.', label: 'Invoices' },
    { prefix: 'contact.', label: 'Website enquiries' },
    { prefix: 'panels.', label: 'Control panels' },
  ];

  /** Icon path data per permission, so each card is scannable at a glance. */
  private static readonly ICONS: Record<string, string[]> = {
    'dia.view': ['M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z', 'M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z'],
    'dia.upload': ['M9 3h6l1 2h3v16H5V5h3z', 'M12 10v6M9 13h6'],
    'dia.inspect': ['M9 3h6l1 2h3v16H5V5h3z', 'M9 12l2 2 4-4M9 17h6'],
    'invoice.view': ['M6 2h9l3 3v17H6z', 'M9 9h6M9 13h6M9 17h4'],
    'contact.view': ['M4 5h16v14H4z', 'm20 6-8 6-8-6'],
    'panels.manage': ['M4 4h16v16H4z', 'M9 9h6v6H9z', 'M4 10h5M15 10h5M4 14h5M15 14h5'],
  };

  readonly permissionCatalogue = signal<PermissionDefinition[]>([]);

  /** Catalogue split into areas, preserving catalogue order within each. */
  readonly permissionAreas = computed(() =>
    StaffEditorComponent.AREAS.map((area) => ({
      label: area.label,
      permissions: this.permissionCatalogue().filter((p) => p.key.startsWith(area.prefix)),
    })).filter((area) => area.permissions.length > 0),
  );

  readonly selectedCount = computed(() => this.selectedPermissions().size);

  iconPaths(key: string): string[] {
    return StaffEditorComponent.ICONS[key] ?? ['M12 4v16M4 12h16'];
  }

  /**
   * Whether the selection still matches the department's defaults. A method
   * rather than a computed: the department lives in a form control, not a
   * signal, so a computed would not recompute when it changes.
   */
  matchesDepartmentDefaults(): boolean {
    const defaults = this.defaultsFor(this.form.controls.department.value);
    const selected = this.selectedPermissions();
    return defaults.length === selected.size && defaults.every((key) => selected.has(key));
  }

  private defaultsFor(department: StaffDepartment | null): string[] {
    return department ? (this.departmentDefaults()[department] ?? []) : [];
  }

  selectAllPermissions(): void {
    this.permissionsTouched = true;
    this.selectedPermissions.set(new Set(this.permissionCatalogue().map((p) => p.key)));
  }

  clearPermissions(): void {
    this.permissionsTouched = true;
    this.selectedPermissions.set(new Set());
  }

  /** Puts the department's usual permissions back after manual edits. */
  resetToDepartmentDefaults(): void {
    this.selectedPermissions.set(new Set(this.defaultsFor(this.form.controls.department.value)));
  }
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
  private applyDepartmentDefaults(department: StaffDepartment | null): void {
    // Never overwrite a choice the admin has already made by hand.
    if (this.permissionsTouched) return;
    this.selectedPermissions.set(new Set(this.defaultsFor(department)));
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

  /**
   * Reactive, matching the DIA and VIP editors. Previously template-driven with
   * no per-field messages at all: an invalid email or a weak password only
   * surfaced as a single API error banner after pressing save.
   */
  readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    // Required only when creating — blank on edit keeps the current password.
    password: ['', this.isEditing ? [strongPassword] : [Validators.required, strongPassword]],
    department: this.formBuilder.nonNullable.control<StaffDepartment | null>(null),
    /** Public "Our Team" visibility. */
    isActive: [true],
    /**
     * Login enabled. Deliberately separate from isActive — internal staff sign
     * in without appearing on the marketing site.
     */
    canSignIn: [true],
  });

  private static readonly LABELS: Record<string, string> = {
    fullName: 'Full name',
    email: 'Email',
    password: 'Password',
    department: 'Department',
  };

  showError(name: string): boolean {
    return shouldShowError(this.form.get(name));
  }

  errorFor(name: string): string {
    return fieldErrorMessage(this.form.get(name), StaffEditorComponent.LABELS[name] ?? 'This field');
  }

  constructor() {
    // Department drives the starting permissions, so react to it rather than
    // relying on the template to call back.
    this.form.controls.department.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((department) => this.applyDepartmentDefaults(department));

    this.staffService
      .getPermissionCatalogue()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (catalogue) => {
          this.permissionCatalogue.set(catalogue.permissions);
          this.departmentDefaults.set(catalogue.departmentDefaults ?? {});
          // A brand new account starts on whatever department is preselected.
          // Applied here rather than on a valueChanges event, because the
          // defaults only become known once this response lands.
          if (!this.isEditing) {
            this.applyDepartmentDefaults(this.form.controls.department.value);
          }
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

    if (this.form.invalid) {
      // Reveals every message at once rather than only the field just left.
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();
    const baseRequest = {
      fullName: value.fullName.trim(),
      email: value.email.trim().toLowerCase(),
      department: value.department,
      isActive: value.isActive,
      canSignIn: value.canSignIn,
    };

    const permissions = [...this.selectedPermissions()];

    const action = this.staffId
      ? this.staffService.update(this.staffId, {
          ...baseRequest,
          password: value.password || null,
        } satisfies UpdateStaffRequest)
      : this.staffService.create({
          ...baseRequest,
          password: value.password,
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

          // emitEvent: false so seeding the form does not look like the admin
          // changing the department, which would overwrite the account's saved
          // permissions with the department defaults. Changing it by hand
          // afterwards still applies them.
          this.form.patchValue(
            {
              fullName: member.fullName,
              email: member.email ?? '',
              password: '',
              department:
                STAFF_DEPARTMENTS.find((option) => option.label === member.department)?.value ?? null,
              isActive: member.isActive,
              canSignIn: member.canSignIn,
            },
            { emitEvent: false },
          );
        },
        error: (error: unknown) =>
          this.error.set(getApiErrorMessage(error, 'Could not load staff member.')),
      });
  }
}
