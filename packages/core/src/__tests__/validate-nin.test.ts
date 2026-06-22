import {
  validateNin,
  defaultNinFormatSchema,
  type NinFormatSchema,
  type NinErrorCode,
} from '../index';
import { luhnIsValid, extractDigits } from '../luhn';

// NOTE: all NINs below are synthetic 8-char codes — never the real values from
// the eID samples (those are PII and stay out of the repo).

describe('validateNin — valid samples', () => {
  const validSamples = [
    'ABCD1234',
    'WXYZ5678',
    'QWERTYUI',
    'ASDFGHJK',
    'ZXCVBNM1',
    'AB12CD34',
    '9F8E7D6C',
    '1A2B3C4D',
    'KK00LL11',
    'M9N8B7V6',
    'P0O9I8U7',
  ];

  it.each(validSamples)('accepts %s', (nin) => {
    const result = validateNin(nin);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(Object.values(result.checks).every(Boolean)).toBe(true);
    expect(result.nin).toBe(nin);
  });

  it('has at least 10 valid samples', () => {
    expect(validSamples.length).toBeGreaterThanOrEqual(10);
  });
});

describe('validateNin — malformed inputs map to the correct error code', () => {
  const cases: ReadonlyArray<[string, unknown, NinErrorCode]> = [
    ['too short', 'ABCD123', 'INVALID_LENGTH'],
    ['empty string', '', 'INVALID_LENGTH'],
    ['too long', 'ABCD12345', 'INVALID_LENGTH'],
    ['way too long', 'ABCDEFGHIJ', 'INVALID_LENGTH'],
    ['lowercase', 'abcd1234', 'INVALID_CHARSET'],
    ['mixed case', 'AbCd1234', 'INVALID_CHARSET'],
    ['contains space', 'ABCD 234', 'INVALID_CHARSET'],
    ['contains hyphen', 'ABCD-234', 'INVALID_CHARSET'],
    ['symbol', 'ABCD123!', 'INVALID_CHARSET'],
    ['at-sign', 'ABCD12@4', 'INVALID_CHARSET'],
  ];

  it.each(cases)('%s → %s', (_label, input, expected) => {
    const result = validateNin(input);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(expected);
    expect(result.checks[checkForError(expected)]).toBe(false);
  });

  it('has at least 10 malformed cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(10);
  });

  it('treats non-string input as INVALID_LENGTH without throwing', () => {
    for (const input of [undefined, null, 12345678, {}, []]) {
      const result = validateNin(input);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_LENGTH');
    }
  });
});

describe('validateNin — schema configurability (no code change)', () => {
  it('honours a changed length (8 → 10) via the schema alone', () => {
    const schema10: NinFormatSchema = { ...defaultNinFormatSchema, length: 10 };

    // A 10-char NIN is valid under the edited schema...
    expect(validateNin('ABCD123456', { schema: schema10 }).valid).toBe(true);

    // ...and the canonical 8-char NIN now fails the length check.
    const eight = validateNin('ABCD1234', { schema: schema10 });
    expect(eight.valid).toBe(false);
    expect(eight.error).toBe('INVALID_LENGTH');

    // Sanity: the same 8-char NIN is valid under the default schema.
    expect(validateNin('ABCD1234').valid).toBe(true);
  });

  it('honours a changed charset via the schema alone', () => {
    const lower: NinFormatSchema = {
      ...defaultNinFormatSchema,
      charset: '^[a-z0-9]+$',
    };
    expect(validateNin('abcd1234', { schema: lower }).valid).toBe(true);
    // Still rejected under the default (uppercase-only) schema.
    expect(validateNin('abcd1234').error).toBe('INVALID_CHARSET');
  });
});

describe('validateNin — blacklist', () => {
  it('rejects a format-valid but blacklisted NIN with the blacklist reason', () => {
    const schema: NinFormatSchema = {
      ...defaultNinFormatSchema,
      blacklist: ['ABCD1234'],
    };
    const result = validateNin('ABCD1234', { schema });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('BLACKLISTED');
    // All format checks passed; only the blacklist check failed.
    expect(result.checks.length).toBe(true);
    expect(result.checks.charset).toBe(true);
    expect(result.checks.checksum).toBe(true);
    expect(result.checks.blacklist).toBe(false);
  });
});

describe('validateNin — checksum toggle', () => {
  // Build an 8-char NIN whose extracted digits are NOT Luhn-valid.
  const notLuhn = (() => {
    for (let d = 0; d <= 9; d++) {
      const candidate = `ABCD123${d}`;
      if (!luhnIsValid(extractDigits(candidate))) return candidate;
    }
    throw new Error('expected at least one non-Luhn candidate');
  })();

  it('skips the checksum when disabled (default)', () => {
    const result = validateNin(notLuhn);
    expect(result.checks.checksum).toBe(true); // skipped, reported as pass
    expect(result.valid).toBe(true);
  });

  it('enforces the checksum when enabled', () => {
    const schema: NinFormatSchema = {
      ...defaultNinFormatSchema,
      checksum: { enabled: true, algorithm: 'luhn' },
    };
    const failing = validateNin(notLuhn, { schema });
    expect(failing.checks.checksum).toBe(false);
    expect(failing.error).toBe('INVALID_CHECKSUM');

    // A NIN whose digits ARE Luhn-valid passes the checksum check.
    const luhnValid = (() => {
      for (let d = 0; d <= 9; d++) {
        const candidate = `ABCD123${d}`;
        if (luhnIsValid(extractDigits(candidate))) return candidate;
      }
      throw new Error('expected at least one Luhn-valid candidate');
    })();
    const passing = validateNin(luhnValid, { schema });
    expect(passing.checks.checksum).toBe(true);
    expect(passing.valid).toBe(true);
  });
});

describe('luhnIsValid', () => {
  it('accepts known-valid numbers and rejects invalid ones', () => {
    expect(luhnIsValid('4539148803436467')).toBe(true); // classic Luhn-valid
    expect(luhnIsValid('79927398713')).toBe(true);
    expect(luhnIsValid('79927398710')).toBe(false);
    expect(luhnIsValid('')).toBe(false);
    expect(luhnIsValid('12a4')).toBe(false); // non-digit guard
    expect(luhnIsValid('18')).toBe(true); // 1 doubled = 2 (no subtract) + 8 = 10
  });

  it('extractDigits strips non-digits', () => {
    expect(extractDigits('AB12CD34')).toBe('1234');
  });
});

/** Map an error code back to its check name for assertion. */
function checkForError(error: NinErrorCode) {
  const map = {
    INVALID_LENGTH: 'length',
    INVALID_CHARSET: 'charset',
    INVALID_CHECKSUM: 'checksum',
    BLACKLISTED: 'blacklist',
  } as const;
  return map[error];
}
