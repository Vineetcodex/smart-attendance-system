/**
 * Normalizes and validates Employee ID for registration.
 * Allowed: DRP01 to DRP10 (case-insensitive, optional spaces/hyphens).
 * Accepts: "DRP01", "DRP 01", "drp01", "drp 1", "DRP1", "DRP 10", "drp-07", etc.
 * Normalizes to standard: "DRP01", "DRP02", ..., "DRP10".
 */
export function validateAndNormalizeEmployeeCode(rawCode: string): {
  isValid: boolean;
  normalizedCode: string;
  error?: string;
} {
  if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
    return {
      isValid: false,
      normalizedCode: '',
      error: 'Employee ID is required (must be between DRP01 and DRP10).',
    };
  }

  const cleaned = rawCode.trim().toUpperCase().replace(/[\s\-_]/g, '');
  const match = cleaned.match(/^DRP(0?[1-9]|10)$/);
  if (!match) {
    return {
      isValid: false,
      normalizedCode: '',
      error: 'Registration restricted: Employee ID must be between DRP01 and DRP10 (e.g. DRP01, DRP02, ... DRP10). Spaces like "DRP 01" or "DRP01" are both accepted.',
    };
  }

  const num = parseInt(match[1], 10);
  if (num < 1 || num > 10) {
    return {
      isValid: false,
      normalizedCode: '',
      error: 'Registration restricted: Employee ID must be between DRP01 and DRP10 (e.g. DRP01, DRP02, ... DRP10).',
    };
  }

  const formattedNum = num < 10 ? `0${num}` : `${num}`;
  return {
    isValid: true,
    normalizedCode: `DRP${formattedNum}`,
  };
}
