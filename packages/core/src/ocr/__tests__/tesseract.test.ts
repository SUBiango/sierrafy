// Mock the heavy native/wasm deps so we exercise the engine's zone-iteration
// and confidence-aggregation logic without running real OCR (which would fetch
// traineddata over the network). We test our glue, not Tesseract itself.
const recognizeMock = jest.fn();
const terminateMock = jest.fn();
const setParametersMock = jest.fn();

const createWorkerMock = jest.fn(async () => ({
  recognize: recognizeMock,
  terminate: terminateMock,
  setParameters: setParametersMock,
}));

jest.mock('tesseract.js', () => ({
  PSM: { SINGLE_LINE: '7' },
  createWorker: createWorkerMock,
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

/**
 * The language model is the one thing that can reach the network on the
 * default engine, so the paths that stop it are worth pinning. Without
 * `langPath` or `cachePath`, tesseract.js resolves the model from the jsdelivr
 * CDN; with either, it reads a local copy and the run is genuinely offline.
 */
describe('tesseract engine — language model paths (offline guarantee)', () => {
  const envKeys = ['TESSERACT_LANG_PATH', 'TESSERACT_CACHE_PATH'] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of envKeys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    recognizeMock.mockResolvedValue({
      data: { text: 'ABCD1234', confidence: 80 },
    });
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  /**
   * The third argument to `createWorker` is the worker options object. The mock
   * is declared without parameters, so its recorded calls type as an empty
   * tuple; widen before indexing.
   */
  function workerOptions(): Record<string, unknown> {
    const calls = createWorkerMock.mock.calls as unknown as unknown[][];
    return (calls[0]?.[2] ?? {}) as Record<string, unknown>;
  }

  it('sets no paths by default, leaving tesseract.js to its own defaults', async () => {
    await createTesseractEngine().recognize(Buffer.from('img'), zoneMap);

    // Omitted rather than undefined: createWorker spreads these over its own
    // defaults, so an explicit undefined would wipe them.
    expect(workerOptions()).toEqual({});
    expect('langPath' in workerOptions()).toBe(false);
    expect('cachePath' in workerOptions()).toBe(false);
  });

  it('passes an explicit langPath and cachePath through to the worker', async () => {
    await createTesseractEngine({
      langPath: '/opt/tessdata',
      cachePath: '/var/cache/sierrafy',
    }).recognize(Buffer.from('img'), zoneMap);

    expect(workerOptions()).toEqual({
      langPath: '/opt/tessdata',
      cachePath: '/var/cache/sierrafy',
    });
  });

  it('falls back to the env vars when no option is given', async () => {
    process.env.TESSERACT_LANG_PATH = '/env/tessdata';
    process.env.TESSERACT_CACHE_PATH = '/env/cache';

    await createTesseractEngine().recognize(Buffer.from('img'), zoneMap);

    expect(workerOptions()).toEqual({
      langPath: '/env/tessdata',
      cachePath: '/env/cache',
    });
  });

  it('prefers the explicit option over the env var', async () => {
    process.env.TESSERACT_LANG_PATH = '/env/tessdata';

    await createTesseractEngine({ langPath: '/explicit/tessdata' }).recognize(
      Buffer.from('img'),
      zoneMap,
    );

    expect(workerOptions().langPath).toBe('/explicit/tessdata');
  });

  it('resolves the paths once per engine, not once per zone', async () => {
    process.env.TESSERACT_LANG_PATH = '/env/tessdata';
    const engine = createTesseractEngine();
    process.env.TESSERACT_LANG_PATH = '/changed/after/construction';

    await engine.recognize(Buffer.from('img'), zoneMap);

    expect(workerOptions().langPath).toBe('/env/tessdata');
  });
});
