import {
  crossCheck,
  nameSimilarity,
  NAME_MATCH_THRESHOLD,
} from '../cross-check';
import type { ExtractedFields } from '../types';

// Synthetic data only — no real NINs/PII (per M1 rule and .gitignore).
const card: ExtractedFields = {
  nin: 'ABCD1234',
  name: 'AMINATA KAMARA',
  dob: '1992-04-17',
};

describe('crossCheck — NIN (AC #3)', () => {
  it('matches when the submitted NIN equals the card NIN', () => {
    const result = crossCheck(card, {
      nin: 'ABCD1234',
      name: 'Aminata Kamara',
      dob: '17/04/1992',
    });
    expect(result.nin_matches_card).toBe(true);
    expect(result.nin_format_valid).toBe(true);
  });

  it('does not match a deliberately different NIN', () => {
    const result = crossCheck(card, {
      nin: 'WXYZ9999',
      name: 'Aminata Kamara',
      dob: '17/04/1992',
    });
    expect(result.nin_matches_card).toBe(false);
  });
});

describe('crossCheck — name (AC #4)', () => {
  it('passes for case/spacing variation of the same name', () => {
    const result = crossCheck(card, {
      nin: 'ABCD1234',
      name: 'Aminata Kamara',
      dob: '17/04/1992',
    });
    expect(result.name_match_score).toBeGreaterThanOrEqual(
      NAME_MATCH_THRESHOLD,
    );
  });

  it('fails for a clearly different name', () => {
    const result = crossCheck(card, {
      nin: 'ABCD1234',
      name: 'Mohamed Sesay',
      dob: '17/04/1992',
    });
    expect(result.name_match_score).toBeLessThan(NAME_MATCH_THRESHOLD);
  });
});

describe('crossCheck — DOB', () => {
  it('matches once both sides normalise to the same ISO date', () => {
    const result = crossCheck(card, {
      nin: 'ABCD1234',
      name: 'Aminata Kamara',
      dob: '17/04/1992',
    });
    expect(result.dob_match).toBe(true);
  });

  it('does not match a different DOB', () => {
    const result = crossCheck(card, {
      nin: 'ABCD1234',
      name: 'Aminata Kamara',
      dob: '18/04/1992',
    });
    expect(result.dob_match).toBe(false);
  });
});

describe('nameSimilarity', () => {
  it('is 1.0 for identical normalised names', () => {
    expect(nameSimilarity('AMINATA KAMARA', '  aminata   kamara ')).toBe(1);
  });
});
