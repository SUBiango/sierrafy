/**
 * Pins the package's public entry points.
 *
 * The `./nin` subpath exists so the lightweight validation path stays
 * lightweight (spec §1): importing it must not drag in the OCR engine's native
 * `sharp` binary or `tesseract.js` wasm bundle. That is a packaging promise, so
 * it needs a test — a stray re-export would otherwise undo it silently.
 */
import * as ninEntry from '../nin';
import * as rootEntry from '../index';

const HEAVY_DEPS =
  /node_modules[\\/](\.pnpm[\\/])?(sharp|tesseract\.js)([\\/@]|$)/;

function heavyModulesLoaded(): string[] {
  return Object.keys(require.cache).filter((path) => HEAVY_DEPS.test(path));
}

describe('@sierrafy/sdk/nin — the validator on its own', () => {
  it('exports the validator surface', () => {
    expect(typeof ninEntry.validateNin).toBe('function');
    expect(typeof ninEntry.loadNinFormatSchema).toBe('function');
    expect(typeof ninEntry.assertValidNinFormatSchema).toBe('function');
    expect(typeof ninEntry.InvalidNinFormatSchemaError).toBe('function');
    expect(typeof ninEntry.luhnIsValid).toBe('function');
    expect(typeof ninEntry.extractDigits).toBe('function');
    expect(ninEntry.CHECKSUM_ALGORITHMS).toEqual(['luhn']);
    expect(ninEntry.defaultNinFormatSchema.length).toBe(8);
  });

  it('works without any OCR code', () => {
    expect(ninEntry.validateNin('ABCD1234').valid).toBe(true);
    expect(ninEntry.validateNin('abcd1234').error).toBe('INVALID_CHARSET');
  });

  it('does not export OCR', () => {
    expect('ocr' in ninEntry).toBe(false);
    expect('crossCheck' in ninEntry).toBe(false);
    expect('loadZoneMap' in ninEntry).toBe(false);
  });

  it('loads neither sharp nor tesseract.js', () => {
    // Both entry points are imported at the top of this file, so if either pulled
    // the heavy deps in eagerly they would already be in the require cache.
    expect(heavyModulesLoaded()).toEqual([]);
  });
});

describe('@sierrafy/sdk — package root', () => {
  it('re-exports both the validator and the OCR surface', () => {
    expect(typeof rootEntry.validateNin).toBe('function');
    expect(typeof rootEntry.loadNinFormatSchema).toBe('function');
    expect(typeof rootEntry.ocr).toBe('function');
    expect(typeof rootEntry.crossCheck).toBe('function');
    expect(typeof rootEntry.loadZoneMap).toBe('function');
  });

  it('still loads the heavy deps lazily, not at import time', () => {
    expect(heavyModulesLoaded()).toEqual([]);
  });
});
