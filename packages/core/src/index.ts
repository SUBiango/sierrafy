/**
 * @sierrafy/sdk — core SDK.
 *
 * Phase 1: M1 ships the NIN format validator; M2 adds the OCR engine + eID
 * zone map (this and the `./ocr` module). Fraud checks follow in M5.
 */

export {
  validateNin,
  defaultNinFormatSchema,
  type ValidateNinOptions,
} from './validate-nin';
export { luhnIsValid, extractDigits } from './luhn';
export type {
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
