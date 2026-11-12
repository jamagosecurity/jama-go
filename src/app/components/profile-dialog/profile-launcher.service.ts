import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ProfileDialogComponent, ProfileDialogData, ProfileDialogResult } from './profile-dialog.component';

const ROLE_LABELS: Record<string, string> = { Admin: 'Administrator', Staff: 'Staff', Technician: 'Technician', Client: 'Client' };

/** Opens the profile card — your own from the sidebar, anyone's from the staff list (administrators). */
@Injectable({ providedIn: 'root' })
export class ProfileLauncher {
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);

  openMine(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.open({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      roleLabel: ROLE_LABELS[user.role] ?? user.role,
      designation: user.designation ?? null,
      photoVersion: user.photoVersion ?? 0,
      phone: user.phone ?? null,
      self: true,
    });
  }

  open(data: ProfileDialogData): Observable<ProfileDialogResult | undefined> {
    return this.dialog
      .open<ProfileDialogComponent, ProfileDialogData, ProfileDialogResult>(ProfileDialogComponent, {
        data,
        panelClass: 'profile-dialog-panel',
        width: '520px',
        maxWidth: 'calc(100vw - 20px)',
        autoFocus: 'dialog',
      })
      .afterClosed();
  }
}
