import rawDefaultSchema from './schema/nin-format.json';
import { extractDigits, luhnIsValid } from './luhn';
import type {
  NinCheckName,
  NinErrorCode,
  NinFormatSchema,
  NinValidationChecks,
  NinValidationResult,
} from './types';

/** The bundled, provisional default NIN format schema. */
export const defaultNinFormatSchema = rawDefaultSchema as NinFormatSchema;

/** Options for {@link validateNin}. */
export interface ValidateNinOptions {
  /** Override the bundled default rule set. */
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
  return new RegExp(schema.charset).test(nin);
}

function checkChecksum(nin: string, schema: NinFormatSchema): boolean {
  if (!schema.checksum.enabled) return true; // skipped — not failed
  if (schema.checksum.algorithm === 'luhn') {
    return luhnIsValid(extractDigits(nin));
  }
  return true;
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
 * provisional. Never throws: non-string input is reported as invalid
 * (`INVALID_LENGTH`). See `specs/nin-format-validator.md`.
 */
export function validateNin(
  input: unknown,
  options: ValidateNinOptions = {},
): NinValidationResult {
  const schema = options.schema ?? defaultNinFormatSchema;
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
