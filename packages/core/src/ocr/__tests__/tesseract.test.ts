// Mock the heavy native/wasm deps so we exercise the engine's zone-iteration
// and confidence-aggregation logic without running real OCR (which would fetch
// traineddata over the network). We test our glue, not Tesseract itself.
const recognizeMock = jest.fn();
const terminateMock = jest.fn();
const setParametersMock = jest.fn();

jest.mock('tesseract.js', () => ({
  PSM: { SINGLE_LINE: '7' },
  createWorker: jest.fn(async () => ({
    recognize: recognizeMock,
    terminate: terminateMock,
    setParameters: setParametersMock,
  })),
}));

jest.mock('sharp', () => {
  // Annotated to break the self-referential inference cycle: every stage returns
  // `chainable` so the sharp pipeline can be chained the way the engine chains it.
  const chainable: Record<string, jest.Mock> = {
    extract: jest.fn(() => chainable),
    resize: jest.fn(() => chainable),
    grayscale: jest.fn(() => chainable),
    extractChannel: jest.fn(() => chainable),
    normalize: jest.fn(() => chainable),
    sharpen: jest.fn(() => chainable),
    toBuffer: jest.fn(async () => Buffer.from('crop')),
    metadata: jest.fn(async () => ({ width: 240, height: 380, channels: 3 })),
  };
  return jest.fn(() => chainable);
});

import sharp from 'sharp';
import { createTesseractEngine } from '../engines/tesseract';
import type { ZoneMap } from '../types';

const zoneMap: ZoneMap = {
  document_type: 'SL_NATIONAL_EID',
  zones: {
    nin: { x: 0.05, y: 0.58, w: 0.55, h: 0.1 },
    photo: { x: 0.65, y: 0.28, w: 0.3, h: 0.4 },
  },
};

afterEach(() => jest.clearAllMocks());

describe('tesseract engine — recognizeZones', () => {
  it('recognises text zones, skips the photo zone, and normalises confidence', async () => {
    recognizeMock.mockResolvedValue({
      data: { text: '  ABCD1234 ', confidence: 90 },
    });

    const engine = createTesseractEngine();
    const result = await engine.recognize(Buffer.from('img'), zoneMap);

    expect(engine.name).toBe('tesseract');
    expect(result.zones.nin).toBe('ABCD1234'); // trimmed
    expect(result.zones.photo).toBeUndefined(); // biometric crop, not OCR'd
    expect(recognizeMock).toHaveBeenCalledTimes(1); // only the nin zone
    expect(result.confidence).toBeCloseTo(0.9); // 90/100
    expect(terminateMock).toHaveBeenCalled(); // worker cleaned up
  });

  it('constrains OCR with a single-line PSM and an alphanumeric whitelist for the NIN', async () => {
    recognizeMock.mockResolvedValue({
      data: { text: 'ABCD1234', confidence: 80 },
    });
    await createTesseractEngine().recognize(Buffer.from('img'), zoneMap);

    expect(setParametersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tessedit_pageseg_mode: '7',
        tessedit_char_whitelist: expect.stringContaining('0123456789'),
      }),
    );
  });

  it('returns zero confidence and no zones when the image has no dimensions', async () => {
    (sharp as unknown as jest.Mock).mockReturnValueOnce({
      metadata: async () => ({}),
    });

    const result = await createTesseractEngine().recognize(
      Buffer.from('img'),
      zoneMap,
    );
    expect(result).toEqual({ zones: {}, confidence: 0 });
    expect(recognizeMock).not.toHaveBeenCalled();
  });
});
