import { normalizeDob } from '../normalize-dob';

describe('normalizeDob', () => {
  // AC #2: the canonical conversion from the spec.
  it('converts DD/MM/YYYY to ISO YYYY-MM-DD', () => {
    expect(normalizeDob('17/04/1992')).toBe('1992-04-17');
  });

  it('accepts DD-MM-YYYY and single-digit day/month', () => {
    expect(normalizeDob('17-04-1992')).toBe('1992-04-17');
    expect(normalizeDob('5/4/1992')).toBe('1992-04-05');
  });

  it('passes through valid ISO dates unchanged', () => {
    expect(normalizeDob('1992-04-17')).toBe('1992-04-17');
  });

  it('returns null for malformed or out-of-range dates', () => {
    for (const bad of [
      '',
      '   ',
      'not-a-date',
      '32/01/1992', // day out of range
      '17/13/1992', // month out of range
      '1992/04/17', // wrong order
      '17/04/92', // 2-digit year
    ]) {
      expect(normalizeDob(bad)).toBeNull();
    }
  });

  it('returns null for non-string input without throwing', () => {
    expect(normalizeDob(undefined)).toBeNull();
    expect(normalizeDob(19920417)).toBeNull();
  });
});
