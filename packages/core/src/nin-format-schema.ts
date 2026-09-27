/**
 * Validation and loading for the external NIN format schema.
 *
 * The schema (`schema/nin-format.json`) is the one input the validator's design
 * invites people to edit by hand, so a typo there must fail loudly at
 * *configuration* time with a message that names the problem — not incidentally,
 * deep inside `validateNin`, as a raw `SyntaxError` or `TypeError` on the
 * request path. Same convention as `ocr/zone-map.ts`: a malformed asset is a
 * developer error and throws; end-user input never does.
 *
 * Deliberately free of `node:fs` so the validator stays isomorphic for the
 * browser and React Native SDKs — callers supply JSON text or a parsed object.
 */
import { CHECKSUM_ALGORITHMS } from './types';
import type { ChecksumAlgorithm, NinFormatSchema } from './types';

/** Thrown when a NIN format schema is structurally unusable. */
export class InvalidNinFormatSchemaError extends Error {
  /** Where the schema came from, for pinpointing a bad edit. */
  readonly origin: string;

  constructor(problem: string, origin: string) {
    super(`Invalid NIN format schema (${origin}): ${problem}`);
    this.name = 'InvalidNinFormatSchemaError';
    this.origin = origin;
  }
}

/** Compiled charset regexes, keyed by pattern source — compiled once, not per call. */
const CHARSET_CACHE = new Map<string, RegExp>();

/** Schemas already validated, so repeat `validateNin` calls don't re-check. */
const VALIDATED = new WeakSet<object>();

/**
 * Validate and freeze a NIN format schema, supplied as JSON text or an already
 * parsed object. Throws {@link InvalidNinFormatSchemaError} describing the first
 * problem found.
 *
 * This is the supported way to configure the validator from outside the package
 * — editing the copy inside `node_modules` is not. Pass the result as
 * `validateNin(nin, { schema })`.
 *
 * @example
 * ```ts
 * import { readFileSync } from 'node:fs';
 * const schema = loadNinFormatSchema(readFileSync('./nin-format.json', 'utf8'));
 * ```
 */
export function loadNinFormatSchema(
  source: string | object,
  options: { origin?: string } = {},
): NinFormatSchema {
  const origin =
    options.origin ?? (typeof source === 'string' ? '<json>' : '<object>');
  let parsed: unknown = source;
  if (typeof source === 'string') {
    try {
      parsed = JSON.parse(source);
    } catch (cause) {
      throw new InvalidNinFormatSchemaError(
        `not valid JSON — ${(cause as Error).message}`,
        origin,
      );
    }
  }
  const schema = assertValidNinFormatSchema(parsed, origin);
  return freezeSchema(schema);
}

/**
 * Validate an unknown value as a {@link NinFormatSchema} and return it narrowed.
 * Throws {@link InvalidNinFormatSchemaError} on the first problem.
 */
export function assertValidNinFormatSchema(
  value: unknown,
  origin = '<inline>',
): NinFormatSchema {
  const fail = (problem: string): never => {
    throw new InvalidNinFormatSchemaError(problem, origin);
  };

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(`expected a JSON object, got ${describe(value)}`);
  }
  const s = value as Record<string, unknown>;

  if (typeof s.version !== 'string' || s.version.trim() === '') {
    return fail('"version" must be a non-empty string');
  }
  if (s.description !== undefined && typeof s.description !== 'string') {
    return fail('"description" must be a string when present');
  }
  if (
    typeof s.length !== 'number' ||
    !Number.isInteger(s.length) ||
    s.length < 1
  ) {
    return fail(
      `"length" must be a positive integer, got ${describe(s.length)}`,
    );
  }

  if (typeof s.charset !== 'string' || s.charset === '') {
    return fail('"charset" must be a non-empty regex source string');
  }
  // An unanchored charset matches a *substring*, so junk slips through in the
  // fail-open direction (e.g. "[A-Z0-9]+" accepts "abc!@#12" via "12").
  // Requiring the anchors literally is a coarse check — it can't catch an
  // alternation that is anchored only on one branch — but it catches the
  // mistake people actually make, and it names the fix.
  if (!s.charset.startsWith('^') || !s.charset.endsWith('$')) {
    return fail(
      `"charset" must be anchored with ^ and $ (got ${JSON.stringify(s.charset)}) — ` +
        'an unanchored pattern matches a substring and would accept invalid NINs',
    );
  }
  try {
    compileCharset(s.charset);
  } catch (cause) {
    return fail(`"charset" is not a valid regex — ${(cause as Error).message}`);
  }

  const checksum = s.checksum;
  if (
    typeof checksum !== 'object' ||
    checksum === null ||
    Array.isArray(checksum)
  ) {
    return fail('"checksum" must be an object with "enabled" and "algorithm"');
  }
  const c = checksum as Record<string, unknown>;
  if (typeof c.enabled !== 'boolean') {
    return fail('"checksum.enabled" must be a boolean');
  }
  // Fail closed: an unrecognised algorithm must not silently report a pass.
  if (!isChecksumAlgorithm(c.algorithm)) {
    return fail(
      `"checksum.algorithm" must be one of ${CHECKSUM_ALGORITHMS.join(', ')}, ` +
        `got ${describe(c.algorithm)}`,
    );
  }

  if (
    !Array.isArray(s.blacklist) ||
    s.blacklist.some((entry) => typeof entry !== 'string')
  ) {
    return fail('"blacklist" must be an array of strings');
  }

  return value as NinFormatSchema;
}

/**
 * Validate `schema` unless it has been validated before. Keeps the per-call cost
 * of a caller-supplied schema at one `WeakSet` lookup.
 */
export function ensureValidatedSchema(
  schema: NinFormatSchema,
  origin = '<options.schema>',
): NinFormatSchema {
  if (VALIDATED.has(schema)) return schema;
  assertValidNinFormatSchema(schema, origin);
  VALIDATED.add(schema);
  return schema;
}

/** Compile (and memoise) a charset pattern. */
export function compileCharset(pattern: string): RegExp {
  const cached = CHARSET_CACHE.get(pattern);
  if (cached !== undefined) return cached;
  const compiled = new RegExp(pattern);
  CHARSET_CACHE.set(pattern, compiled);
  return compiled;
}

function isChecksumAlgorithm(value: unknown): value is ChecksumAlgorithm {
  return (
    typeof value === 'string' &&
    (CHECKSUM_ALGORITHMS as readonly string[]).includes(value)
  );
}

/** Freeze the schema and its nested members so a shared instance can't drift. */
function freezeSchema(schema: NinFormatSchema): NinFormatSchema {
  Object.freeze(schema.checksum);
  Object.freeze(schema.blacklist);
  const frozen = Object.freeze(schema);
  VALIDATED.add(frozen);
  return frozen;
}

/** Short, safe description of an unexpected value for an error message. */
function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'object') return 'an object';
  return String(value);
}
