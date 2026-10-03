/**
 * Lazy loaders for the OCR engines' heavy native/wasm dependencies.
 *
 * `sharp` is a native binary and `tesseract.js` ships a wasm bundle. Both are
 * declared as *optional* peer dependencies so the NIN validator — the
 * lightweight `/v1/validate-nin` path — does not drag them in. Loading them on
 * the first `recognize()` call rather than at import time keeps that true even
 * for callers who import the package root, and turns a missing install into a
 * clear message instead of a module-resolution stack trace.
 */

import type { Sharp, SharpOptions } from 'sharp';

/**
 * The `sharp` callable, as used by the engines.
 *
 * Declared structurally rather than as `typeof import('sharp')` because sharp
 * ships separate CJS and ESM type entries: the CJS one is `export = sharp` (the
 * module *is* the callable) and the ESM one puts it on `default`. Which of those
 * a consumer's `moduleResolution` picks is not ours to control, so name only the
 * call signature we use — `Sharp` and `SharpOptions` are exported by both.
 */
export type SharpFactory = (
  input?: Buffer | Uint8Array | string,
  options?: SharpOptions,
) => Sharp;

/** The parts of `tesseract.js` the offline engine uses. */
export type TesseractModule = Pick<
  typeof import('tesseract.js'),
  'createWorker' | 'PSM'
>;

export async function loadSharp(): Promise<SharpFactory> {
  let mod: unknown;
  try {
    mod = await import('sharp');
  } catch (cause) {
    throw new Error(missing('sharp'), { cause });
  }
  return unwrapCallable<SharpFactory>(mod, 'sharp');
}

export async function loadTesseract(): Promise<TesseractModule> {
  let mod: unknown;
  try {
    mod = await import('tesseract.js');
  } catch (cause) {
    throw new Error(missing('tesseract.js'), { cause });
  }
  return unwrapNamed<TesseractModule>(mod, 'tesseract.js', [
    'createWorker',
    'PSM',
  ]);
}

/**
 * `sharp` is a CommonJS `export =` module, so a dynamic import yields the
 * callable itself under some interop settings and `{ default: callable }` under
 * others. Normalise instead of betting on one, since the bundler/transpiler in
 * play is the consumer's choice, not ours.
 */
function unwrapCallable<T>(mod: unknown, pkg: string): T {
  if (typeof mod === 'function') return mod as T;
  const asDefault = (mod as { default?: unknown } | null)?.default;
  if (typeof asDefault === 'function') return asDefault as T;
  throw new Error(`"${pkg}" did not resolve to a callable module export.`);
}

/**
 * Same interop problem as {@link unwrapCallable}, for a module consumed by its
 * named exports: a dynamic `import()` of a CommonJS module may expose them on
 * the namespace or nested under `default`, depending on export detection.
 */
function unwrapNamed<T>(mod: unknown, pkg: string, required: string[]): T {
  const candidates = [mod, (mod as { default?: unknown } | null)?.default];
  for (const candidate of candidates) {
    if (
      typeof candidate === 'object' &&
      candidate !== null &&
      required.every((key) => key in candidate)
    ) {
      return candidate as T;
    }
  }
  throw new Error(
    `"${pkg}" did not expose the expected exports (${required.join(', ')}).`,
  );
}

function missing(pkg: string): string {
  return (
    `Sierrafy's OCR engine needs the optional peer dependency "${pkg}", which is ` +
    `not installed. Run \`npm install ${pkg}\` (or \`pnpm add ${pkg}\`). It is ` +
    'optional so that importing @sierrafy/sdk/nin stays free of native binaries.'
  );
}
