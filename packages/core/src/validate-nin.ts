import rawDefaultSchema from './schema/nin-format.json';
import { extractDigits, luhnIsValid } from './luhn';
import {
  assertValidNinFormatSchema,
  compileCharset,
  ensureValidatedSchema,
} from './nin-format-schema';
import type {
  NinCheckName,
  NinErrorCode,
  NinFormatSchema,
  NinValidationChecks,
  NinValidationResult,
} from './types';

/**
 * The bundled, provisional default NIN format schema.
 *
 * Validated at module load, so a bad hand-edit of `schema/nin-format.json`
 * fails immediately with a message naming the field — rather than surfacing as
 * a confusing throw on the first validation call.
 */
export const defaultNinFormatSchema: NinFormatSchema =
  assertValidNinFormatSchema(rawDefaultSchema, 'schema/nin-format.json');

/** Options for {@link validateNin}. */
export interface ValidateNinOptions {
  /**
   * Override the bundled default rule set. Validated on first use; pass a schema
   * from `loadNinFormatSchema` to have it checked up front instead.
   */
  schema?: NinFormatSchema;
}

/** Precedence order: the first failing check determines `error`. */
const CHECK_ORDER: NinCheckName[] = [
  'length',
  'charset',
  'checksum',
  'blacklist',
];

const ERROR_BY_CHECK: Record<NinCheckName, NinErrorCode> = {
  length: 'INVALID_LENGTH',
  charset: 'INVALID_CHARSET',
  checksum: 'INVALID_CHECKSUM',
  blacklist: 'BLACKLISTED',
};

function checkLength(nin: string, schema: NinFormatSchema): boolean {
  return nin.length === schema.length;
}

function checkCharset(nin: string, schema: NinFormatSchema): boolean {
  return compileCharset(schema.charset).test(nin);
}

function checkChecksum(nin: string, schema: NinFormatSchema): boolean {
  if (!schema.checksum.enabled) return true; // skipped — not failed
  switch (schema.checksum.algorithm) {
    case 'luhn':
      // NOTE: Luhn runs over the NIN's decimal digits only, so an all-letter
      // NIN — a shape seen on a real card — has no digits and FAILS. Luhn is a
      // placeholder; see the warning on `checksum.enabled` in the schema file.
      return luhnIsValid(extractDigits(nin));
    /* istanbul ignore next -- unreachable through the public API: the schema
       validator rejects unknown algorithms before a schema ever gets here (see
       "checksum fails closed" in nin-format-schema.test.ts). Kept as a
       fail-closed guard so a newly declared algorithm cannot silently report a
       pass if someone forgets to handle it. */
    default:
      return false;
  }
}

function checkBlacklist(nin: string, schema: NinFormatSchema): boolean {
  return !schema.blacklist.includes(nin);
}

/**
 * Validate a candidate Sierra Leone NIN against a (provisional) format schema.
 *
 * Offline, structural validation only — it does not confirm the NIN exists in
 * the NCRA registry. The default format (8-char uppercase alphanumeric) is
 * derived from real eID card samples; charset/checksum specifics are still
 * provisional.
 *
 * **Never throws for any `input`** — non-string input is reported as invalid
 * (`INVALID_LENGTH`). A structurally broken `options.schema` is a developer
 * error, not end-user input, and does throw `InvalidNinFormatSchemaError` (the
 * same convention as `loadZoneMap`).
 *
 * See `specs/001-nin-format-validator/nin-format-validator.md`.
 */
export function validateNin(
  input: unknown,
  options: ValidateNinOptions = {},
): NinValidationResult {
  const schema =
    options.schema === undefined
      ? defaultNinFormatSchema
      : ensureValidatedSchema(options.schema);
  const nin = typeof input === 'string' ? input : '';

  const checks: NinValidationChecks = {
    length: checkLength(nin, schema),
    charset: checkCharset(nin, schema),
    checksum: checkChecksum(nin, schema),
    blacklist: checkBlacklist(nin, schema),
  };

  const failed = CHECK_ORDER.find((name) => !checks[name]);
  const result: NinValidationResult = {
    valid: failed === undefined,
    nin,
    checks,
  };
  if (failed !== undefined) {
    result.error = ERROR_BY_CHECK[failed];
  }
  return result;
}
