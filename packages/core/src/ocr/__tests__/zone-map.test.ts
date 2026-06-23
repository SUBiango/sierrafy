import { loadZoneMap, toPixelBox, assertValidZoneMap } from '../zone-map';
import type { ZoneMap } from '../types';

describe('loadZoneMap — SL_NATIONAL_EID', () => {
  const map = loadZoneMap('SL_NATIONAL_EID');

  it('loads the eID zone map with the correct document type', () => {
    expect(map.document_type).toBe('SL_NATIONAL_EID');
  });

  // AC #1: the eID map must expose the BAC-key inputs (document_number +
  // expiry) alongside NIN/name/DOB/photo, so the NFC layer (Week 14) has them.
  it('exposes document_number and expiry (BAC inputs) plus NIN/name/DOB/photo', () => {
    for (const zone of [
      'nin',
      'surname',
      'given_name',
      'dob',
      'document_number',
      'expiry',
      'photo',
    ]) {
      expect(map.zones[zone]).toBeDefined();
    }
  });

  it('is flagged provisional until calibrated against ≥10 samples', () => {
    expect(map.provisional).toBe(true);
  });

  it('has every box within relative bounds (0–1)', () => {
    for (const box of Object.values(map.zones)) {
      for (const v of [box.x, box.y, box.w, box.h]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('assertValidZoneMap', () => {
  it('rejects a map missing a required zone', () => {
    const bad = {
      document_type: 'SL_NATIONAL_EID',
      zones: { nin: { x: 0, y: 0, w: 0.1, h: 0.1 } },
    } as unknown as ZoneMap;
    expect(() => assertValidZoneMap(bad, 'SL_NATIONAL_EID')).toThrow(
      /missing zone/,
    );
  });

  it('rejects a document_type mismatch', () => {
    const map = loadZoneMap('SL_NATIONAL_EID');
    expect(() => assertValidZoneMap(map, 'SL_PASSPORT')).toThrow(
      /document_type/,
    );
  });
});

describe('toPixelBox', () => {
  it('converts relative coordinates to rounded pixel boxes', () => {
    expect(toPixelBox({ x: 0.05, y: 0.5, w: 0.5, h: 0.1 }, 1000, 600)).toEqual({
      left: 50,
      top: 300,
      width: 500,
      height: 60,
    });
  });

  it('never produces a zero-width or zero-height region', () => {
    const px = toPixelBox({ x: 0, y: 0, w: 0.0001, h: 0.0001 }, 10, 10);
    expect(px.width).toBeGreaterThanOrEqual(1);
    expect(px.height).toBeGreaterThanOrEqual(1);
  });
});
