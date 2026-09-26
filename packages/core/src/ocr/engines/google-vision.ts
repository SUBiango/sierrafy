import { loadSharp } from './deps';
import { toPixelBox } from '../zone-map';
import type { OcrEngine, RecognitionResult, ZoneMap } from '../types';

const VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

/**
 * Optional, opt-in OCR engine backed by Google Cloud Vision (§4.2.2, §7.2). This
 * is the **only** path in Sierrafy that makes an outbound network call — the
 * single egress the offline-guarantee test toggles. Requires `GOOGLE_VISION_KEY`
 * (or an explicit `apiKey`); throws at construction otherwise so misconfiguration
 * fails fast rather than silently going offline.
 */
export function createGoogleVisionEngine(
  options: { apiKey?: string; fetchImpl?: typeof fetch } = {},
): OcrEngine {
  const apiKey = options.apiKey ?? process.env.GOOGLE_VISION_KEY;
  if (!apiKey) {
    throw new Error(
      'OCR_ENGINE=google-vision requires GOOGLE_VISION_KEY to be set.',
    );
  }
  const doFetch = options.fetchImpl ?? fetch;

  return {
    name: 'google-vision',
    recognize: (image, zoneMap) =>
      recognizeZones(image, zoneMap, apiKey, doFetch),
  };
}

async function recognizeZones(
  image: Buffer,
  zoneMap: ZoneMap,
  apiKey: string,
  doFetch: typeof fetch,
): Promise<RecognitionResult> {
  const sharp = await loadSharp();
  const meta = await sharp(image).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width === 0 || height === 0) {
    return { zones: {}, confidence: 0 };
  }

  const zones: Record<string, string> = {};
  const confidences: number[] = [];

  for (const [name, box] of Object.entries(zoneMap.zones)) {
    if (name === 'photo') continue;

    const px = toPixelBox(box, width, height);
    const crop = await sharp(image).extract(px).toBuffer();

    const res = await doFetch(`${VISION_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: crop.toString('base64') },
            features: [{ type: 'TEXT_DETECTION' }],
          },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`Google Vision request failed: ${res.status}`);
    }
    const body = (await res.json()) as VisionResponse;
    const annotation = body.responses?.[0]?.fullTextAnnotation;
    zones[name] = (annotation?.text ?? '').trim();
    if (typeof annotation?.confidence === 'number') {
      confidences.push(annotation.confidence);
    }
  }

  return { zones, confidence: averageConfidence(confidences) };
}

interface VisionResponse {
  responses?: Array<{
    fullTextAnnotation?: { text?: string; confidence?: number };
  }>;
}

/** Vision confidences are already 0–1. */
function averageConfidence(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.max(0, Math.min(1, mean));
}
