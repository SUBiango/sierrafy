import { loadSharp, loadTesseract, type SharpFactory } from './deps';
import { toPixelBox } from '../zone-map';
import type {
  OcrEngine,
  RecognitionResult,
  TesseractEngineOptions,
  ZoneBox,
  ZoneContentType,
  ZoneMap,
} from '../types';

/**
 * Default, local OCR engine. For each zone it crops the relative region,
 * isolates the text from the card's green guilloche background (green-channel
 * extraction), upscales, and runs Tesseract.js with a per-field character
 * whitelist and single-line page segmentation.
 *
 * **No identity data ever leaves the machine**: recognition itself runs locally
 * on wasm, and no image, NIN or extracted field is sent anywhere. One caveat
 * worth stating plainly rather than burying: the `eng.traineddata` language
 * model is not bundled in this package, so on first use `tesseract.js`
 * downloads it from the jsdelivr CDN and caches it. That request carries no
 * identity data, but it is a network call, and on a machine with no internet it
 * fails. Pass `cachePath` as a directory holding a plain `eng.traineddata` (or
 * `langPath` as a mirror URL or a directory holding `eng.traineddata.gz`) and
 * the engine is genuinely offline. See {@link TesseractEngineOptions}.
 *
 * `sharp` and `tesseract.js` are optional peer dependencies loaded on the first
 * `recognize()` call, so merely importing this module costs nothing.
 */
export function createTesseractEngine(
  options: TesseractEngineOptions = {},
): OcrEngine {
  const workerOptions = resolveWorkerOptions(options);
  return {
    name: 'tesseract',
    recognize: (image, zoneMap) =>
      recognizeZones(image, zoneMap, workerOptions),
  };
}

/** The subset of `tesseract.js` worker options this engine sets. */
type WorkerPaths = Pick<TesseractEngineOptions, 'langPath' | 'cachePath'>;

/**
 * Explicit option wins, then the env var, then `tesseract.js`'s own default.
 * Keys are omitted rather than set to `undefined`, because `createWorker`
 * spreads what it is given over its defaults and an explicit `undefined` would
 * overwrite them.
 */
function resolveWorkerOptions(options: TesseractEngineOptions): WorkerPaths {
  const langPath = options.langPath ?? process.env.TESSERACT_LANG_PATH;
  const cachePath = options.cachePath ?? process.env.TESSERACT_CACHE_PATH;
  return {
    ...(langPath === undefined ? {} : { langPath }),
    ...(cachePath === undefined ? {} : { cachePath }),
  };
}

/** Upscale factor applied before OCR — small card crops read better enlarged. */
const PREPROCESS_SCALE = 4;

const WHITELIST: Record<Exclude<ZoneContentType, 'photo'>, string> = {
  alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ',
  date: '0123456789./-',
};

async function recognizeZones(
  image: Buffer,
  zoneMap: ZoneMap,
  workerOptions: WorkerPaths = {},
): Promise<RecognitionResult> {
  const sharp = await loadSharp();
  const meta = await sharp(image).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const hasColour = (meta.channels ?? 0) >= 3;
  if (width === 0 || height === 0) {
    return { zones: {}, confidence: 0 };
  }

  const { createWorker, PSM } = await loadTesseract();
  // `undefined` for oem keeps tesseract.js's own default (LSTM_ONLY).
  const worker = await createWorker('eng', undefined, workerOptions);
  try {
    const zones: Record<string, string> = {};
    const confidences: number[] = [];

    for (const [name, box] of Object.entries(zoneMap.zones)) {
      const contentType = box.type ?? contentTypeFor(name);
      // The photo zone is a biometric crop for the face engine, not text.
      if (contentType === 'photo') continue;

      const crop = await preprocess(
        sharp,
        image,
        box,
        width,
        height,
        hasColour,
      );
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        tessedit_char_whitelist: WHITELIST[contentType],
      });

      const { data } = await worker.recognize(crop);
      zones[name] = data.text.trim();
      confidences.push(data.confidence);
    }

    return { zones, confidence: averageConfidence(confidences) };
  } finally {
    await worker.terminate();
  }
}

/** Crop a zone, isolate text from the green background, and upscale for OCR. */
async function preprocess(
  sharp: SharpFactory,
  image: Buffer,
  box: ZoneBox,
  width: number,
  height: number,
  hasColour: boolean,
): Promise<Buffer> {
  const px = toPixelBox(box, width, height);
  const pipeline = sharp(image)
    .extract(px)
    .resize({ width: px.width * PREPROCESS_SCALE });
  // The card's security print is green; the green channel pushes that
  // background toward white and leaves the dark text legible.
  const isolated = hasColour
    ? pipeline.extractChannel('green')
    : pipeline.grayscale();
  return isolated.normalize().sharpen().toBuffer();
}

/** Fallback content type by zone name when the map omits an explicit hint. */
function contentTypeFor(name: string): ZoneContentType {
  if (name === 'photo') return 'photo';
  if (name === 'dob' || name === 'expiry') return 'date';
  if (name === 'surname' || name === 'given_name') return 'alpha';
  return 'alnum';
}

/** Tesseract reports 0–100 per zone; aggregate to a 0–1 mean. */
function averageConfidence(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.max(0, Math.min(1, mean / 100));
}
