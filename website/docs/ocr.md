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

Two distinct things go wrong, in roughly equal measure. Of the 8 failures on the
10-sample set:

- **4 drop characters**, coming back short by one or more with no wrong
  characters at all. The recognizer is returning less than the field holds.
- **3 substitute characters**, every one a known confusable pair. The NIN is 8
  alphanumeric characters with **no checksum**, so nothing disambiguates `0`
  from `O`, `1` from `I`, or `5` from `S`. Grayscale, green-channel and
  binarised preprocessing all produce the same substitutions.
- 1 does both.

Neither is a framing or configuration problem, and that has been measured rather
than assumed. Card-boundary detection, zone padding and every available page
segmentation mode were each tried against the sample set and none beats 2/10,
so the current offline configuration is at a local optimum.

Three things would move it: higher-resolution, flat captures, which is the only
lever against the dropped characters; an NCRA-confirmed checksum, which would
let the engine correct the substitutions; or the optional Google Vision engine.
The reasoning and the measurements are in the
[M2 accuracy plan](https://github.com/SUBiango/sierrafy/blob/main/specs/002-ocr-engine-eid-zone-map/accuracy-plan.md).

## Framing and tilt

`ocr()` finds the card against its background, straightens it and crops to its
edges before reading any zone, because the zone map's coordinates are fractions
of the card: a margin down one side or a few degrees of tilt shifts every field.

Detection is conservative. It declines on anything that does not look like a
card on a background, including an image already cropped to the card edges, and
returns the image untouched rather than guessing. Turn it off if your images are
pre-cropped and you want to skip the work:

```js
const result = await ocr(imageBuffer, { normalizeCard: false });
```

It needs `sharp`, which OCR already requires. It makes no difference to the
accuracy figure above, because all 10 calibration samples are already cropped to
the card and are therefore declined.

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

**No identity data leaves your machine on the default engine.** Recognition runs
locally on WebAssembly, and no image, NIN or extracted field is sent anywhere.

There is one caveat, and it is worth stating precisely rather than glossing:
`eng.traineddata`, the Tesseract language model, is not bundled in this package.
On the first `ocr()` call `tesseract.js` downloads it from the jsdelivr CDN
(about 3 MB gzipped, for the LSTM model the default engine mode uses) and caches
it in the process working directory. That request
carries no identity data and no image, but it is a network call, and **on a
machine with no internet access the first OCR run fails**.

To remove it, give the engine a local copy of the model. Download
`eng.traineddata` once (3.9 MB from
[tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata)),
put it in a directory, and name that directory as the cache:

```js
import { ocr } from '@sierrafy/sdk';

const result = await ocr(imageBuffer, {
  tesseract: { cachePath: '/opt/tessdata' }, // holds eng.traineddata
});
```

Or set it once for the process, which is usually what you want in a container:

| Variable | Effect |
|---|---|
| `TESSERACT_CACHE_PATH` | Directory the model is read from before any download, and written to after one. Put a plain `eng.traineddata` here and nothing is ever fetched. |
| `TESSERACT_LANG_PATH` | Where the model is loaded from on a cache miss: a URL (your own mirror), or a local directory. |

```bash
TESSERACT_CACHE_PATH=/opt/tessdata node app.js
```

An explicit option beats the environment variable, which beats the CDN default.

:::note The two paths want different filenames

`cachePath` reads **`eng.traineddata`**, plain and uncompressed. That is the file
you get from tessdata_fast, so this route is copy-and-go.

`langPath` pointed at a local directory reads **`eng.traineddata.gz`**, because
`tesseract.js` appends `.gz` by default. Point `langPath` at a directory holding
an uncompressed file and it fails with `ENOENT` on the `.gz` name. Use
`cachePath` for a plain file, and `langPath` for a URL or a gzipped copy.

:::

With `cachePath` set to a directory that holds the model, the OCR path is
genuinely offline and works air-gapped. If you are building a Docker image,
copying `eng.traineddata` in and setting `TESSERACT_CACHE_PATH` is the whole job.

## Sending data off the machine

Setting `OCR_ENGINE=google-vision` with a `GOOGLE_VISION_KEY` routes to Google
Cloud Vision, which is markedly more accurate and is **the only code path in
Sierrafy that sends identity data anywhere**. Card images, including the
portrait, leave your infrastructure and leave Sierra Leone. It is off unless you
turn it on. See [Privacy](./privacy.md) for what enabling it commits you to.

## Zone maps

Field positions come from a JSON zone map with relative coordinates, bundled with
the package and licensed CC0 separately from the MIT code. `SL_NATIONAL_EID` is
calibrated against 10 real card fronts and includes the document number and
expiry zones that NFC chip reading will need.

Coordinates assume a reasonably framed, axis-aligned photo. Heavily rotated or
margin-padded captures lose leading or trailing characters.
