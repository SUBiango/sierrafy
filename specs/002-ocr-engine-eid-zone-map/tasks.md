# Tasks: OCR Engine + National eID Zone Map

**Milestone:** M2 (Weeks 3–4) · **Spec:** [`spec.md`](spec.md) · **Plan:** [`plan.md`](plan.md)

> **spec-kit note.** Ordered tasks derived from the spec's requirements and
> acceptance criteria. `[P]` = parallelisable (no dependency on a sibling `[P]`
> task). Each maps to a user story / AC (US#). Paths are exact.

> **Status (this branch).** Phases 1–6 implemented in `packages/core/src/ocr/`:
> 62 tests pass (1 sample-gated smoke test skipped by default), OCR module
> coverage ≥90% on statements/lines, lint + build green. **B1/B2 remain blocked
> on ≥10 real eID samples** — the zone map ships `"provisional": true` and the
> ≥80%/≥10-image accuracy metric is not yet claimable.

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

## Blocked — gated on ≥10 real eID samples (do not mark done early)

- [ ] **B1** Calibrate `SL_NATIONAL_EID.json` coordinates against ≥10 high-res
  samples; remove `"provisional": true`. (Open Question §12.2)
- [ ] **B2** Run AC #8: ≥80% NIN extraction over the ≥10-image labelled set;
  record the metric. **Blocked until B1 inputs exist.**

## Dependencies

T001–T002 → T003–T005 → T006–T009 → T010 → T011–T015 → T016–T017. B1/B2 require
≥10 real samples (external dependency) and gate the accuracy claim only.
