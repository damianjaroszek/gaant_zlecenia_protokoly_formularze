/**
 * Password validation utilities (must match server-side validation)
 */

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates password strength.
 * Requirements:
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return {
      isValid: false,
      error: `Hasło musi mieć minimum ${PASSWORD_MIN_LENGTH} znaków`
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: 'Hasło musi zawierać małą literę'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: 'Hasło musi zawierać wielką literę'
    };
  }

  if (!/\d/.test(password)) {
    return {
      isValid: false,
      error: 'Hasło musi zawierać cyfrę'
    };
  }

  return { isValid: true };
}

/**
 * Returns password requirements description for UI
 */
export function getPasswordRequirements(): string {
  return `Minimum ${PASSWORD_MIN_LENGTH} znaków, mała litera, wielka litera i cyfra`;
}
