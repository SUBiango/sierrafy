import type {
  OcrEngine,
  OcrEngineName,
  TesseractEngineOptions,
} from '../types';
import { createTesseractEngine } from './tesseract';
import { createGoogleVisionEngine } from './google-vision';

export { createTesseractEngine } from './tesseract';
export { createGoogleVisionEngine } from './google-vision';

/**
 * Resolve which OCR engine to use. Precedence: explicit `name` argument, then
 * the `OCR_ENGINE` env var, then the default `tesseract`, which recognises
 * locally.
 *
 * `google-vision` is the only engine that sends identity data anywhere, and
 * only when explicitly selected. The `tesseract` default may still fetch its
 * language model once, carrying no identity data; a local model via
 * `tesseract.cachePath` removes even that (see {@link TesseractEngineOptions}).
 */
export function resolveEngine(
  name?: OcrEngineName,
  tesseract: TesseractEngineOptions = {},
): OcrEngine {
  const selected =
    name ?? (process.env.OCR_ENGINE as OcrEngineName) ?? 'tesseract';
  switch (selected) {
    case 'google-vision':
      return createGoogleVisionEngine();
    case 'tesseract':
      return createTesseractEngine(tesseract);
    default:
      throw new Error(`Unknown OCR_ENGINE: ${selected}`);
  }
}
