import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Complexité sans liste blanche restrictive (accepte _, -, etc.) */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export const PASSWORD_HINT =
  '8 caractères min., une majuscule, une minuscule et un chiffre (_ et symboles autorisés).';

export function isValidPassword(password: string | null | undefined): boolean {
  if (!password) return false;
  return PASSWORD_PATTERN.test(password);
}

export function passwordStrength(password: string): 'weak' | 'medium' | 'strong' {
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score < 3) return 'weak';
  if (score < 5) return 'medium';
  return 'strong';
}

export function passwordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    if (!value) return null;
    return isValidPassword(value) ? null : { passwordPolicy: true };
  };
}
