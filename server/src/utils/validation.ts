/**
 * Validation utilities
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt truncates passwords longer than 72 bytes

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 50; // matches database schema
export const DISPLAY_NAME_MAX_LENGTH = 100; // matches database schema

// Allowed characters for username: alphanumeric, underscore, hyphen
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates username.
 * Requirements:
 * - Minimum 3 characters
 * - Maximum 50 characters (database limit)
 * - Only alphanumeric characters, underscores, and hyphens
 */
export function validateUsername(username: string): ValidationResult {
  if (!username || username.length < USERNAME_MIN_LENGTH) {
    return {
      isValid: false,
      error: `Login musi mieć minimum ${USERNAME_MIN_LENGTH} znaki`
    };
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Login może mieć maksymalnie ${USERNAME_MAX_LENGTH} znaków`
    };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      isValid: false,
      error: 'Login może zawierać tylko litery, cyfry, podkreślenie i myślnik'
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes and validates display name.
 * - Trims whitespace
 * - Removes control characters
 * - Maximum 100 characters (database limit)
 * Returns sanitized string or null if invalid
 */
export function sanitizeDisplayName(displayName: string | undefined | null): string | null {
  if (!displayName) {
    return null;
  }

  // Remove control characters and trim
  const sanitized = displayName
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();

  if (sanitized.length === 0) {
    return null;
  }

  if (sanitized.length > DISPLAY_NAME_MAX_LENGTH) {
    return null;
  }

  return sanitized;
}

/**
 * Validates display name length.
 */
export function validateDisplayName(displayName: string): ValidationResult {
  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Nazwa wyświetlana może mieć maksymalnie ${DISPLAY_NAME_MAX_LENGTH} znaków`
    };
  }

  // Check for control characters
  if (/[\x00-\x1F\x7F]/.test(displayName)) {
    return {
      isValid: false,
      error: 'Nazwa wyświetlana zawiera niedozwolone znaki'
    };
  }

  return { isValid: true };
}

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

// Alias for backward compatibility
export type PasswordValidationResult = ValidationResult;

/**
 * Validates password strength.
 * Requirements:
 * - Minimum 8 characters
 * - Maximum 72 characters (bcrypt limit)
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

  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Hasło może mieć maksymalnie ${PASSWORD_MAX_LENGTH} znaków`
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
  return `${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} znaków, mała litera, wielka litera i cyfra`;
}
