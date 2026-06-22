/**
 * @sierrafy/sdk — core SDK.
 *
 * Phase 1: M1 ships the NIN format validator (this module). OCR and fraud
 * checks follow in later milestones.
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
