import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { toPixelBox } from '../zone-map';
import type { OcrEngine, RecognitionResult, ZoneMap } from '../types';

/**
 * Default, fully-offline OCR engine: Sharp pre-processing (grayscale, contrast,
 * resize) feeds Tesseract.js, one recognition per zone of the zone map. Makes
 * **no outbound network calls** — Tesseract runs locally on bundled traineddata.
 */
export function createTesseractEngine(): OcrEngine {
  return {
    name: 'tesseract',
    recognize: recognizeZones,
  };
}

/** Upscale factor applied before OCR — small card crops read better enlarged. */
const PREPROCESS_SCALE = 2;

async function recognizeZones(
  image: Buffer,
  zoneMap: ZoneMap,
): Promise<RecognitionResult> {
  const base = sharp(image);
  const meta = await base.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width === 0 || height === 0) {
    return { zones: {}, confidence: 0 };
  }

  const worker = await createWorker('eng');
  try {
    const zones: Record<string, string> = {};
    const confidences: number[] = [];

    for (const [name, box] of Object.entries(zoneMap.zones)) {
      // The photo zone is a biometric crop for the face engine, not text.
      if (name === 'photo') continue;

      const px = toPixelBox(box, width, height);
      const crop = await sharp(image)
        .extract(px)
        .resize({ width: px.width * PREPROCESS_SCALE })
        .grayscale()
        .normalize()
        .toBuffer();

      const { data } = await worker.recognize(crop);
      zones[name] = data.text.trim();
      confidences.push(data.confidence);
    }

    return { zones, confidence: averageConfidence(confidences) };
  } finally {
    await worker.terminate();
  }
}

/** Tesseract reports 0–100 per zone; aggregate to a 0–1 mean. */
function averageConfidence(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.max(0, Math.min(1, mean / 100));
}
