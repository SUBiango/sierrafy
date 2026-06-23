import sharp from 'sharp';
import { resolveEngine, createGoogleVisionEngine } from '../engines';
import { loadZoneMap } from '../zone-map';

/** A small valid JPEG so Sharp can read dimensions and crop zones. */
async function makeImage(width = 240, height = 380): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: '#ffffff' },
  })
    .jpeg()
    .toBuffer();
}

describe('resolveEngine — selection & offline default (AC #5)', () => {
  const original = process.env.OCR_ENGINE;
  afterEach(() => {
    if (original === undefined) delete process.env.OCR_ENGINE;
    else process.env.OCR_ENGINE = original;
    jest.restoreAllMocks();
  });

  it('defaults to the offline tesseract engine and makes no outbound call', () => {
    delete process.env.OCR_ENGINE;
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const engine = resolveEngine();
    expect(engine.name).toBe('tesseract');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('honours an explicit engine argument over the env default', () => {
    process.env.OCR_ENGINE = 'tesseract';
    process.env.GOOGLE_VISION_KEY = 'test-key';
    expect(resolveEngine('google-vision').name).toBe('google-vision');
    delete process.env.GOOGLE_VISION_KEY;
  });
});

describe('createGoogleVisionEngine — opt-in egress', () => {
  it('throws when no API key is configured', () => {
    const prev = process.env.GOOGLE_VISION_KEY;
    delete process.env.GOOGLE_VISION_KEY;
    expect(() => createGoogleVisionEngine()).toThrow(/GOOGLE_VISION_KEY/);
    if (prev !== undefined) process.env.GOOGLE_VISION_KEY = prev;
  });

  // AC #5: google-vision routes to the Vision path — asserted with fetch mocked,
  // so no real network call leaves the test.
  it('routes recognition to the Vision endpoint (mocked fetch)', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        responses: [
          { fullTextAnnotation: { text: 'ABCD1234', confidence: 0.9 } },
        ],
      }),
    }) as unknown as typeof fetch;

    const engine = createGoogleVisionEngine({ apiKey: 'test-key', fetchImpl });
    const result = await engine.recognize(
      await makeImage(),
      loadZoneMap('SL_NATIONAL_EID'),
    );

    expect(fetchImpl).toHaveBeenCalled();
    const calledUrl = (fetchImpl as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('vision.googleapis.com');
    expect(result.zones.nin).toBe('ABCD1234');
    expect(result.confidence).toBeGreaterThan(0);
  });
});
