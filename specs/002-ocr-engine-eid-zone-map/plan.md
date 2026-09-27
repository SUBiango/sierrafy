# Plan: OCR Engine + National eID Zone Map

**Milestone:** M2 (Weeks 3–4) · **Package:** `@sierrafy/sdk` (`packages/core`)
**Spec:** [`spec.md`](spec.md) · **Tasks:** [`tasks.md`](tasks.md)

> **spec-kit note.** This is the `plan` artifact (the *how*) — technical context,
> structure, and the gate that blocks the accuracy deliverable.

## 1. Summary

Add an `ocr()` library function to `packages/core` that extracts NIN/name/DOB
from a Sierra Leone eID image via a zone-map-driven Tesseract.js pipeline (with an
opt-in Google Vision adapter), plus a `crossCheck()` that compares extracted
fields to user-submitted data. Ship the `SL_NATIONAL_EID.json` zone map extended
with the `document_number` + `expiry` BAC-key zones. Mirror M1's conventions:
external JSON config, error-as-field results, synthetic-only tests, ≥90%
coverage, library-first with HTTP deferred to M6.

## 2. Technical context

| Concern | Choice | Notes |
|---|---|---|
| Language / build | TypeScript, `tsc -b` (composite), ts-jest | same as `packages/core` today |
| Primary OCR | **Tesseract.js v5** | bundled, offline, default |
| Pre-processing | **Sharp** | grayscale, contrast, resize; also zone cropping via `extract` |
| Fuzzy name match | **Levenshtein** | `fastest-levenshtein` or a small local impl; similarity = `1 − dist/maxLen` |
| Optional OCR | **Google Cloud Vision** | behind `OCR_ENGINE=google-vision` + `GOOGLE_VISION_KEY`; mocked in tests |
| Config | env `OCR_ENGINE` (default `tesseract`), `GOOGLE_VISION_KEY` | already in `.env.example` |
| Zone maps | repo-root `zone-maps/*.json` (CC0) | loaded by path; relative coordinates |

New deps for `packages/core/package.json`: `tesseract.js@^5`, `sharp`, the
Levenshtein helper. Build step already copies assets via `cpSync`; extend if the
zone map needs bundling into `dist/` (default: load from repo `zone-maps/`).

## 3. Constitution check (project guardrails)

- **Offline by default** — default path makes no outbound call; Vision is the
  sole, explicit egress. ✅ (tested)
- **No biometric persistence** — photo zone passed in memory to M4; never written.
  ✅ (M2 does no disk writes of image bytes)
- **No PII in repo** — only synthetic fixtures committed; real cards stay in
  gitignored `eID samples/`. ✅
- **Provisional, configurable** — unconfirmed layout lives in JSON with a
  `"provisional"` flag, not hard-coded. ✅

## 4. Accuracy: measured result and the gap to ≥80% (RESOLVED — samples in)

10 real eID fronts are now in `eID samples/` (gitignored PII), unblocking both
items that were sample-gated:

- **Zone calibration — done.** `SL_NATIONAL_EID.json` coordinates are measured
  from the real cards (template is identical across all 10), `"provisional"` flag
  cleared. The map now also carries per-field `type` hints (`alnum`/`alpha`/
  `date`/`photo`) driving the OCR whitelist, and `document_number` + `expiry`
  (BAC inputs).
- **Accuracy metric — measured: 2/10 exact NIN (20%), 58% mean char accuracy**
  via `packages/core/scripts/measure-ocr-accuracy.mjs` (offline Tesseract). This
  is **below the ≥80% target.**

**Why offline Tesseract falls short on this set (root cause, understood):**

> The `NIN`→`OCR output` examples below are **synthetic stand-ins** that reproduce
> the same glyph-confusion and cropping failures. Real sample NINs are PII and
> never appear in this repo — see `scripts/check-sample-pii.mjs`, which enforces
> that in CI.

1. **Intrinsic letter/digit confusion — the dominant cause.** The NIN is an
   8-char alphanumeric with **no checksum**, so there is nothing to disambiguate
   `0↔O`, `1↔I`, `5↔S`, `3↔S`. Most misses are off by exactly one or two such
   glyphs (e.g. `PQ4D1R15`→`PQ4DIRIS`). Grayscale, green-channel, and binarised
   preprocessing all produce the *same* swaps — the model maps these glyphs
   identically. No fixed-zone or preprocessing change resolves this.
2. **Crop/rotation variance.** Several samples are phone/CamScanner shots
   (rotated, margin-padded); fixed relative zones miss leading/trailing chars on
   those (e.g. `4JMQ7PN2`→`JMQ7PN2`). Card-boundary normalisation would help.
3. **Security-print background.** The green guilloche reduces contrast;
   green-channel extraction mitigates but does not eliminate it.

**Levers to reach ≥80% (future work, not this milestone):**
- The optional **Google Vision engine** (`OCR_ENGINE=google-vision`) — markedly
  stronger OCR; the architecture's designated accuracy-boost path. Wired and
  unit-tested (mocked); not measured here (needs a billed API key).
- **Higher-resolution, flat, axis-aligned captures** (the dependency asked for
  *high-resolution* scans; the current set is mixed quality).
- An **NCRA-confirmed NIN checksum**, which would let us auto-correct single
  glyph confusions.

What the engine *does* deliver well offline: the cross-check is robust because in
the real flow the **user types the NIN** and OCR confirms it; name uses fuzzy
matching; DOB/expiry parse the card's dot-format dates. The 20% is the cost of
demanding a *perfect* offline read of a checksum-less code off mixed-quality
photos — recorded honestly per AC #8.

## 5. Project structure

```
packages/core/src/ocr/
  index.ts              # public ocr() + crossCheck(); re-exported from ../index.ts
  types.ts              # OcrResult, ExtractedFields, CrossCheckResult, OcrEngine, OcrErrorCode
  zone-map.ts           # load + validate zone JSON; crop relative zones via Sharp.extract
  normalize-dob.ts      # DD/MM/YYYY -> ISO YYYY-MM-DD
  cross-check.ts        # NIN exact (+ validateNin), name Levenshtein >=0.85, DOB exact
  engines/
    index.ts            # select engine from option/env; default tesseract
    tesseract.ts        # Sharp pre-process -> Tesseract.js per-zone -> confidence aggregate
    google-vision.ts    # opt-in adapter; only egress; init-fails without GOOGLE_VISION_KEY
  __tests__/
    zone-map.test.ts  normalize-dob.test.ts  cross-check.test.ts  engines.test.ts  ocr.test.ts

zone-maps/SL_NATIONAL_EID.json   # §4.2.3 fields + document_number + expiry; "provisional": true
```

Reuse: `packages/core/src/validate-nin.ts` (for `nin_format_valid`), the M1
error-code/result pattern, `jest.config.js`, `tsconfig.base.json`.

## 6. Data model

**Zone map** (`SL_NATIONAL_EID.json`) — each zone `{ x, y, w, h }` as fractions
0–1; adds `document_number` and `expiry` beyond architecture §4.2.3:

```jsonc
{
  "document_type": "SL_NATIONAL_EID",
  "provisional": true,
  "zones": {
    "nin":             { "x": 0.05, "y": 0.58, "w": 0.55, "h": 0.10 },
    "surname":         { "x": 0.05, "y": 0.38, "w": 0.55, "h": 0.10 },
    "given_name":      { "x": 0.05, "y": 0.46, "w": 0.55, "h": 0.10 },
    "dob":             { "x": 0.05, "y": 0.68, "w": 0.35, "h": 0.10 },
    "document_number": { "x": 0.05, "y": 0.78, "w": 0.55, "h": 0.08 },  // BAC input
    "expiry":          { "x": 0.05, "y": 0.86, "w": 0.35, "h": 0.08 },  // BAC input
    "photo":           { "x": 0.65, "y": 0.28, "w": 0.30, "h": 0.40 }
  }
}
```

**Types** (`types.ts`): `OcrErrorCode = 'IMAGE_UNREADABLE' | 'DOCUMENT_UNSUPPORTED'`;
`OcrResult` and `CrossCheckResult` per [`spec.md`](spec.md) §5.

## 7. Test strategy

ts-jest, synthetic data only. Unit tests for zone-map loader (asserts BAC zones),
DOB normaliser, cross-check (NIN/name thresholds), and engine selection (default
= no network; vision = mocked egress). A smoke test runs the pipeline on the 2
local cards to record a baseline metric — the ≥80%/≥10 metric stays
[SAMPLE-GATED]. Coverage ≥90% on the module.

## 8. Verification

- `pnpm install`; `pnpm -C packages/core build` succeeds (deps resolve, assets
  copied).
- `pnpm test` green; OCR tests pass; core coverage stays ≥90%.
- Offline assertion holds for `tesseract`; `google-vision` hits the mocked path.
- Zone-map test proves `document_number` + `expiry` present (BAC inputs ready
  for Week 14).
- AC #8 recorded as **blocked pending ≥10 real samples**, not done.
