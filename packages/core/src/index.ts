/**
 * @sierrafy/sdk — core SDK.
 *
 * Phase 1: M1 ships the NIN format validator; M2 adds the OCR engine + eID
 * zone map (this and the `./ocr` module). Fraud checks follow in M5.
 *
 * Subpaths: `@sierrafy/sdk/nin` is the validator alone (no OCR, no `sharp` or
 * `tesseract.js`); `@sierrafy/sdk/ocr` is the OCR engine alone.
 */

// M1 — NIN format validator. Also available on its own at `@sierrafy/sdk/nin`.
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

// M2 — OCR engine + National eID zone map.
export {
  ocr,
  crossCheck,
  nameSimilarity,
  normalizeDob,
  loadZoneMap,
  toPixelBox,
  resolveEngine,
  NAME_MATCH_THRESHOLD,
  type OcrOptions,
  type SubmittedFields,
} from './ocr';
export type {
  DocumentType,
  OcrEngineName,
  OcrErrorCode,
  ZoneBox,
  ZoneMap,
  ExtractedFields,
  OcrResult,
  CrossCheckResult,
  RecognitionResult,
  OcrEngine,
} from './ocr/types';
