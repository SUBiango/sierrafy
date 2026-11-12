# Tasks: OCR Engine + National eID Zone Map

**Milestone:** M2 (Weeks 3–4) · **Spec:** [`spec.md`](spec.md) · **Plan:** [`plan.md`](plan.md)

> **spec-kit note.** Ordered tasks derived from the spec's requirements and
> acceptance criteria. `[P]` = parallelisable (no dependency on a sibling `[P]`
> task). Each maps to a user story / AC (US#). Paths are exact.

> **Status (this branch).** Phases 1–6 implemented in `packages/core/src/ocr/`:
> 64 tests pass (1 real-sample smoke test skipped by default), OCR module
> coverage ≥90% on statements/lines, lint + build green. **B1/B2 resolved** with
> the 10 real samples now in `eID samples/`: zone map calibrated
> (`"provisional": false`, per-field `type` hints), and the accuracy metric
> **measured at 2/10 exact NIN (20%), 58% char accuracy** — below the ≥80% target
> for understood reasons (see [`plan.md`](plan.md) §4). Engine upgraded
> (green-channel preprocessing, per-field whitelist + single-line PSM, dot-format
> dates).

## Phase 1 — Setup

- [x] **T001** Add deps to `packages/core/package.json`: `tesseract.js@^5`,
  `sharp`, a Levenshtein helper (`fastest-levenshtein`); `pnpm install`.
- [x] **T002** [P] Create `zone-maps/SL_NATIONAL_EID.json` from
  [`plan.md`](plan.md) §6 — §4.2.3 fields **plus `document_number` + `expiry`**,
  `"provisional": true`. (US1, AC #1)

## Phase 2 — Foundational (blocks all stories)

- [x] **T003** [P] `packages/core/src/ocr/types.ts` — `OcrResult`,
  `ExtractedFields`, `CrossCheckResult`, `OcrEngine`,
  `OcrErrorCode` (`IMAGE_UNREADABLE | DOCUMENT_UNSUPPORTED`).
- [x] **T004** [P] `packages/core/src/ocr/zone-map.ts` — load + validate zone
  JSON; crop relative `{x,y,w,h}` zones from a Buffer via `sharp.extract`.
- [x] **T005** [P] `packages/core/src/ocr/normalize-dob.ts` — `DD/MM/YYYY` → ISO
  `YYYY-MM-DD`; reject malformed.

## Phase 3 — Extraction engine (US1: extract NIN/name/DOB)

- [x] **T006** `packages/core/src/ocr/engines/tesseract.ts` — Sharp pre-process
  (grayscale, contrast, resize) → Tesseract.js v5 per-zone recognition →
  aggregate `ocr_confidence`. Default engine; **no outbound calls**.
- [x] **T007** [P] `packages/core/src/ocr/engines/google-vision.ts` — opt-in
  adapter; init-fails without `GOOGLE_VISION_KEY`; the only egress path.
- [x] **T008** `packages/core/src/ocr/engines/index.ts` — select engine from
  `options.engine` / `OCR_ENGINE` env, default `tesseract`.
- [x] **T009** `packages/core/src/ocr/index.ts` — `ocr(idImage, opts?)` returning
  the `/v1/ocr` shape (§5); map failures to `IMAGE_UNREADABLE` /
  `DOCUMENT_UNSUPPORTED`. Re-export `ocr`/`crossCheck` from
  `packages/core/src/index.ts`.

## Phase 4 — Cross-check (US2: match card vs submitted)

- [x] **T010** `packages/core/src/ocr/cross-check.ts` — NIN exact (+ reuse
  `validateNin` for `nin_format_valid`), name Levenshtein ≥0.85, DOB exact after
  normalise. (US2, AC #3, #4)

## Phase 5 — Tests

- [x] **T011** [P] `__tests__/zone-map.test.ts` — asserts `document_number` +
  `expiry` present alongside NIN/name/DOB. (AC #1)
- [x] **T012** [P] `__tests__/normalize-dob.test.ts` — `17/04/1992` →
  `1992-04-17`; malformed rejected. (AC #2)
- [x] **T013** [P] `__tests__/cross-check.test.ts` — NIN match/mismatch; name
  "AMINATA KAMARA" vs "Aminata Kamara" passes, different name fails. (AC #3, #4)
- [x] **T014** [P] `__tests__/engines.test.ts` — default makes no outbound call;
  `google-vision` routes to the **mocked** Vision path. (AC #5)
- [x] **T015** [P] `__tests__/ocr.test.ts` — `IMAGE_UNREADABLE` and
  `DOCUMENT_UNSUPPORTED` paths (no throw); smoke-run the 2 local cards and record
  the baseline metric. (AC #6)

## Phase 6 — Polish

- [x] **T016** Confirm module coverage ≥90%; ensure **no real NIN/PII** in
  committed code/tests. (AC #7)
- [x] **T017** Update `zone-maps/README.md` note + the specs index
  (`specs/001-nin-format-validator/README.md`): add M2 row, flip M1 to "Done".

## Sample-dependent — resolved with the 10 real eID samples

- [x] **B1** Calibrate `SL_NATIONAL_EID.json` against the 10 real fronts; cleared
  `"provisional"`, added per-field `type` hints. (Open Question §12.2)
- [x] **B2** Ran AC #8 via `packages/core/scripts/measure-ocr-accuracy.mjs`:
  **2/10 exact NIN (20%), 58% mean char accuracy** (offline Tesseract). Recorded;
  **below the ≥80% target** for understood reasons — see [`plan.md`](plan.md) §4.

## Follow-ups to raise accuracy toward ≥80% (next milestones)

Scoped and sequenced in [`accuracy-plan.md`](accuracy-plan.md), which also
records what F2 settled and corrects the root-cause weighting in
[`plan.md`](plan.md) §4.

- [ ] **F1** Measure the **Google Vision** engine on the same set (needs a billed
  `GOOGLE_VISION_KEY`); the architecture's accuracy-boost path. Note the
  non-technical precondition: it transmits ten real cards to a third party.
- [x] **F2** Added **card-boundary normalisation** (`normalizeCard`, on by
  default): detects the card against its background, deskews and crops, so the
  zone fractions land on the right text. **No accuracy change on this sample
  set** (still 2/10, 58%), because all 10 samples are already cropped to the
  card: aspect ratios run 1.531 to 1.637 against ID-1's 1.585. Retained for the
  margin-padded and rotated captures the set does not contain, verified on drawn
  fixtures. Needs the zone map re-measured on normalised cards before it can
  contribute, which is a dependency of F3.
- [ ] **F3** Source **higher-resolution, flat** captures; re-run the harness.
  The largest failure bucket is dropped characters, and this is the only lever
  that attacks it. Re-measure the zone map on normalised cards at the same time.
- [ ] **F4** If NCRA confirms a **NIN checksum**, use it to auto-correct single
  glyph confusions (`0/O`, `1/I`, `5/S`).
- [ ] **F5** (new) **Fine-tune on the card's font.** The substitutions come from
  the generic English model's prior, not the ink, and the NIN sits in a fixed
  font at a fixed position. The only in-our-control lever against the
  substitution bucket; shares F3's need for more consented samples.

## Dependencies

T001–T002 → T003–T005 → T006–T009 → T010 → T011–T015 → T016–T017. B1/B2 done with
the real samples. F2 done 2026-11-12. F1, F3, F4 and F5 are future accuracy
work; F3 gates F5 and unblocks F2's contribution, and F4 is gated on NCRA.
