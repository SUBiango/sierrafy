/**
 * Luhn (mod-10) checksum helpers.
 *
 * Used by the NIN validator's optional checksum check. The NIN checksum
 * algorithm is unconfirmed (Architecture Spec §12.1), so this is wired but
 * disabled by default; it treats the trailing digit as the check digit.
 */

/** Extract just the decimal digits from a string. */
export function extractDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Validate a string of decimal digits against the Luhn formula.
 * Returns false for empty input or any non-digit character.
 */
export function luhnIsValid(digits: string): boolean {
  if (digits.length === 0) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    const code = digits.charCodeAt(i) - 48; // '0' === 48
    if (code < 0 || code > 9) return false;
    let d = code;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}
