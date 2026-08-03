import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Mirrors Common/PasswordRules on the API, reported per-rule so the user sees
 * exactly what is missing rather than one combined "invalid password".
 *
 * Blank passes: on an edit form a blank password means "leave it alone", and
 * Validators.required is what makes it mandatory on create.
 */
export function strongPassword(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string) ?? '';
  if (!value) return null;

  const failures: string[] = [];
  if (value.length < 8) failures.push('at least 8 characters');
  if (!/[A-Z]/.test(value)) failures.push('an uppercase letter');
  if (!/[a-z]/.test(value)) failures.push('a lowercase letter');
  if (!/[0-9]/.test(value)) failures.push('a number');

  return failures.length ? { weakPassword: failures } : null;
}

/**
 * Group validator: a field and its confirmation must agree. Reports on the
 * group rather than the confirmation control so that clearing either box
 * re-evaluates it.
 *
 * Passes while the confirmation is still empty — the user is mid-type, and
 * Validators.required is what makes it mandatory.
 */
export function fieldsMatch(field: string, confirmation: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const value = group.get(field)?.value;
    const confirm = group.get(confirmation)?.value;
    return !confirm || value === confirm ? null : { fieldsMismatch: true };
  };
}

/** Group validator: two fields must NOT hold the same value. */
export function fieldsDiffer(field: string, other: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(field)?.value;
    const b = group.get(other)?.value;
    return !a || !b || a !== b ? null : { fieldsIdentical: true };
  };
}

/**
 * Errors appear once a field has been touched or edited, never while it is
 * still being typed into for the first time — otherwise every empty required
 * field shouts at the user before they have reached it.
 */
export function shouldShowError(control: AbstractControl | null | undefined): boolean {
  return !!control && control.invalid && (control.touched || control.dirty);
}

/**
 * Turns Angular's error object into a sentence. Kept in one place so the same
 * failure reads identically on every form — "Email is required." on the staff
 * editor and something else on the VIP editor was the sort of drift that made
 * these screens feel like different products.
 */
export function fieldErrorMessage(
  control: AbstractControl | null | undefined,
  label: string,
): string {
  const errors = control?.errors;
  if (!errors) return '';

  if (errors['required']) return `${label} is required.`;
  if (errors['email']) return 'Enter a valid email address.';
  if (errors['minlength']) {
    return `${label} must be at least ${errors['minlength'].requiredLength} characters.`;
  }
  if (errors['maxlength']) {
    return `${label} must be ${errors['maxlength'].requiredLength} characters or fewer.`;
  }
  if (errors['min']) return `${label} must be ${errors['min'].min} or more.`;
  if (errors['max']) return `${label} must be ${errors['max'].max} or less.`;
  if (errors['weakPassword']) {
    return `Password needs ${(errors['weakPassword'] as string[]).join(', ')}.`;
  }
  return `${label} is not valid.`;
}
