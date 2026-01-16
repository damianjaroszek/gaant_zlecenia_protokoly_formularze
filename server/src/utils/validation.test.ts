import { describe, it, expect } from 'vitest';
import { validatePassword, getPasswordRequirements, PASSWORD_MIN_LENGTH } from './validation';

describe('validatePassword', () => {
  it('should reject empty password', () => {
    const result = validatePassword('');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('minimum');
  });

  it('should reject password shorter than minimum length', () => {
    const result = validatePassword('Abc1');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain(PASSWORD_MIN_LENGTH.toString());
  });

  it('should reject password without lowercase letter', () => {
    const result = validatePassword('ABCD1234');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('małą literę');
  });

  it('should reject password without uppercase letter', () => {
    const result = validatePassword('abcd1234');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('wielką literę');
  });

  it('should reject password without digit', () => {
    const result = validatePassword('Abcdefgh');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('cyfrę');
  });

  it('should accept valid password with all requirements', () => {
    const result = validatePassword('Abcd1234');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept valid password with special characters', () => {
    const result = validatePassword('Abcd1234!@#');
    expect(result.isValid).toBe(true);
  });

  it('should accept password with exactly minimum length', () => {
    const result = validatePassword('Abcdef1!');
    expect(result.isValid).toBe(true);
  });

  it('should accept long password', () => {
    const result = validatePassword('ThisIsAVeryLongPassword123');
    expect(result.isValid).toBe(true);
  });
});

describe('getPasswordRequirements', () => {
  it('should return requirements string', () => {
    const requirements = getPasswordRequirements();
    expect(requirements).toContain(PASSWORD_MIN_LENGTH.toString());
    expect(requirements).toContain('mała litera');
    expect(requirements).toContain('wielka litera');
    expect(requirements).toContain('cyfra');
  });
});

describe('PASSWORD_MIN_LENGTH', () => {
  it('should be 8', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });
});
