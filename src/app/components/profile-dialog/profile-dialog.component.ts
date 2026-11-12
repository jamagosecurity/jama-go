import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { ProfileInfo, ProfileService } from '../../services/profile.service';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { AvatarComponent } from '../avatar/avatar.component';

export interface ProfileDialogData {
  userId: string;
  fullName: string;
  email: string | null;
  /** "Administrator", "Staff", "Technician" — or the person's staff role. */
  roleLabel: string;
  designation: string | null;
  photoVersion: number;
  phone: string | null;
  /** Whether this is the signed-in person's own profile. */
  self: boolean;
}

export interface ProfileDialogResult {
  designation: string | null;
  photoVersion: number;
}

const DESIGNATION_MAX = 100;
const PICTURE_SIDE = 512;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/**
 * The profile card: picture, name, and the designation the person writes for themselves. Opened from the sidebar for
 * your own profile, and by an administrator from the staff list for anyone's. The picture is cropped to a square and
 * shrunk in the browser first, so a phone photo of several megabytes uploads as a small file.
 */
@Component({
  selector: 'app-profile-dialog',
  standalone: true,
  imports: [AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-dialog.component.html',
  styleUrl: './profile-dialog.component.css',
})
export class ProfileDialogComponent {
  private readonly profiles = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly location = inject(Location);
  private readonly ref = inject<MatDialogRef<ProfileDialogComponent, ProfileDialogResult>>(MatDialogRef, { optional: true });

  /** A pop-up when an administrator opens someone from the staff list; otherwise your own profile, as a full page. */
  protected readonly isPage = !this.ref;
  protected readonly data: ProfileDialogData = inject<ProfileDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? this.ownProfile();

  protected readonly designationMax = DESIGNATION_MAX;
  protected readonly savedDesignation = signal(this.data.designation ?? '');
  protected readonly draft = signal(this.data.designation ?? '');
  protected readonly version = signal(this.data.photoVersion);
  protected readonly saving = signal(false);
  protected readonly busyPhoto = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected readonly savedPhone = signal(this.data.phone ?? '');
  protected readonly phoneDraft = signal(this.data.phone ?? '');

  /** Same rule as the server: digits, spaces and dashes, an optional leading +, 7 to 15 digits. */
  protected readonly phoneError = computed(() => {
    const value = this.phoneDraft().trim();
    if (!value) return '';
    const digits = value.replace(/\D/g, '').length;
    return /^\+?[0-9][0-9 \-]*[0-9]$/.test(value) && digits >= 7 && digits <= 15 ? '' : 'Enter a valid phone number, like +974 5555 1234.';
  });

  /** The picture shown large, after a click on it. */
  protected readonly viewing = signal<string | null>(null);

  protected viewPhoto(): void {
    if (!this.version()) return;
    this.profiles.photo(this.data.userId, this.version()).subscribe((url) => this.viewing.set(url));
  }

  @HostListener('document:keydown.escape')
  protected closePhoto(): void {
    this.viewing.set(null);
  }

  protected readonly dirty = computed(
    () => this.draft().trim() !== this.savedDesignation().trim() || this.phoneDraft().trim() !== this.savedPhone().trim(),
  );

  // ===== Password (your own account only) =====
  protected readonly pwCurrent = signal('');
  protected readonly pwNew = signal('');
  protected readonly pwConfirm = signal('');
  protected readonly pwSaving = signal(false);
  protected readonly pwError = signal('');
  protected readonly pwNotice = signal('');

  /** The server's rules, shown as a live checklist. */
  protected readonly pwRules = computed(() => {
    const value = this.pwNew();
    return {
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      digit: /[0-9]/.test(value),
      match: value.length > 0 && value === this.pwConfirm(),
    };
  });
  protected readonly pwReady = computed(() => {
    const rules = this.pwRules();
    return !!this.pwCurrent() && rules.length && rules.upper && rules.lower && rules.digit && rules.match;
  });

  /** Signed in but the current password is forgotten: one click sends a reset link to their own email. */
  protected readonly resetSending = signal(false);

  protected emailResetLink(): void {
    const email = this.data.email;
    if (!email || this.resetSending()) return;
    this.resetSending.set(true);
    this.pwError.set('');
    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.resetSending.set(false);
        this.pwNotice.set(`A link to set a new password has been sent to ${email}. It works once, for 30 minutes.`);
      },
      error: (err: unknown) => {
        this.resetSending.set(false);
        this.pwError.set(getApiErrorMessage(err, 'Could not send the link.'));
      },
    });
  }

  protected changePassword(): void {
    if (!this.pwReady() || this.pwSaving()) return;
    if (this.pwNew() === this.pwCurrent()) {
      this.pwError.set('The new password must be different from the current one.');
      return;
    }
    this.pwSaving.set(true);
    this.pwError.set('');
    this.auth.changePassword({ currentPassword: this.pwCurrent(), newPassword: this.pwNew() }).subscribe({
      next: () => {
        this.pwSaving.set(false);
        this.pwCurrent.set('');
        this.pwNew.set('');
        this.pwConfirm.set('');
        this.pwNotice.set('Password changed. Use the new one next time you sign in.');
      },
      error: (err: unknown) => {
        this.pwSaving.set(false);
        this.pwError.set(getApiErrorMessage(err, 'Could not change the password.'));
      },
    });
  }

  protected onPhone(event: Event): void {
    this.phoneDraft.set((event.target as HTMLInputElement).value);
    this.notice.set('');
  }

  protected onType(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
    this.notice.set('');
  }

  protected save(): void {
    if (!this.dirty() || this.saving() || this.phoneError()) return;
    this.saving.set(true);
    this.error.set('');
    this.profiles.saveProfile(this.data.userId, this.draft().trim(), this.phoneDraft().trim()).subscribe({
      next: (info) => {
        this.saving.set(false);
        this.applied(info);
        this.draft.set(info.designation ?? '');
        this.phoneDraft.set(info.phone ?? '');
        this.notice.set('Profile saved.');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(getApiErrorMessage(err, 'Could not save the profile.'));
      },
    });
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';                       // so choosing the same file again still fires
    if (!file) return;

    this.error.set('');
    this.notice.set('');
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      this.error.set('Choose a JPG, PNG or WebP picture.');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      this.error.set('That picture is too large. Choose one under 15 MB.');
      return;
    }

    this.busyPhoto.set(true);
    try {
      const square = await this.squareJpeg(file);
      this.profiles.uploadPhoto(this.data.userId, square).subscribe({
        next: (info) => {
          this.busyPhoto.set(false);
          this.applied(info);
          this.notice.set('Photo updated.');
        },
        error: (err: unknown) => {
          this.busyPhoto.set(false);
          this.error.set(getApiErrorMessage(err, 'Could not upload the photo.'));
        },
      });
    } catch {
      this.busyPhoto.set(false);
      this.error.set('That picture could not be read. Try another one.');
    }
  }

  protected removePhoto(): void {
    if (this.busyPhoto()) return;
    this.busyPhoto.set(true);
    this.error.set('');
    this.profiles.removePhoto(this.data.userId).subscribe({
      next: (info) => {
        this.busyPhoto.set(false);
        this.applied(info);
        this.notice.set('Photo removed.');
      },
      error: (err: unknown) => {
        this.busyPhoto.set(false);
        this.error.set(getApiErrorMessage(err, 'Could not remove the photo.'));
      },
    });
  }

  protected close(): void {
    if (this.ref) this.ref.close({ designation: this.savedDesignation().trim() || null, photoVersion: this.version() });
    else this.location.back();
  }

  protected signOut(): void {
    this.auth.logout();
  }

  private ownProfile(): ProfileDialogData {
    const user = this.auth.currentUser();
    const labels: Record<string, string> = { Admin: 'Administrator', Staff: 'Staff', Technician: 'Technician', Client: 'Client' };
    return {
      userId: user?.id ?? '',
      fullName: user?.fullName ?? '',
      email: user?.email ?? null,
      roleLabel: labels[user?.role ?? ''] ?? user?.role ?? '',
      designation: user?.designation ?? null,
      photoVersion: user?.photoVersion ?? 0,
      phone: user?.phone ?? null,
      self: true,
    };
  }

  /** What the server now holds — shown here, and (for your own profile) in the sidebar straight away. */
  private applied(info: ProfileInfo): void {
    this.savedDesignation.set(info.designation ?? '');
    this.savedPhone.set(info.phone ?? '');
    this.version.set(info.photoVersion);
    if (this.auth.currentUser()?.id === this.data.userId) {
      this.auth.updateCurrentUser({ designation: info.designation, photoVersion: info.photoVersion, phone: info.phone });
    }
  }

  /** Centre-crops to a square and shrinks it, honouring the photo's rotation, as a JPEG. */
  private async squareJpeg(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.min(PICTURE_SIDE, side);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no canvas');
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side,
      0, 0, canvas.width, canvas.height,
    );
    bitmap.close();
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no blob'))), 'image/jpeg', 0.88),
    );
  }
}
