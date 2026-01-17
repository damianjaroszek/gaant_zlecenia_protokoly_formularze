/**
 * Validation utilities
 */

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Parses and validates a string ID parameter.
 * Returns the parsed integer or null if invalid.
 */
export function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

/**
 * Validates that all elements in an array are positive integers.
 */
export function validateIntegerArray(arr: unknown[]): arr is number[] {
  return arr.every(
    (item) => typeof item === 'number' && Number.isInteger(item) && item > 0
  );
}

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
