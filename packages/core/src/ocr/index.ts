import { resolveEngine } from './engines';
import { normalizeDob } from './normalize-dob';
import { loadZoneMap } from './zone-map';
import type { DocumentType, OcrEngineName, OcrResult } from './types';

export {
  crossCheck,
  nameSimilarity,
  NAME_MATCH_THRESHOLD,
} from './cross-check';
export type { SubmittedFields } from './cross-check';
export { normalizeDob } from './normalize-dob';
export { loadZoneMap, toPixelBox } from './zone-map';
export { resolveEngine } from './engines';

/** Document types the OCR engine can extract in this milestone (M2 = eID only). */
const SUPPORTED: DocumentType[] = ['SL_NATIONAL_EID'];

/** Options for {@link ocr}. */
export interface OcrOptions {
  /** Document type, or `auto` (default) to classify. M2 resolves auto → eID. */
  documentType?: 'auto' | DocumentType;
  /** Override the engine; defaults to `OCR_ENGINE` env, else `tesseract`. */
  engine?: OcrEngineName;
}

/**
 * Extract NIN, name, and DOB from a Sierra Leone ID image and return the
 * `/v1/ocr` response shape (Architecture Spec §5.2). Offline by default
 * (Tesseract); `google-vision` is the only outbound path. Never throws on
 * unreadable/unsupported input — those surface as `error` on the result.
 * See `specs/002-ocr-engine-eid-zone-map/spec.md`.
 */
export async function ocr(
  idImage: Buffer | Uint8Array,
  options: OcrOptions = {},
): Promise<OcrResult> {
  const documentType = classify(options.documentType);
  if (documentType === null) {
    // M2 supports only the eID; passport is M3, everything else out of scope.
    return {
      document_type: 'SL_NATIONAL_EID',
      extracted: null,
      ocr_confidence: 0,
      error: 'DOCUMENT_UNSUPPORTED',
    };
  }

  const image = Buffer.isBuffer(idImage) ? idImage : Buffer.from(idImage);
  const zoneMap = loadZoneMap(documentType);
  const engine = resolveEngine(options.engine);
  const recognition = await engine.recognize(image, zoneMap);

  const nin = recognition.zones.nin ?? '';
  const surname = recognition.zones.surname ?? '';
  const givenName = recognition.zones.given_name ?? '';
  // Given name first, matching the §5.2 `extracted.name` example and how end
  // users typically type their full name.
  const name = `${givenName} ${surname}`.trim();
  const dob = normalizeDob(recognition.zones.dob) ?? '';

  // No usable text in any zone → the image was unreadable.
  if (nin === '' && name === '' && dob === '') {
    return {
      document_type: documentType,
      extracted: null,
      ocr_confidence: recognition.confidence,
      error: 'IMAGE_UNREADABLE',
    };
  }

  return {
    document_type: documentType,
    extracted: { nin, name, dob },
    ocr_confidence: recognition.confidence,
  };
}

/**
 * Resolve the requested document type to a supported one, or null if it cannot
 * be served in M2. `auto` resolves to the eID (the only M2 zone map); a future
 * milestone adds real multi-document classification.
 */
function classify(requested: OcrOptions['documentType']): DocumentType | null {
  if (requested === undefined || requested === 'auto') {
    return 'SL_NATIONAL_EID';
  }
  return SUPPORTED.includes(requested) ? requested : null;
}
