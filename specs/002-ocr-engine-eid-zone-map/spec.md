# Spec: OCR Engine + National eID Zone Map

**Milestone:** M2 (Weeks 3–4) · **Package:** `@sierrafy/sdk` (`packages/core`)
**Sources:** Architecture Spec §4.2 (OCR engine), §4.2.3 (zone maps), §4.2.4
(cross-check), §5.2 (`/v1/ocr` shape), §5.3 (error codes), §7.2 (`OCR_ENGINE`),
§7.3 (offline guarantee), §12.2 (zone coords provisional); Weekly Breakdown
Weeks 3–4; **real eID card samples** (2 cards, June 2026 — held locally in
`eID samples/`, never committed).

> **spec-kit note.** This is the `specify` artifact (the *what*). The technical
> approach lives in [`plan.md`](plan.md); the ordered work in
> [`tasks.md`](tasks.md). Builds on M1
> ([`../001-nin-format-validator`](../001-nin-format-validator/nin-format-validator.md)).

## 1. Purpose

Extract the **NIN, name, and date of birth** from a photo of a Sierra Leone
**National eID card**, and cross-check those against the values a developer's end
user typed into a form — confirming the card the user holds matches the data they
submitted. This runs **fully offline** by default (Tesseract.js), with an opt-in
Google Vision path as the only outbound egress.

This milestone also lays the **zone-map groundwork the NFC layer needs in Week
14**: the eID zone map must expose the card's **document number** and **expiry
date** (the BAC-key inputs), the same way the passport MRZ will in M3.

Scope is the **National eID card only**. Passport + MRZ parsing is M3.

## 2. Scope and offline guarantee

- In: eID image → field extraction → cross-check → `/v1/ocr` response shape, as a
  **library function** in `packages/core` (no HTTP server yet — see §8).
- Default engine **Tesseract.js v5** makes **zero outbound calls**. Setting
  `OCR_ENGINE=google-vision` (+ `GOOGLE_VISION_KEY`) is the **only** path that
  leaves the host — the single egress the Week 17–18 offline-guarantee test
  toggles (§7.3).

## 3. User scenarios

1. **Happy path.** A developer submits a clear eID front image plus the NIN,
   name, and DOB their user typed. The engine returns `extracted` fields, an
   `ocr_confidence` score, and a cross-check showing `nin_matches_card: true`,
   `name_match_score ≥ 0.85`, `dob_match: true`.
2. **Mismatch.** The submitted NIN differs from the card → `nin_matches_card:
   false` (fraud-signal input for M5/M6); other fields still returned.
3. **Unreadable image.** A blurry/dark image where no zone yields usable text →
   result carries `error: "IMAGE_UNREADABLE"`.
4. **Wrong document.** A non-eID image (e.g. a passport in M2, or a driver's
   licence) → `error: "DOCUMENT_UNSUPPORTED"`.
5. **Accuracy boost.** A developer opts into Google Vision; the same call routes
   through the Vision adapter and returns the identical shape.

## 4. Design decisions

- **Zone-map-driven, not hard-coded layout.** Field positions live in an external
  JSON (`zone-maps/SL_NATIONAL_EID.json`) of **relative** coordinates (fractions
  0–1 of card width/height), mirroring M1's schema-driven approach. Editing the
  JSON re-targets extraction with no code change.
- **Library-first; HTTP deferred to M6.** Like M1's `validateNin`, M2 ships
  `ocr()` returning the exact `/v1/ocr` body. The Express endpoint, auth, and
  rate limiting are wired in M6 (gateway is still a Week-0 stub). M6 wraps the
  library; the response contract is fixed here.
- **eID zone map carries BAC inputs.** Beyond architecture §4.2.3's
  `nin/surname/given_name/dob/photo`, the map adds **`document_number`** and
  **`expiry`** zones so the eID has its own `hash(doc_number + dob + expiry)`
  inputs before Week 14 — the same property M3 gives the passport.
- **Coordinates are provisional.** Estimated from 2 cards + public photos; the map
  carries `"provisional": true` until calibrated against ≥10 high-res samples
  (§12.2). See the Blocker in [`plan.md`](plan.md).
- **No biometric persistence.** The cropped photo zone is handed to the face
  engine (M4) in memory only; nothing is written to disk (§9, enforced from M4's
  disk-watch test).

## 5. API

```ts
ocr(idImage: Buffer | Uint8Array, options?: {
  documentType?: 'auto' | 'SL_NATIONAL_EID';   // default 'auto' → eID in M2
  engine?: 'tesseract' | 'google-vision';      // default from OCR_ENGINE env, else 'tesseract'
}): Promise<OcrResult>

crossCheck(extracted: ExtractedFields, submitted: {
  nin: string; name: string; dob: string;
}): CrossCheckResult
```

### Result shape (the `/v1/ocr` contract)

```jsonc
// success
{
  "document_type": "SL_NATIONAL_EID",
  "extracted": { "nin": "ABCD1234", "name": "AMINATA KAMARA", "dob": "1992-04-17" },
  "ocr_confidence": 0.91
}

// failure — `error` present, mirroring M1's error-as-field pattern
{ "document_type": "SL_NATIONAL_EID", "extracted": null, "ocr_confidence": 0.0,
  "error": "IMAGE_UNREADABLE" }
```

```jsonc
// crossCheck result
{ "nin_format_valid": true, "nin_matches_card": true,
  "name_match_score": 0.96, "dob_match": true }
```

`crossCheck` reuses M1's `validateNin` for `nin_format_valid`. The
`document_number` and `expiry` zones are extracted into the engine's internal
result for downstream BAC use; they are **not** part of the public `/v1/ocr`
`extracted` body (which stays NIN/name/DOB per §5.2).

## 6. Cross-check rules, and error codes

| Field | Rule | Source |
|---|---|---|
| NIN | **exact** string match (also runs M1 format validation) | §4.2.4 |
| name | **Levenshtein similarity ≥ 0.85** (case-insensitive, whitespace-normalised) | §4.2.4 |
| DOB | **exact after normalisation** (`DD/MM/YYYY` → ISO `YYYY-MM-DD`) | §4.2.4 |

| Error code | HTTP (M6) | When |
|---|---|---|
| `IMAGE_UNREADABLE` | 422 | image too blurry/dark; no zone yields usable text |
| `DOCUMENT_UNSUPPORTED` | 422 | classifier can't match a supported zone map (non-eID in M2) |

`google-vision` selected without `GOOGLE_VISION_KEY` is a **configuration error**
surfaced at engine init (not an OCR result error).

## 7. Acceptance criteria (tests)

1. **Zone map exposes BAC inputs.** `SL_NATIONAL_EID.json` defines
   `document_number` and `expiry` zones alongside `nin/surname/given_name/dob/
   photo`; a loader unit test asserts all are present (confirms BAC inputs exist
   before Week 14).
2. **DOB normaliser** converts `17/04/1992` → `1992-04-17` (unit test), and
   rejects malformed dates.
3. **Cross-check — NIN.** `nin_matches_card: true` for a matching NIN, `false`
   for a deliberately mismatched one.
4. **Cross-check — name.** Passes for `"AMINATA KAMARA"` vs `"Aminata Kamara"`
   (≥0.85) and fails for a clearly different name (below threshold).
5. **Engine selection / offline.** With `OCR_ENGINE=tesseract` (default) a call
   makes **no outbound request** (asserted); with `OCR_ENGINE=google-vision` the
   call routes to the Vision path (test with the network call **mocked**).
6. **Error paths.** An unreadable fixture → `IMAGE_UNREADABLE`; an unsupported
   document → `DOCUMENT_UNSUPPORTED` (no throw).
7. **Coverage** on the OCR module ≥ 90%; **no real NIN/PII values** in committed
   code or tests (synthetic fixtures only, per M1 rule and `.gitignore`).
8. **[SAMPLE-GATED]** On a labelled set of **≥10** real eID images, NIN extracted
   correctly in **≥80%** of cases (record the metric). **Blocked** pending ≥10
   high-res samples — see [`plan.md`](plan.md) Blocker. Not "done" until sourced.

## 8. Out of scope (later)

Passport + MRZ parsing and document auto-classification across types (M3); face
crop → match (M4); fraud signals from OCR (M5); the HTTP `/v1/ocr` endpoint, auth,
and rate limiting (M6, gateway); registry/liveness lookup (Phase 2).
