import { loadSharp } from './engines/deps';

/**
 * Card-boundary normalisation: find the card in a photo, straighten it, and
 * crop to its edges so the zone map's relative coordinates land on the right
 * text.
 *
 * The zone map stores each field as a fraction of card width and height, which
 * assumes the image *is* the card. A photo with a margin down one side, or
 * tilted a couple of degrees, shifts every zone by that much. The NIN is the
 * narrowest field on the card, so it loses a character first.
 *
 * **The card is found by locating the background, not the print.** That
 * distinction is the whole design. An earlier version took the bounding box of
 * gradient energy, which finds where the *printing* starts, several percent
 * inside the card edge. On an image already cropped to the card that crops into
 * the card and shifts every zone outward: measured on the 10-sample calibration
 * set it took exact NIN extraction from 2/10 to 0/10. Detecting the background
 * instead means an image with no background has nothing to detect, and the
 * honest answer there is to do nothing.
 *
 * The sequence:
 *
 * 1. Apply EXIF orientation, so a portrait-tagged photo is analysed upright.
 * 2. Estimate the background colour from the image's one-pixel border frame.
 * 3. Give up if that frame is not reasonably uniform, because then the card
 *    already reaches the edge of the frame, or the background is cluttered
 *    enough that a colour test cannot separate them.
 * 4. Mark every pixel far from the background colour. For a card on a desk that
 *    is the card silhouette, which is what the long axis and the bounding box
 *    need to be measured from.
 * 5. Give up if the silhouette already fills the frame, which is the
 *    already-cropped case.
 * 6. Take the silhouette's principal axis as the skew and rotate it out.
 * 7. Crop to the silhouette, expanded to ID-1's exact aspect ratio about its
 *    own centre, since the true card has that shape and the detection is the
 *    estimate.
 *
 * Nothing here throws. A missing `sharp`, an undecodable buffer or any
 * implausible detection returns the input unchanged, so {@link ocr} keeps its
 * "never throws on bad input" contract and a detection failure costs accuracy
 * rather than the call.
 */

/** ID-1 (ISO/IEC 7810), the National eID's format: 85.6mm x 54mm. */
export const CARD_ASPECT_RATIO = 85.6 / 54;

/** Width the analysis copy is reduced to. Full resolution buys nothing here. */
const ANALYSIS_WIDTH = 400;

/** Mean absolute deviation allowed in the border frame, per channel (0-255). */
const MAX_BORDER_SPREAD = 28;

/**
 * Floor on the background/foreground split, in mean channel distance, for a
 * synthetically clean background whose own spread is zero.
 */
const MIN_FOREGROUND_DISTANCE = 10;

/** Safety factor applied to the background's own spread to set the split. */
const BACKGROUND_TOLERANCE = 1.5;

/** At or above this foreground share there is no margin left to crop. */
const FILLS_FRAME = 0.95;

/** Below this foreground share the detection is not looking at a card. */
const MIN_FOREGROUND = 0.2;

/**
 * A card silhouette must fill this share of its own bounding box. Below it, the
 * marked pixels are print on an already-cropped card, not a card on a surface.
 */
const MIN_BOX_FILL = 0.85;

/** Skew beyond this is not a tilted scan; it is a different kind of photo. */
const MAX_SKEW_DEGREES = 20;

/** Below this the rotation is not worth the resample. */
const MIN_SKEW_DEGREES = 0.4;

/** The final crop must cover at least this share of the frame. */
const MIN_AREA_FRACTION = 0.2;

/** Pre-correction aspect must fall in this range to be a card at all. */
const PLAUSIBLE_ASPECT = { min: 1.15, max: 2.2 };

/** Share of silhouette pixels trimmed from each end before taking extents. */
const EXTENT_TRIM = 0.005;

/** Options for {@link normalizeCard}. */
export interface NormalizeCardOptions {
  /** Largest skew to correct, in degrees. Default 20. */
  maxSkewDegrees?: number;
}

/** Why normalisation declined to change the image. */
export type NormalizeCardSkip =
  | 'SHARP_UNAVAILABLE'
  | 'UNDECODABLE'
  | 'BORDER_NOT_UNIFORM'
  | 'EXCESSIVE_SKEW'
  | 'CARD_FILLS_FRAME'
  | 'NO_CARD_FOUND'
  | 'IMPLAUSIBLE_ASPECT'
  | 'BOX_TOO_SMALL';

/** Outcome of {@link normalizeCard}. */
export interface NormalizeCardResult {
  /** The normalised image, or the input unchanged when `applied` is false. */
  image: Buffer;
  /** Whether a crop was applied. */
  applied: boolean;
  /** Why normalisation was skipped. Absent when `applied` is true. */
  skipped?: NormalizeCardSkip;
  /** Skew correction applied, in degrees. Positive is counter-clockwise. */
  rotationDegrees?: number;
  /** The crop taken, in pixels of the EXIF-corrected, rotated image. */
  crop?: { left: number; top: number; width: number; height: number };
}

interface Silhouette {
  data: Uint8Array;
  width: number;
  height: number;
  fraction: number;
  /** Principal-axis angle in degrees, counter-clockwise. Null when isotropic. */
  angleDegrees: number | null;
  /** The estimated background colour, used as the fill when deskewing. */
  background: [number, number, number];
}

type Box = { left: number; top: number; width: number; height: number };

export async function normalizeCard(
  image: Buffer,
  options: NormalizeCardOptions = {},
): Promise<NormalizeCardResult> {
  const maxSkew = options.maxSkewDegrees ?? MAX_SKEW_DEGREES;

  let sharp: Awaited<ReturnType<typeof loadSharp>>;
  try {
    sharp = await loadSharp();
  } catch {
    // The engine raises the actionable "install sharp" message itself; here a
    // missing optional peer just means no normalisation.
    return { image, applied: false, skipped: 'SHARP_UNAVAILABLE' };
  }

  try {
    // `rotate()` with no argument applies the EXIF orientation tag and clears
    // it, so all later geometry is in the orientation a human sees.
    const upright = await sharp(image).rotate().toBuffer();

    const first = await silhouette(sharp, upright);
    if (typeof first === 'string')
      return { image, applied: false, skipped: first };

    let working = upright;
    let rotationDegrees = 0;
    const skew = first.angleDegrees;
    if (skew !== null && Math.abs(skew) > maxSkew) {
      // Cropping without straightening would hand the zone map a tilted card,
      // which is worse than leaving the image alone.
      return { image, applied: false, skipped: 'EXCESSIVE_SKEW' };
    }
    if (skew !== null && Math.abs(skew) >= MIN_SKEW_DEGREES) {
      // sharp rotates clockwise for a positive angle, which undoes a
      // counter-clockwise (positive) skew. The fill has to be the detected
      // background colour: sharp fills new corners with black by default, and a
      // black border makes the second pass estimate black as the background and
      // invert the whole judgement.
      working = await sharp(upright)
        .rotate(skew, { background: toRgb(first.background) })
        .toBuffer();
      rotationDegrees = -skew;
    }

    const found =
      rotationDegrees === 0 ? first : await silhouette(sharp, working);
    if (typeof found === 'string')
      return { image, applied: false, skipped: found };

    const box = extents(found);
    if (box === null)
      return { image, applied: false, skipped: 'NO_CARD_FOUND' };

    const aspect = box.width / box.height;
    if (aspect < PLAUSIBLE_ASPECT.min || aspect > PLAUSIBLE_ASPECT.max) {
      return { image, applied: false, skipped: 'IMPLAUSIBLE_ASPECT' };
    }

    const meta = await sharp(working).metadata();
    const fullWidth = meta.width ?? 0;
    const fullHeight = meta.height ?? 0;
    if (fullWidth === 0 || fullHeight === 0) {
      return { image, applied: false, skipped: 'UNDECODABLE' };
    }

    const scale = fullWidth / found.width;
    const crop = toCardAspect(
      {
        left: box.left * scale,
        top: box.top * scale,
        width: box.width * scale,
        height: box.height * scale,
      },
      fullWidth,
      fullHeight,
    );

    const areaFraction = (crop.width * crop.height) / (fullWidth * fullHeight);
    if (areaFraction < MIN_AREA_FRACTION) {
      return { image, applied: false, skipped: 'BOX_TOO_SMALL' };
    }

    const cropped = await sharp(working).extract(crop).toBuffer();
    return { image: cropped, applied: true, rotationDegrees, crop };
  } catch {
    return { image, applied: false, skipped: 'UNDECODABLE' };
  }
}

/**
 * Mark the pixels that are not background. Returns a skip reason instead when
 * the image gives no basis for the judgement.
 */
async function silhouette(
  sharp: Awaited<ReturnType<typeof loadSharp>>,
  image: Buffer,
): Promise<Silhouette | NormalizeCardSkip> {
  const { data, info } = await sharp(image)
    .removeAlpha()
    .resize({ width: ANALYSIS_WIDTH, fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (width < 16 || height < 16 || channels < 3) return 'UNDECODABLE';

  const at = (x: number, y: number): [number, number, number] => {
    const i = (y * width + x) * channels;
    return [data[i]!, data[i + 1]!, data[i + 2]!];
  };

  // The one-pixel frame around the image. If a card sits on a desk, this is
  // desk; if the image is cropped to the card, this is card.
  const frame: Array<[number, number, number]> = [];
  for (let x = 0; x < width; x++) {
    frame.push(at(x, 0), at(x, height - 1));
  }
  for (let y = 1; y < height - 1; y++) {
    frame.push(at(0, y), at(width - 1, y));
  }

  const background: [number, number, number] = [
    median(frame.map((p) => p[0])),
    median(frame.map((p) => p[1])),
    median(frame.map((p) => p[2])),
  ];

  const distanceFrom = (p: [number, number, number]): number =>
    (Math.abs(p[0] - background[0]) +
      Math.abs(p[1] - background[1]) +
      Math.abs(p[2] - background[2])) /
    3;

  const frameDistances = frame.map(distanceFrom);

  // Mean absolute deviation, not variance: one bright speck in the frame should
  // not disqualify an otherwise clean background.
  const spread =
    frameDistances.reduce((acc, d) => acc + d, 0) / frameDistances.length;
  if (spread > MAX_BORDER_SPREAD) return 'BORDER_NOT_UNIFORM';

  // Distance from the background colour, per pixel. A light card on white paper
  // separates by well under 50 and a dark desk by well over 100, so the split
  // cannot be a constant.
  const distances = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      distances[y * width + x] = distanceFrom(at(x, y));
    }
  }

  // Threshold from the background's own tail, not from a global two-class
  // split. Otsu was tried here and is the wrong tool: the distances are
  // trimodal (background, card, print) and Otsu maximises between-class
  // variance globally, so on a light card with dark print it puts the boundary
  // between card and print and reports 1% of the frame as "card".
  const threshold = Math.max(
    percentile(frameDistances, 0.99) * BACKGROUND_TOLERANCE,
    MIN_FOREGROUND_DISTANCE,
  );

  const mask = new Uint8Array(width * height);
  let on = 0;
  for (let i = 0; i < distances.length; i++) {
    if (distances[i]! > threshold) {
      mask[i] = 1;
      on++;
    }
  }

  const fraction = on / (width * height);
  if (fraction >= FILLS_FRAME) return 'CARD_FILLS_FRAME';
  if (fraction < MIN_FOREGROUND) return 'NO_CARD_FOUND';

  const angleDegrees = principalAxisDegrees(mask, width, height);

  // Distinguish "a card on a desk" from "an image that already is the card".
  // Both leave a uniform border frame: in the second case the frame is the
  // card's own margin, so the background colour becomes the card's colour and
  // everything marked is print rather than card. A card silhouette is a solid
  // rectangle and fills its own oriented box; print does not come close.
  // Without this test the principal axis of a page of print sets the rotation,
  // which tilted two already-square samples by several degrees.
  //
  // The box has to be the *oriented* one. A rectangle fills only about 0.85 of
  // its axis-aligned box at 3 degrees of tilt and 0.58 at 20, so testing
  // against that would reject the tilted cards this exists to handle.
  const fill = orientedFill(mask, width, height, angleDegrees);
  if (fill < MIN_BOX_FILL) return 'NO_CARD_FOUND';

  return { data: mask, width, height, fraction, angleDegrees, background };
}

/**
 * Orientation of the silhouette's principal axis, in degrees, from second-order
 * central moments. Positive is counter-clockwise. Null when the shape is too
 * isotropic for an axis to mean anything, which would otherwise rotate the card
 * by noise.
 */
function principalAxisDegrees(
  data: Uint8Array,
  width: number,
  height: number,
): number | null {
  let m00 = 0;
  let m10 = 0;
  let m01 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] === 0) continue;
      m00++;
      m10 += x;
      m01 += y;
    }
  }
  if (m00 === 0) return null;

  const cx = m10 / m00;
  const cy = m01 / m00;
  let mu20 = 0;
  let mu02 = 0;
  let mu11 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] === 0) continue;
      const dx = x - cx;
      const dy = y - cy;
      mu20 += dx * dx;
      mu02 += dy * dy;
      mu11 += dx * dy;
    }
  }
  mu20 /= m00;
  mu02 /= m00;
  mu11 /= m00;

  const eccentricity = Math.hypot(mu20 - mu02, 2 * mu11) / (mu20 + mu02 || 1);
  if (eccentricity < 0.05) return null;

  // Image y grows downward, so negate to report counter-clockwise as positive.
  return -(0.5 * Math.atan2(2 * mu11, mu20 - mu02) * (180 / Math.PI));
}

/**
 * Share of the silhouette's *oriented* bounding box that the silhouette fills.
 * Pixels are projected onto the principal axis and its perpendicular, so the
 * measure does not change when the card is tilted. A solid rectangle scores
 * near 1 at any angle; scattered print scores far lower.
 */
function orientedFill(
  data: Uint8Array,
  width: number,
  height: number,
  angleDegrees: number | null,
): number {
  // Counter-clockwise positive in report terms, y-down in pixel terms.
  const theta = -((angleDegrees ?? 0) * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  let count = 0;
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] === 0) continue;
      count++;
      const u = x * cos + y * sin;
      const v = -x * sin + y * cos;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  }
  if (count === 0) return 0;

  const area = (maxU - minU + 1) * (maxV - minV + 1);
  return area <= 0 ? 0 : count / area;
}

/**
 * Extents of the silhouette, trimming a small share of pixels from each end so
 * a few stray foreground specks cannot stretch the box to the whole frame.
 */
function extents(mask: Silhouette): Box | null {
  const { data, width, height } = mask;
  const cols = new Int32Array(width);
  const rows = new Int32Array(height);
  let total = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] === 0) continue;
      cols[x]!++;
      rows[y]!++;
      total++;
    }
  }
  if (total === 0) return null;

  const span = (profile: Int32Array): [number, number] | null => {
    const budget = total * EXTENT_TRIM;
    let acc = 0;
    let first = -1;
    for (let i = 0; i < profile.length; i++) {
      acc += profile[i]!;
      if (acc > budget) {
        first = i;
        break;
      }
    }
    acc = 0;
    let last = -1;
    for (let i = profile.length - 1; i >= 0; i--) {
      acc += profile[i]!;
      if (acc > budget) {
        last = i;
        break;
      }
    }
    return first === -1 || last <= first ? null : [first, last];
  };

  const h = span(cols);
  const v = span(rows);
  if (h === null || v === null) return null;
  return {
    left: h[0],
    top: v[0],
    width: h[1] - h[0] + 1,
    height: v[1] - v[0] + 1,
  };
}

/**
 * Expand a detected box to the card's true aspect ratio about its own centre,
 * clipped to the image. The card is known to be ID-1, so where the estimate
 * disagrees it is the estimate that is wrong.
 */
function toCardAspect(box: Box, imageWidth: number, imageHeight: number): Box {
  const centreX = box.left + box.width / 2;
  const centreY = box.top + box.height / 2;

  let width = box.width;
  let height = box.height;
  if (width / height < CARD_ASPECT_RATIO) {
    width = height * CARD_ASPECT_RATIO;
  } else {
    height = width / CARD_ASPECT_RATIO;
  }

  // Shrink to fit rather than slide, so the card stays centred on what was
  // detected instead of being pulled toward an edge.
  const fit = Math.min(1, imageWidth / width, imageHeight / height);
  width *= fit;
  height *= fit;

  return {
    left: Math.round(clamp(centreX - width / 2, 0, imageWidth - width)),
    top: Math.round(clamp(centreY - height / 2, 0, imageHeight - height)),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

/** Value at the given quantile of an unsorted list. */
/** A detected background colour as sharp's rotate fill. */
function toRgb(colour: [number, number, number]): {
  r: number;
  g: number;
  b: number;
} {
  return {
    r: Math.round(colour[0]),
    g: Math.round(colour[1]),
    b: Math.round(colour[2]),
  };
}

function percentile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round(q * (sorted.length - 1))),
  );
  return sorted[index]!;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
