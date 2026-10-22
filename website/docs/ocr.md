---
id: ocr
title: Document OCR
---

# Document OCR

:::warning Experimental

Offline NIN extraction is accurate on **2 of 10** real sample cards, against a
target of 80%. Do not depend on this in production yet. The NIN validator is a
separate module and is unaffected.

:::

Reads the NIN, name and date of birth from a Sierra Leone National eID card.

```js
import { ocr, crossCheck } from '@sierrafy/sdk/ocr';

const result = await ocr(imageBuffer);
// {
//   document_type: 'SL_NATIONAL_EID',
//   extracted: { nin: 'ABCD1234', name: 'AMINATA KAMARA', dob: '1992-04-17' },
//   ocr_confidence: 0.82
// }
```

Needs the optional peers: `npm install sharp tesseract.js`. See
[Install](./install.md).

## Why the accuracy is low

The cause is understood and is not a preprocessing problem. The NIN is 8
alphanumeric characters with **no checksum**, so nothing disambiguates `0` from
`O`, `1` from `I`, or `5` from `S`. Most misses are off by one or two such
glyphs, and grayscale, green-channel and binarised preprocessing all produce the
same substitutions.

Three things would move it: an NCRA-confirmed checksum, which would let the
engine auto-correct single-character errors; higher-resolution, flat,
axis-aligned captures; or the optional Google Vision engine.

## Checking against what the user typed

```js
const check = crossCheck(result, {
  nin: 'ABCD1234',
  name: 'Aminata Kamara',
  dob: '1992-04-17',
});
// { nin_format_valid, nin_matches_card, name_matches, dob_matches, ... }
```

The NIN must match exactly. Names are compared with Levenshtein similarity
against `NAME_MATCH_THRESHOLD`, so case and ordering differences pass but a
different person does not. Dates are normalised first, so `17/04/1992` and
`1992-04-17` compare equal.

## Errors

`ocr()` does not throw for unreadable input. It returns a result with `error`
set and `extracted` as `null`.

| Code | Meaning |
|---|---|
| `IMAGE_UNREADABLE` | No usable text in any zone |
| `DOCUMENT_UNSUPPORTED` | A document type this milestone does not handle |

It does throw if an optional peer dependency is missing, because that is a setup
error rather than bad input.

## Staying offline

The default Tesseract engine makes **no outbound network call**. Setting
`OCR_ENGINE=google-vision` with a `GOOGLE_VISION_KEY` routes to Google Cloud
Vision instead, which is markedly more accurate and is the only code path in
Sierrafy that leaves your machine. It is off unless you turn it on.

## Zone maps

Field positions come from a JSON zone map with relative coordinates, bundled with
the package and licensed CC0 separately from the MIT code. `SL_NATIONAL_EID` is
calibrated against 10 real card fronts and includes the document number and
expiry zones that NFC chip reading will need.

Coordinates assume a reasonably framed, axis-aligned photo. Heavily rotated or
margin-padded captures lose leading or trailing characters.
