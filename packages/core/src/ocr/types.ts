/**
 * Types for the OCR engine (M2). Mirrors the `/v1/ocr` response shape
 * (Architecture Spec §5.2) and the `crossCheck` contract (§4.2.4).
 * See `specs/002-ocr-engine-eid-zone-map/spec.md`.
 */

/** Supported document types in Phase 1. Passport (M3) is declared but not wired in M2. */
export type DocumentType = 'SL_NATIONAL_EID' | 'SL_PASSPORT';

/** Which OCR backend to use. `tesseract` is offline and the default. */
export type OcrEngineName = 'tesseract' | 'google-vision';

/** Error reported on the OCR result (mirrors M1's error-as-field pattern). */
export type OcrErrorCode = 'IMAGE_UNREADABLE' | 'DOCUMENT_UNSUPPORTED';

/** A relative bounding box on the card: fractions (0–1) of width/height. */
export interface ZoneBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * External, editable layout map for a document type. Coordinates are relative
 * (0–1). For the eID it includes `document_number` and `expiry` — the BAC-key
 * inputs the NFC layer needs in Week 14 — beyond the §4.2.3 fields.
 */
export interface ZoneMap {
  document_type: DocumentType;
  /** True while coordinates are estimated and not yet calibrated against ≥10 samples (§12.2). */
  provisional?: boolean;
  zones: Record<string, ZoneBox>;
}

/** Public fields returned in the `/v1/ocr` `extracted` body. */
export interface ExtractedFields {
  nin: string;
  name: string;
  /** ISO 8601 `YYYY-MM-DD`, or empty string if not parseable. */
  dob: string;
}

/** Result of {@link ocr}. On failure, `error` is set and `extracted` is null. */
export interface OcrResult {
  document_type: DocumentType;
  extracted: ExtractedFields | null;
  ocr_confidence: number;
  error?: OcrErrorCode;
}

/** Result of {@link crossCheck}: card data vs the user-submitted values. */
export interface CrossCheckResult {
  nin_format_valid: boolean;
  nin_matches_card: boolean;
  /** Levenshtein similarity 0–1; passes at ≥0.85 (§4.2.4). */
  name_match_score: number;
  dob_match: boolean;
}

/** Raw per-zone recognition output produced by an engine before assembly. */
export interface RecognitionResult {
  /** Recognised text keyed by zone name. */
  zones: Record<string, string>;
  /** Aggregate confidence 0–1 across recognised zones. */
  confidence: number;
}

/** An OCR backend: turns an image + zone map into per-zone text. */
export interface OcrEngine {
  name: OcrEngineName;
  recognize(image: Buffer, zoneMap: ZoneMap): Promise<RecognitionResult>;
}
