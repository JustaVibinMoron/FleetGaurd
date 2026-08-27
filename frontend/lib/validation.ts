/** Form validation helpers used by Sign In / Sign Up. */

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function minLength(value: string, size: number) {
  return value.trim().length >= size;
}

export function passwordsMatch(a: string, b: string) {
  return a === b && a.length > 0;
}

export type FieldErrors = Record<string, string>;
