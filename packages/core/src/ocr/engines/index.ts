import type { OcrEngine, OcrEngineName } from '../types';
import { createTesseractEngine } from './tesseract';
import { createGoogleVisionEngine } from './google-vision';

export { createTesseractEngine } from './tesseract';
export { createGoogleVisionEngine } from './google-vision';

/**
 * Resolve which OCR engine to use. Precedence: explicit `name` argument, then
 * the `OCR_ENGINE` env var, then the default `tesseract` (offline). Only
 * `google-vision` makes outbound calls, and only when explicitly selected.
 */
export function resolveEngine(name?: OcrEngineName): OcrEngine {
  const selected =
    name ?? (process.env.OCR_ENGINE as OcrEngineName) ?? 'tesseract';
  switch (selected) {
    case 'google-vision':
      return createGoogleVisionEngine();
    case 'tesseract':
      return createTesseractEngine();
    default:
      throw new Error(`Unknown OCR_ENGINE: ${selected}`);
  }
}
