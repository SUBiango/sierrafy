/**
 * `@sierrafy/sdk/nin` — the NIN format validator on its own.
 *
 * Importing this subpath pulls in no OCR code and therefore neither `sharp` nor
 * `tesseract.js`, so the lightweight `/v1/validate-nin` path stays lightweight
 * (spec §1). It is also dependency-free and isomorphic: safe in the browser and
 * React Native. Import the package root instead if you want OCR as well.
 */

export {
  validateNin,
  defaultNinFormatSchema,
  type ValidateNinOptions,
} from './validate-nin';
export {
  loadNinFormatSchema,
  assertValidNinFormatSchema,
  InvalidNinFormatSchemaError,
} from './nin-format-schema';
export { luhnIsValid, extractDigits } from './luhn';
export { CHECKSUM_ALGORITHMS } from './types';
export type {
  ChecksumAlgorithm,
  NinCheckName,
  NinErrorCode,
  NinFormatSchema,
  NinValidationChecks,
  NinValidationResult,
} from './types';
