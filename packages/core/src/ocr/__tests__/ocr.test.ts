import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Mock the engine layer so ocr() orchestration is tested without running the
// real (network-fetching, heavy) Tesseract worker.
jest.mock('../engines', () => ({
  resolveEngine: jest.fn(),
}));

// Normalisation is covered in normalize-card.test.ts against drawn fixtures.
// Here it is a pass-through by default, so these tests stay about orchestration,
// and is overridden in the one test that pins the wiring.
jest.mock('../normalize-card', () => ({
  normalizeCard: jest.fn(async (image: Buffer) => ({
    image,
    applied: false,
    skipped: 'CARD_FILLS_FRAME',
  })),
}));

import { resolveEngine } from '../engines';
import { ocr } from '../index';
import { normalizeCard } from '../normalize-card';
import type { OcrEngine, RecognitionResult } from '../types';

function fakeEngine(recognition: RecognitionResult): OcrEngine {
  return {
    name: 'tesseract',
    recognize: jest.fn().mockResolvedValue(recognition),
  };
}

const resolveMock = resolveEngine as jest.Mock;
const normalizeMock = normalizeCard as jest.Mock;

afterEach(() => jest.clearAllMocks());

describe('ocr — orchestration', () => {
  it('returns the /v1/ocr shape on a successful extraction', async () => {
    resolveMock.mockReturnValue(
      fakeEngine({
        zones: {
          nin: 'ABCD1234',
          surname: 'KAMARA',
          given_name: 'AMINATA',
          dob: '17/04/1992',
          document_number: 'SL2019XXXX',
          expiry: '15/08/2029',
        },
        confidence: 0.91,
      }),
    );

    const result = await ocr(Buffer.from('img'));
    expect(result).toEqual({
      document_type: 'SL_NATIONAL_EID',
      extracted: { nin: 'ABCD1234', name: 'AMINATA KAMARA', dob: '1992-04-17' },
      ocr_confidence: 0.91,
    });
  });

  // AC #6: unreadable image → IMAGE_UNREADABLE, no throw.
  it('returns IMAGE_UNREADABLE when no zone yields usable text', async () => {
    resolveMock.mockReturnValue(fakeEngine({ zones: {}, confidence: 0 }));
    const result = await ocr(Buffer.from('img'));
    expect(result.error).toBe('IMAGE_UNREADABLE');
    expect(result.extracted).toBeNull();
  });

  // AC #6: unsupported document → DOCUMENT_UNSUPPORTED, before any engine call.
  it('returns DOCUMENT_UNSUPPORTED for a non-eID document in M2', async () => {
    const result = await ocr(Buffer.from('img'), {
      documentType: 'SL_PASSPORT',
    });
    expect(result.error).toBe('DOCUMENT_UNSUPPORTED');
    expect(result.extracted).toBeNull();
    expect(resolveMock).not.toHaveBeenCalled();
  });

  it('accepts a Uint8Array image without throwing', async () => {
    resolveMock.mockReturnValue(
      fakeEngine({ zones: { nin: 'ABCD1234' }, confidence: 0.7 }),
    );
    const result = await ocr(new Uint8Array([1, 2, 3]));
    expect(result.extracted?.nin).toBe('ABCD1234');
  });
});

describe('ocr — card normalisation wiring', () => {
  const recognition = { zones: { nin: 'ABCD1234' }, confidence: 0.9 };

  it('reads zones from the normalised image, not the original', async () => {
    const engine = fakeEngine(recognition);
    resolveMock.mockReturnValue(engine);
    const normalised = Buffer.from('normalised');
    normalizeMock.mockResolvedValueOnce({ image: normalised, applied: true });

    await ocr(Buffer.from('original'));

    expect(normalizeMock).toHaveBeenCalledTimes(1);
    expect(engine.recognize).toHaveBeenCalledWith(
      normalised,
      expect.anything(),
    );
  });

  it('skips normalisation entirely when normalizeCard is false', async () => {
    const engine = fakeEngine(recognition);
    resolveMock.mockReturnValue(engine);
    const original = Buffer.from('original');

    await ocr(original, { normalizeCard: false });

    expect(normalizeMock).not.toHaveBeenCalled();
    expect(engine.recognize).toHaveBeenCalledWith(original, expect.anything());
  });
});

// SAMPLE-GATED smoke test. Runs only when real samples are present AND
// RUN_OCR_SMOKE is set (real Tesseract fetches traineddata + is slow). AC #8 is
// no longer blocked: 10 samples arrived and the metric is 2/10 exact NIN
// extraction, re-measured 2026-11-12. The standing figure and the plan to move
// it live in specs/002-ocr-engine-eid-zone-map/accuracy-plan.md; use
// scripts/measure-ocr-accuracy.mjs to reproduce it. This test only confirms the
// real engine runs end to end on a real card.
const samplesDir = join(__dirname, '..', '..', '..', '..', '..', 'eID samples');
const runSmoke = process.env.RUN_OCR_SMOKE === '1' && existsSync(samplesDir);

(runSmoke ? describe : describe.skip)(
  'ocr — real-sample smoke [SAMPLE-GATED]',
  () => {
    jest.unmock('../engines');

    it('extracts a NIN field from sample-1-front (records baseline)', async () => {
      const { ocr: realOcr } = jest.requireActual('../index');
      const image = await readFile(join(samplesDir, 'sample-1-front.jpeg'));
      const result = await realOcr(image);
      // Shapes only, never values: these come off a real card, and a value
      // printed to a terminal is one paste away from a public issue. Two real
      // NINs reached a spec document this way once already.
      console.log(
        '[smoke] field lengths:',
        {
          nin: result.extracted?.nin?.length ?? 0,
          name: result.extracted?.name?.length ?? 0,
          dob: result.extracted?.dob?.length ?? 0,
        },
        'conf:',
        result.ocr_confidence,
      );
      expect(result).toHaveProperty('ocr_confidence');
    }, 60_000);
  },
);
