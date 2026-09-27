# @sierrafy/sdk (core)

Core Sierrafy SDK for Sierra Leone NIN verification: the offline NIN format
validator (M1) and the document OCR engine + eID zone map (M2). Fraud-signal
checks follow in M5.

Everything here is **offline**. The only code path that makes an outbound network
call is the optional Google Vision OCR engine, and only when you explicitly
select it.

## Install

```sh
npm install @sierrafy/sdk
```

The OCR engine needs `sharp` and `tesseract.js`. They are **optional peer
dependencies**, so install them only if you use OCR:

```sh
npm install sharp tesseract.js
```

## NIN format validation

```ts
import { validateNin } from '@sierrafy/sdk/nin';

validateNin('ABCD1234');
// { valid: true, nin: 'ABCD1234',
//   checks: { length: true, charset: true, checksum: true, blacklist: true } }

validateNin('abcd1234');
// { valid: false, nin: 'abcd1234', error: 'INVALID_CHARSET',
//   checks: { length: true, charset: false, checksum: true, blacklist: true } }
```

Import from `@sierrafy/sdk/nin` rather than the package root when you only need
validation: that subpath contains no OCR code, so it pulls in neither `sharp` nor
`tesseract.js`, and it is dependency-free and isomorphic (browser and React
Native included).

`validateNin` never throws for any `input`. Non-string input is reported as
`INVALID_LENGTH`, with `nin` set to `''`. `error` is the **first** failing check
in precedence order: `length` → `charset` → `checksum` → `blacklist`.

### Configuring the format

The format is provisional (see below), so every rule lives in an editable JSON
schema rather than in code. To override it, validate your own schema and pass it
in:

```ts
import { readFileSync } from 'node:fs';
import { loadNinFormatSchema, validateNin } from '@sierrafy/sdk/nin';

const schema = loadNinFormatSchema(readFileSync('./my-nin-format.json', 'utf8'));
validateNin('ABCD123456', { schema });
```

`loadNinFormatSchema` accepts JSON text or an already-parsed object, validates
it, and freezes it. A malformed schema throws `InvalidNinFormatSchemaError`
naming the offending field, at configuration time rather than on a validation
call. Do not edit the copy bundled inside `node_modules`; that is not a supported
configuration path.

```jsonc
{
  "version": "0.3.0-provisional",
  "length": 8,
  "charset": "^[A-Z0-9]+$", // must be anchored with ^ and $
  "checksum": { "enabled": false, "algorithm": "luhn" },
  "blacklist": [] // exact NINs to reject, e.g. known test values
}
```

> **Do not enable `checksum`.** The only wired algorithm is Luhn, which runs over
> the NIN's decimal digits and so rejects all-letter NINs, a shape observed on a
> real card. It is a placeholder awaiting an NCRA-confirmed algorithm suited to an
> alphanumeric identifier.

## Document OCR

```ts
import { ocr, crossCheck } from '@sierrafy/sdk/ocr';

const result = await ocr(imageBuffer); // Tesseract, fully offline
// { document_type: 'SL_NATIONAL_EID',
//   extracted: { nin, name, dob }, ocr_confidence: 0.82 }

crossCheck(result, { nin: 'ABCD1234', name: 'Aminata Kamara', dob: '1992-04-17' });
```

Offline NIN extraction accuracy on the current 10-sample set is **20%**, below
the 80% target. The causes and the path forward are documented in
[the M2 plan](../../specs/002-ocr-engine-eid-zone-map/plan.md) (§4).
Set `OCR_ENGINE=google-vision` with `GOOGLE_VISION_KEY` for the stronger,
network-dependent engine.

## Provisional by design

The NIN format is derived from real eID card samples, not from NCRA
documentation. The field labelled "NIN" is 8 uppercase alphanumeric characters
with no country prefix and no embedded year; the long `SL…`-prefixed number on
the card is the separate **Personal ID Number**, which this validator does not
target. The exact charset constraints and whether any checksum exists are
unconfirmed, hence the editable schema. See Architecture Spec §4.1 and §12.1.

Structural validity is not registry validity: this confirms a NIN is *well
formed*, never that it is active in the NCRA registry. Live lookups are Phase 2.

## Specs

- [M1: NIN format validator](../../specs/001-nin-format-validator/nin-format-validator.md)
  ([review](../../specs/001-nin-format-validator/review.md))
- [M2: OCR engine + eID zone map](../../specs/002-ocr-engine-eid-zone-map/spec.md)
