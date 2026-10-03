import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DocumentType, ZoneBox, ZoneMap } from './types';

/** Zones every supported zone map must define (the BAC inputs are included). */
const REQUIRED_ZONES = [
  'nin',
  'surname',
  'given_name',
  'dob',
  'document_number',
  'expiry',
  'photo',
] as const;

/**
 * Resolve the directory holding the zone maps.
 *
 * Two layouts have to work. In an installed package the maps are bundled at
 * `dist/zone-maps` by the build, because walking up from `node_modules` would
 * land outside the package and find nothing. In this monorepo they live at the
 * repository root, since they are CC0 assets shared beyond this package.
 *
 * Candidates are tried in order and the first that exists wins, so a published
 * install never depends on the repository layout.
 */
function zoneMapsDir(): string {
  const candidates = [
    // Installed layout: .../@sierrafy/sdk/dist/ocr -> .../dist/zone-maps
    join(__dirname, '..', 'zone-maps'),
    // Monorepo layout: packages/core/{src|dist}/ocr -> <repo root>/zone-maps
    join(__dirname, '..', '..', '..', '..', 'zone-maps'),
  ];
  return candidates.find((dir) => existsSync(dir)) ?? candidates[0]!;
}

/** Map a document type to its zone-map filename. */
const FILE_BY_TYPE: Record<DocumentType, string> = {
  SL_NATIONAL_EID: 'SL_NATIONAL_EID.json',
  SL_PASSPORT: 'SL_PASSPORT.json',
};

/**
 * Load and validate a zone map for the given document type. Throws if the file
 * is missing a required zone or a malformed box — these are developer/asset
 * errors, not end-user input errors.
 */
export function loadZoneMap(
  documentType: DocumentType,
  options: { dir?: string } = {},
): ZoneMap {
  const dir = options.dir ?? zoneMapsDir();
  const path = join(dir, FILE_BY_TYPE[documentType]);
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as ZoneMap;
  assertValidZoneMap(parsed, documentType, path);
  return parsed;
}

/** Validate shape: correct type, all required zones present, boxes in range. */
export function assertValidZoneMap(
  map: ZoneMap,
  expectedType: DocumentType,
  source = '<inline>',
): void {
  if (map.document_type !== expectedType) {
    throw new Error(
      `zone map ${source}: document_type ${map.document_type} != ${expectedType}`,
    );
  }
  for (const zone of REQUIRED_ZONES) {
    const box = map.zones?.[zone];
    if (!box) throw new Error(`zone map ${source}: missing zone "${zone}"`);
    assertValidBox(box, zone, source);
  }
}

function assertValidBox(box: ZoneBox, zone: string, source: string): void {
  for (const k of ['x', 'y', 'w', 'h'] as const) {
    const v = box[k];
    if (typeof v !== 'number' || v < 0 || v > 1) {
      throw new Error(
        `zone map ${source}: zone "${zone}" has invalid ${k}=${v}`,
      );
    }
  }
}

/** Convert a relative box to integer pixel coordinates for a given image size. */
export function toPixelBox(
  box: ZoneBox,
  width: number,
  height: number,
): { left: number; top: number; width: number; height: number } {
  return {
    left: Math.round(box.x * width),
    top: Math.round(box.y * height),
    width: Math.max(1, Math.round(box.w * width)),
    height: Math.max(1, Math.round(box.h * height)),
  };
}
