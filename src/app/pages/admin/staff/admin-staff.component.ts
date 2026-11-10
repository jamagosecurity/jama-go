import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { StaffService } from '../../../services/staff.service';
import { AdminStaffMember } from '../../../models/staff.model';
import { getApiErrorMessage } from '../../../utils/api-error.util';

@Component({
  selector: 'app-admin-staff',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-staff.component.html',
  styleUrl: './admin-staff.component.css',
})
export class AdminStaffComponent {
  private readonly staffService = inject(StaffService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly staff = signal<AdminStaffMember[]>([]);
  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);
  /** The row showing its Delete / Keep confirmation, as the quotation list does. */
  readonly pendingDeleteId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly query = signal('');

  readonly activeCount = computed(() => this.staff().filter((s) => s.isActive).length);
  readonly hiddenCount = computed(() => this.staff().filter((s) => !s.isActive).length);
  readonly departments = computed(() => {
    const set = new Set(
      this.staff()
        .map((s) => s.department?.trim())
        .filter((d): d is string => !!d),
    );
    return set.size;
  });

  readonly filteredStaff = computed(() => {
    const q = this.query().trim().toLowerCase();
    const items = [...this.staff()].sort((a, b) => a.displayOrder - b.displayOrder);
    if (!q) {
      return items;
    }
    return items.filter((member) =>
      [member.fullName, member.email, member.role, member.department, member.responsibility]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  });

  constructor() {
    this.loadStaff();
  }

  onSearch(value: string): void {
    this.query.set(value);
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'JG';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  loadStaff(): void {
    this.loading.set(true);
    this.error.set(null);

    this.staffService
      .getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => this.staff.set(items),
        error: (err: unknown) => {
          this.error.set(getApiErrorMessage(err, 'Could not load staff.'));
        },
      });
  }

  startCreate(): void {
    void this.router.navigate(['/admin/staff/new']);
  }

  startEdit(member: AdminStaffMember): void {
    void this.router.navigate(['/admin/staff', member.id, 'edit']);
  }

  deleteStaff(member: AdminStaffMember, event: Event): void {
    event.stopPropagation();

    if (this.deletingId()) {
      return;
    }

    this.deletingId.set(member.id);
    this.error.set(null);
    this.success.set(null);

    this.staffService
      .delete(member.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingId.set(null)),
      )
      .subscribe({
        next: () => {
          this.pendingDeleteId.set(null);
          this.success.set(`${member.fullName} deleted.`);
          this.loadStaff();
        },
        error: (err: unknown) => {
          this.error.set(getApiErrorMessage(err, 'Could not delete staff member.'));
        },
      });
  }

}
