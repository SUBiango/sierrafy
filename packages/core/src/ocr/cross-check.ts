import { distance } from 'fastest-levenshtein';
import { validateNin } from '../validate-nin';
import { normalizeDob } from './normalize-dob';
import type { CrossCheckResult, ExtractedFields } from './types';

/** Names matching at or above this Levenshtein similarity pass (§4.2.4). */
export const NAME_MATCH_THRESHOLD = 0.85;

/** Values the developer's end user submitted, to check against the card. */
export interface SubmittedFields {
  nin: string;
  name: string;
  dob: string;
}

/**
 * Cross-check OCR-extracted card data against user-submitted values (§4.2.4):
 * NIN exact match, name fuzzy (Levenshtein ≥ {@link NAME_MATCH_THRESHOLD}),
 * DOB exact after normalisation. `nin_format_valid` reuses the M1 validator.
 */
export function crossCheck(
  extracted: ExtractedFields,
  submitted: SubmittedFields,
): CrossCheckResult {
  const cardDob = normalizeDob(extracted.dob);
  const submittedDob = normalizeDob(submitted.dob);

  return {
    nin_format_valid: validateNin(submitted.nin).valid,
    nin_matches_card: extracted.nin === submitted.nin,
    name_match_score: nameSimilarity(extracted.name, submitted.name),
    dob_match: cardDob !== null && cardDob === submittedDob,
  };
}

/** Case-insensitive, whitespace-normalised Levenshtein similarity (0–1). */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === '' && nb === '') return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 0;
  return 1 - distance(na, nb) / maxLen;
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}
