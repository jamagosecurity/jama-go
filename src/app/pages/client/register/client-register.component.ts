import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ClientRegistrationService } from '../../../services/client-registration.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

/** Same shape the server checks: digits, spaces, dashes, brackets, an
 *  optional leading +, and 7–15 digits in total. */
const mobileValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  const digits = value.replace(/\D/g, '').length;
  return /^\+?[0-9\s\-()]+$/.test(value) && digits >= 7 && digits <= 15 ? null : { mobile: true };
};

/** The server's PasswordRules, mirrored so the form can say what is missing
 *  before a round trip — the server's check is still the one that counts. */
const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: '8+ characters', test: (p) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Number', test: (p) => /[0-9]/.test(p) },
];

const strongPassword: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');
  if (!value) return null;
  return PASSWORD_RULES.every((rule) => rule.test(value)) ? null : { weak: true };
};

type FieldName = 'fullName' | 'email' | 'mobile' | 'siteLocation' | 'password' | 'confirmPassword';

const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return confirm && password !== confirm ? { mismatch: true } : null;
};

/**
 * A client signing themselves up. Public, and deliberately the same look as
 * the sign-in page it sits beside — the two are one door into the system.
 *
 * Nothing here signs anyone in: the account exists but stays switched off
 * until an admin accepts it, so the success state says exactly that rather
 * than pretending the client can now go and use it.
 */
@Component({
  selector: 'app-client-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-register.component.html',
  styleUrls: ['../../admin/login/admin-login.component.css', './client-register.component.css'],
})
export class ClientRegisterComponent {
  private readonly service = inject(ClientRegistrationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  /** Who just registered, once the server has accepted it — drives the
   *  success state. Null while the form is showing. */
  protected readonly registeredName = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      mobile: ['', [Validators.required, Validators.maxLength(40), mobileValidator]],
      siteLocation: ['', [Validators.required, Validators.maxLength(300)]],
      password: ['', [Validators.required, strongPassword]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  protected readonly passwordRules = computed(() => {
    const password = this.passwordValue();
    return PASSWORD_RULES.map((rule) => ({ label: rule.label, ok: rule.test(password) }));
  });

  protected togglePassword(): void {
    this.showPassword.update((shown) => !shown);
  }

  protected showError(name: FieldName): boolean {
    const control = this.form.controls[name];
    const mismatch = name === 'confirmPassword' && this.form.hasError('mismatch');
    return (control.invalid || mismatch) && (control.touched || this.submitted());
  }

  protected errorFor(name: FieldName): string {
    const control = this.form.controls[name];

    if (control.hasError('required')) {
      return {
        fullName: 'Enter your name.',
        email: 'Enter your email address.',
        mobile: 'Enter your mobile number.',
        siteLocation: 'Enter where your site is.',
        password: 'Choose a password.',
        confirmPassword: 'Type your password again.',
      }[name];
    }
    if (control.hasError('email')) return 'Enter a valid email address.';
    if (control.hasError('mobile')) return 'Enter a valid mobile number, e.g. +974 3312 3456.';
    if (control.hasError('weak')) return 'Your password needs everything listed below.';
    if (control.hasError('maxlength')) return 'That is too long.';
    if (name === 'confirmPassword' && this.form.hasError('mismatch')) return "The passwords don't match.";
    return '';
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.submitting.set(true);

    this.service
      .register({
        fullName: raw.fullName.trim(),
        email: raw.email.trim(),
        mobile: raw.mobile.trim(),
        siteLocation: raw.siteLocation.trim(),
        password: raw.password,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () => this.registeredName.set(raw.fullName.trim().split(/\s+/)[0]),
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Could not send your registration. Please try again.')),
      });
  }
}
