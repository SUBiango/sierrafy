import sharp from 'sharp';

import { CARD_ASPECT_RATIO, normalizeCard } from '../normalize-card';

/**
 * Every fixture here is drawn with sharp. No real card image is used, and none
 * could be: real ID samples never enter the repository, and a photo of one is
 * exactly what this module is designed to take apart.
 */

const WHITE = { r: 255, g: 255, b: 255 };
const DESK = { r: 60, g: 55, b: 50 };
/** Light green, close to the real card's security print, and close to white. */
const CARD = { r: 205, g: 232, b: 208 };
const INK = { r: 20, g: 20, b: 20 };

async function block(
  width: number,
  height: number,
  background: { r: number; g: number; b: number },
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toBuffer();
}

/** A card-shaped rectangle with two dark bars standing in for printed text. */
async function card(width = 800): Promise<Buffer> {
  const height = Math.round(width / CARD_ASPECT_RATIO);
  return sharp({
    create: { width, height, channels: 3, background: CARD },
  })
    .composite([
      {
        input: await block(Math.round(width * 0.37), 40, INK),
        left: Math.round(width * 0.47),
        top: Math.round(height * 0.79),
      },
      {
        input: await block(Math.round(width * 0.25), 36, INK),
        left: Math.round(width * 0.35),
        top: Math.round(height * 0.29),
      },
    ])
    .png()
    .toBuffer();
}

/** Place a card on a background, optionally rotated clockwise by `degrees`. */
async function scene(
  options: {
    degrees?: number;
    background?: { r: number; g: number; b: number };
    left?: number;
    top?: number;
    frame?: { width: number; height: number };
  } = {},
): Promise<Buffer> {
  const background = options.background ?? WHITE;
  const frame = options.frame ?? { width: 1200, height: 900 };
  const rotated = await sharp(await card())
    .rotate(options.degrees ?? 0, { background })
    .png()
    .toBuffer();
  const meta = await sharp(rotated).metadata();
  return sharp({
    create: { ...frame, channels: 3, background },
  })
    .composite([
      {
        input: rotated,
        left: options.left ?? Math.round((frame.width - (meta.width ?? 0)) / 2),
        top: options.top ?? Math.round((frame.height - (meta.height ?? 0)) / 2),
      },
    ])
    .png()
    .toBuffer();
}

async function aspectOf(image: Buffer): Promise<number> {
  const meta = await sharp(image).metadata();
  return (meta.width ?? 0) / (meta.height ?? 1);
}

describe('normalizeCard — detection', () => {
  it('crops a card photographed square-on against a uniform background', async () => {
    const result = await normalizeCard(await scene());

    expect(result.applied).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(await aspectOf(result.image)).toBeCloseTo(CARD_ASPECT_RATIO, 2);
    // The card occupies two thirds of the frame's width, so a real crop must
    // come out smaller than the frame it was found in.
    const meta = await sharp(result.image).metadata();
    expect(meta.width).toBeLessThan(1200);
  });

  it('works on a dark background as well as a light one', async () => {
    const result = await normalizeCard(
      await scene({ background: DESK, left: 60, top: 300 }),
    );

    expect(result.applied).toBe(true);
    expect(await aspectOf(result.image)).toBeCloseTo(CARD_ASPECT_RATIO, 2);
  });

  it.each([3, -3, 8, -12])(
    'recovers a %s degree tilt',
    async (degrees: number) => {
      const result = await normalizeCard(await scene({ degrees }));

      expect(result.applied).toBe(true);
      // Reported counter-clockwise, so undoing a clockwise tilt is positive.
      expect(result.rotationDegrees).toBeCloseTo(degrees, 0);
      expect(await aspectOf(result.image)).toBeCloseTo(CARD_ASPECT_RATIO, 2);
    },
  );

  it('outputs the card aspect ratio even when the detected box is off', async () => {
    // A frame much taller than the card makes the detected box's own aspect
    // irrelevant; the output should still be card-shaped.
    const result = await normalizeCard(
      await scene({ frame: { width: 1000, height: 1400 } }),
    );

    expect(result.applied).toBe(true);
    expect(await aspectOf(result.image)).toBeCloseTo(CARD_ASPECT_RATIO, 2);
  });
});

describe('normalizeCard — declining to act', () => {
  it('leaves an image that is already the card untouched', async () => {
    // The calibration samples look like this: cropped to the card, so the
    // border frame is the card's own margin and there is no background to find.
    const input = await card(1000);
    const result = await normalizeCard(input);

    expect(result.applied).toBe(false);
    expect(result.image).toBe(input);
  });

  it('declines a tilt beyond the limit rather than cropping it crooked', async () => {
    const result = await normalizeCard(await scene({ degrees: 25 }));

    expect(result.applied).toBe(false);
    expect(result.skipped).toBe('EXCESSIVE_SKEW');
  });

  it('honours a lowered maxSkewDegrees', async () => {
    const image = await scene({ degrees: 8 });

    await expect(normalizeCard(image)).resolves.toMatchObject({
      applied: true,
    });
    await expect(
      normalizeCard(image, { maxSkewDegrees: 5 }),
    ).resolves.toMatchObject({ applied: false, skipped: 'EXCESSIVE_SKEW' });
  });

  it('declines when the border is not a uniform background', async () => {
    // Noise to the edges: nothing here can be called background.
    const noise = Buffer.alloc(600 * 400 * 3);
    for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) % 256;
    const image = await sharp(noise, {
      raw: { width: 600, height: 400, channels: 3 },
    })
      .png()
      .toBuffer();

    const result = await normalizeCard(image);

    expect(result.applied).toBe(false);
    expect(result.skipped).toBe('BORDER_NOT_UNIFORM');
  });

  it('declines a blank image, which has no card in it', async () => {
    const result = await normalizeCard(await block(800, 600, WHITE));

    expect(result.applied).toBe(false);
    expect(result.image).toBeDefined();
  });

  it('declines an image too small to analyse', async () => {
    const result = await normalizeCard(await block(10, 8, WHITE));

    expect(result.applied).toBe(false);
    expect(result.skipped).toBe('UNDECODABLE');
  });

  it('returns a non-image buffer unchanged instead of throwing', async () => {
    const input = Buffer.from('this is not an image');
    const result = await normalizeCard(input);

    expect(result.applied).toBe(false);
    expect(result.skipped).toBe('UNDECODABLE');
    expect(result.image).toBe(input);
  });

  it('returns an empty buffer unchanged instead of throwing', async () => {
    const input = Buffer.alloc(0);

    await expect(normalizeCard(input)).resolves.toMatchObject({
      applied: false,
      image: input,
    });
  });

  it('declines when the detected shape fills the whole frame', async () => {
    // A uniform border one pixel wide around a wholly different interior:
    // the background is found, but there is no margin left to remove.
    const image = await sharp({
      create: { width: 600, height: 400, channels: 3, background: WHITE },
    })
      .composite([{ input: await block(598, 398, INK), left: 1, top: 1 }])
      .png()
      .toBuffer();

    const result = await normalizeCard(image);

    expect(result.applied).toBe(false);
    expect(result.skipped).toBe('CARD_FILLS_FRAME');
  });

  it('declines a shape that is not card-shaped', async () => {
    // A solid square: filled like a card, so it passes the fill test, but no
    // card is square. It also has no principal axis, which must not rotate it.
    const image = await sharp({
      create: { width: 1000, height: 1000, channels: 3, background: WHITE },
    })
      .composite([{ input: await block(600, 600, INK), left: 200, top: 200 }])
      .png()
      .toBuffer();

    const result = await normalizeCard(image);

    expect(result.applied).toBe(false);
    expect(result.skipped).toBe('IMPLAUSIBLE_ASPECT');
  });

  it('returns the input unchanged when sharp is not installed', async () => {
    // The engine raises the actionable "install sharp" error itself, so here a
    // missing optional peer must degrade quietly rather than surface twice.
    jest.resetModules();
    jest.doMock('../engines/deps', () => ({
      loadSharp: jest.fn().mockRejectedValue(new Error('sharp is missing')),
    }));

    try {
      const { normalizeCard: withoutSharp } = await import('../normalize-card');
      const input = Buffer.from('anything');

      await expect(withoutSharp(input)).resolves.toEqual({
        image: input,
        applied: false,
        skipped: 'SHARP_UNAVAILABLE',
      });
    } finally {
      jest.dontMock('../engines/deps');
      jest.resetModules();
    }
  });
});
