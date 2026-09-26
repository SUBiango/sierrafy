import {
  validateNin,
  defaultNinFormatSchema,
  loadNinFormatSchema,
  assertValidNinFormatSchema,
  InvalidNinFormatSchemaError,
  CHECKSUM_ALGORITHMS,
  type NinFormatSchema,
} from '../index';

// NOTE: all NINs below are synthetic 8-char codes — never the real values from
// the eID samples (those are PII and stay out of the repo).

/** A structurally valid schema to mutate one field at a time. */
const base = (): Record<string, unknown> => ({
  version: '0.3.0-provisional',
  length: 8,
  charset: '^[A-Z0-9]+$',
  checksum: { enabled: false, algorithm: 'luhn' },
  blacklist: [],
});

describe('the bundled default schema', () => {
  it('passes its own validation and is frozen against mutation', () => {
    expect(() =>
      assertValidNinFormatSchema(defaultNinFormatSchema, 'default'),
    ).not.toThrow();
    expect(defaultNinFormatSchema.length).toBe(8);
    expect(defaultNinFormatSchema.charset).toBe('^[A-Z0-9]+$');
    expect(defaultNinFormatSchema.checksum.enabled).toBe(false);
  });

  it('documents the Luhn placeholder caveat so nobody enables it blind', () => {
    // The warning is load-bearing: enabling Luhn rejects all-letter NINs.
    expect(defaultNinFormatSchema.description).toMatch(/all-letter/i);
    expect(defaultNinFormatSchema.description).toMatch(/placeholder/i);
  });
});

describe('assertValidNinFormatSchema — rejects unusable schemas', () => {
  const cases: ReadonlyArray<[string, unknown, RegExp]> = [
    ['not an object', 'nope', /expected a JSON object/],
    ['null', null, /expected a JSON object/],
    ['an array', [], /expected a JSON object/],
    ['missing version', { ...base(), version: undefined }, /"version"/],
    ['blank version', { ...base(), version: '  ' }, /"version"/],
    ['non-string description', { ...base(), description: 7 }, /"description"/],
    ['missing length', { ...base(), length: undefined }, /"length"/],
    ['zero length', { ...base(), length: 0 }, /"length"/],
    ['fractional length', { ...base(), length: 8.5 }, /"length"/],
    ['string length', { ...base(), length: '8' }, /"length"/],
    ['missing charset', { ...base(), charset: undefined }, /"charset"/],
    ['empty charset', { ...base(), charset: '' }, /"charset"/],
    ['missing checksum', { ...base(), checksum: undefined }, /"checksum"/],
    [
      'non-boolean checksum.enabled',
      { ...base(), checksum: { enabled: 'yes', algorithm: 'luhn' } },
      /"checksum\.enabled"/,
    ],
    ['missing blacklist', { ...base(), blacklist: undefined }, /"blacklist"/],
    ['blacklist of non-strings', { ...base(), blacklist: [7] }, /"blacklist"/],
  ];

  it.each(cases)('%s', (_label, value, expected) => {
    expect(() => assertValidNinFormatSchema(value, 'test')).toThrow(
      InvalidNinFormatSchemaError,
    );
    expect(() => assertValidNinFormatSchema(value, 'test')).toThrow(expected);
  });

  it('names the origin so a bad edit is traceable', () => {
    try {
      assertValidNinFormatSchema({ ...base(), length: -1 }, 'my-schema.json');
      throw new Error('expected a throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidNinFormatSchemaError);
      const e = error as InvalidNinFormatSchemaError;
      expect(e.origin).toBe('my-schema.json');
      expect(e.message).toContain('my-schema.json');
      expect(e.name).toBe('InvalidNinFormatSchemaError');
    }
  });
});

describe('assertValidNinFormatSchema — charset safety', () => {
  // An unanchored pattern matches a *substring*, so it accepts invalid NINs.
  it.each(['[A-Z0-9]+', '^[A-Z0-9]+', '[A-Z0-9]+$', '[A-Z0-9]{8}'])(
    'rejects the unanchored charset %s',
    (charset) => {
      expect(() =>
        assertValidNinFormatSchema({ ...base(), charset }, 'test'),
      ).toThrow(/anchored with \^ and \$/);
    },
  );

  it('rejects a charset that is not a compilable regex', () => {
    expect(() =>
      assertValidNinFormatSchema({ ...base(), charset: '^[A-Z$' }, 'test'),
    ).toThrow(/not a valid regex/);
  });

  it('accepts anchored alternatives', () => {
    for (const charset of ['^[A-Z0-9]{8}$', '^[A-Z]{2}[0-9]{6}$']) {
      expect(() =>
        assertValidNinFormatSchema({ ...base(), charset }, 'test'),
      ).not.toThrow();
    }
  });
});

describe('assertValidNinFormatSchema — checksum fails closed', () => {
  it('rejects an unrecognised algorithm rather than silently passing it', () => {
    expect(() =>
      assertValidNinFormatSchema(
        { ...base(), checksum: { enabled: true, algorithm: 'mod97' } },
        'test',
      ),
    ).toThrow(/"checksum\.algorithm" must be one of luhn/);
  });

  it('accepts every declared algorithm', () => {
    for (const algorithm of CHECKSUM_ALGORITHMS) {
      expect(() =>
        assertValidNinFormatSchema(
          { ...base(), checksum: { enabled: true, algorithm } },
          'test',
        ),
      ).not.toThrow();
    }
  });
});

describe('validateNin — a broken schema fails loudly, not on the request path', () => {
  // Regression: these used to escape as a bare SyntaxError / TypeError from
  // inside the checks, which is what a hand-edit of the JSON produces.
  it('throws a typed error for an uncompilable charset', () => {
    const broken = { ...defaultNinFormatSchema, charset: '^[A-Z' };
    expect(() => validateNin('ABCD1234', { schema: broken })).toThrow(
      InvalidNinFormatSchemaError,
    );
    expect(() => validateNin('ABCD1234', { schema: broken })).not.toThrow(
      SyntaxError,
    );
  });

  it('throws a typed error when a required key was dropped', () => {
    const partial = {
      version: 'x',
      length: 8,
      charset: '^[A-Z0-9]+$',
      checksum: { enabled: false, algorithm: 'luhn' },
    } as unknown as NinFormatSchema;
    expect(() => validateNin('ABCD1234', { schema: partial })).toThrow(
      /"blacklist"/,
    );
  });

  it('still never throws for any input under a valid schema', () => {
    const inputs: unknown[] = [
      undefined,
      null,
      12345678,
      {},
      [],
      Symbol('x'),
      () => 'ABCD1234',
      new Date(0),
      NaN,
      'ABCD1234',
    ];
    for (const input of inputs) {
      expect(() => validateNin(input)).not.toThrow();
    }
  });
});

describe('loadNinFormatSchema', () => {
  it('parses, validates, and freezes JSON text', () => {
    const schema = loadNinFormatSchema(JSON.stringify(base()), {
      origin: 'my-nin-format.json',
    });
    expect(schema.length).toBe(8);
    expect(Object.isFrozen(schema)).toBe(true);
    expect(Object.isFrozen(schema.checksum)).toBe(true);
    expect(Object.isFrozen(schema.blacklist)).toBe(true);
    // And it is usable as a drop-in override.
    expect(validateNin('ABCD1234', { schema }).valid).toBe(true);
  });

  it('accepts an already-parsed object', () => {
    const schema = loadNinFormatSchema({ ...base(), length: 10 });
    expect(validateNin('ABCD123456', { schema }).valid).toBe(true);
    expect(validateNin('ABCD1234', { schema }).error).toBe('INVALID_LENGTH');
  });

  it('reports invalid JSON text with the origin, not a raw SyntaxError', () => {
    expect(() =>
      loadNinFormatSchema('{ "length": 8, ', { origin: 'typo.json' }),
    ).toThrow(InvalidNinFormatSchemaError);
    expect(() => loadNinFormatSchema('{ "length": 8, ')).toThrow(
      /not valid JSON/,
    );
  });

  it('propagates schema problems with the caller-supplied origin', () => {
    expect(() =>
      loadNinFormatSchema(
        { ...base(), charset: 'A-Z' },
        {
          origin: 'ops/nin-format.json',
        },
      ),
    ).toThrow(/ops\/nin-format\.json/);
  });
});
