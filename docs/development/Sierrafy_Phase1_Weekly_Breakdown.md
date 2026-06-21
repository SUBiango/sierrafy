# Sierrafy Phase 1 — Weekly Development Breakdown

**Solo-developer build plan · Week 0 + 18 working weeks · maps to Architecture Spec v1.1 milestones M1–M12 (incl. NFC chip verification)**

> **Schedule caveat:** The NFC weeks (14 RN, 15 Flutter) are the single biggest timeline risk. Each allocates one week to MRZ→BAC derivation, PACE-with-BAC-fallback, secure messaging, DG1/DG2/SOD reads, and full passive-auth chain validation across a native bridge — work that commonly runs multi-week per platform. The plan assumes stock eMRTD libraries (`react-native-nfc-manager`, `flutter_nfc_kit`, the `AndyQ/NFCPassportReader` reference) work against the eID chip **unmodified**; if §12.4 resolves to a proprietary X Infotech layout, both weeks expand. Treat W14–15 as the place to absorb slip, and hold a contingency week before M11.

Each week lists the goal, concrete tasks, and **testable deliverables** (a deliverable is "done" only when the test passes). Weeks are sized for a solo developer working part-to-full time. v1.1 adds the NFC chip verifier (§4.5) as Layer 5 — the highest-confidence path available before Phase 2 — which pulls the React Native and Flutter mobile SDKs into Phase 1 and pushes the dashboard and release to M11/M12.

---

## Week 0 — Project Scaffold (pre-M1 setup)

**Goal:** Monorepo skeleton and CI running before any feature code.

Tasks:
- Initialise monorepo (`packages/core`, `gateway`, `face-engine`, `nfc-engine`, `sdk-js`, `sdk-python`, `sdk-php`, `sdk-rn`, `sdk-flutter`, `zone-maps`, `csca-certs`, `dashboard`, `docs`).
- Configure TypeScript, ESLint/Prettier, Jest, pytest.
- Set up GitHub Actions: lint + test on push.
- Add MIT `LICENSE`, CC0 notice for `zone-maps/`, `.env.example`, placeholder `csca-certs/` with README explaining the CSCA cert is pending NCRA.

**Testable deliverables:**
- `pnpm test` and `pytest` both run (even with zero tests) and exit 0 in CI.
- A pushed commit triggers the Actions workflow and it goes green.
- Repo clones and `pnpm install` succeeds on a clean machine.

---

## Weeks 1–2 — M1: NIN Format Validator (`@sierrafy/sdk` core)

**Goal:** Ship the NIN validator as the first usable artifact.

Tasks:
- Implement length, charset, prefix, year-range (2016–current), checksum, and blacklist checks.
- Drive all rules from an external JSON schema file (no hard-coded format).
- Build the `/v1/validate-nin` response shape with per-check booleans.

**Testable deliverables:**
- Unit tests: ≥10 valid NIN samples return `valid: true`; ≥10 malformed inputs (short, lowercase, bad prefix, out-of-range year) return correct `error` codes.
- Editing the JSON schema (e.g. length 14→15) changes validator behaviour **with no code change**, proven by a test.
- Blacklisted test NIN is rejected with the blacklist reason.
- Coverage on the validator module ≥90%.

---

## Weeks 3–4 — M2: OCR Engine + National eID Zone Map

**Goal:** Extract NIN, name, DOB from an eID card image.

Tasks:
- Integrate Tesseract.js v5 + Sharp pre-processing (grayscale, contrast, resize).
- Build `SL_NATIONAL_EID.json` zone map (relative coordinates). Include the **document-number and expiry-date zones** the eID chip's BAC key derivation needs in Week 14 — not just NIN/name/DOB/photo — so the eID has its own BAC inputs the way the passport does (see Week 5–6).
- Implement cross-check: exact NIN match, fuzzy name (Levenshtein ≥85%), normalised DOB.
- Build `/v1/ocr` endpoint returning `extracted` + `ocr_confidence`.
- Wire the optional Google Vision OCR engine behind `OCR_ENGINE=google-vision` + `GOOGLE_VISION_KEY` (§4.2.2, §7.2); default stays `tesseract` with zero outbound calls. This is the only egress path the Week 17–18 offline-guarantee test toggles.

**Testable deliverables:**
- On a labelled set of ≥10 eID sample images, NIN field extracted correctly in ≥80% of cases (record the metric).
- Cross-check returns `nin_matches_card: true` for matching input and `false` for a deliberately mismatched NIN.
- Fuzzy name match passes for "AMINATA KAMARA" vs "Aminata Kamara" and fails below threshold.
- DOB normaliser converts `17/04/1992` → `1992-04-17` (unit test).
- eID zone map exposes document number + expiry alongside NIN/name/DOB (unit test), confirming the eID's BAC-key inputs are available before Week 14.
- With `OCR_ENGINE=tesseract` (default) a request makes no outbound call; setting `OCR_ENGINE=google-vision` routes to the Vision path (test with the call mocked).

> **Dependency:** ≥10 high-res eID samples sourced before this week (Open Question #2).

---

## Weeks 5–6 — M3: Passport OCR + MRZ Parsing

**Goal:** Full passport support with ICAO 9303 MRZ as a high-confidence path. The MRZ extracted here also derives the BAC key consumed by the NFC layer in Week 14 — build it with that downstream use in mind.

Tasks:
- Build `SL_PASSPORT.json` zone map (bio page + MRZ lines).
- Integrate `mrz-detection` for ICAO 9303 line parsing.
- Add document auto-classification to pick the correct zone map.
- Reconcile MRZ data against zone-map OCR; prefer MRZ where present.
- Expose parsed MRZ fields (document number, DOB, expiry) in a reusable shape for BAC key derivation.

**Testable deliverables:**
- MRZ parser correctly extracts surname, given name, DOB, document number, and expiry from ≥10 sample MRZ strings.
- Auto-classifier labels eID vs passport correctly on a mixed image set (record accuracy).
- `DOCUMENT_UNSUPPORTED` returned for an out-of-scope document (e.g. driver's licence).
- Passport result exposes the three BAC-key inputs (doc number + DOB + expiry) for later NFC use (unit test).

---

## Weeks 7–8 — M4: Face Match Microservice

**Goal:** Standalone FastAPI face-match service callable over localhost.

Tasks:
- Build `services/face-engine` (FastAPI + InsightFace buffalo_l).
- Implement face detection, embedding, cosine similarity.
- Enforce threshold (default 0.82, env-configurable via `MATCH_THRESHOLD` at the face service; the gateway exposes the same knob as `FACE_THRESHOLD` per §7.2 — keep the two names mapped so the W17–18 `.env.example` is consistent). Return `FACE_UNREADABLE` on extraction failure.
- Accept a reference photo from **either** the OCR-cropped card photo **or** an NFC DG2 image, so the NFC layer can later supply a higher-quality reference.
- Guarantee memory-only processing — no disk/DB writes of images or embeddings.

**Testable deliverables:**
- `/v1/face-match` returns `match: true` for same-person pairs and `false` for different-person pairs on a labelled test set.
- Threshold change via `MATCH_THRESHOLD` env var alters pass/fail outcome (test).
- Service accepts a DG2-style reference image and returns a score (test with a sample chip photo).
- Unreadable ID photo returns `FACE_UNREADABLE` rather than crashing.
- Automated check confirms **no biometric bytes written to disk** during a request (filesystem watch test). This test is the enforcement mechanism for `DISABLE_BIOMETRIC_STORAGE` (§7.2, must always be `true`).

---

## Week 9 — M5: Fraud Signal Detection

**Goal:** Risk scoring from tampering, recapture, duplicate, and font signals.

Tasks:
- Implement ELA (digital tampering), BRISQUE (screen recapture), SHA-256 duplicate-NIN check against a rolling 24h log, expired-document check, font-anomaly variance check.
- Reserve `nfc_data_matches_ocr: false` as a high-severity signal slot to be populated by the NFC layer (Week 14).
- Wire risk weights and confidence = 100 − accumulated risk from `sierrafy.config.json`.

**Testable deliverables:**
- A Photoshopped sample raises a `digital_tampering` signal; a clean sample does not.
- Submitting the same NIN twice in a session triggers `duplicate_nin`; the hash purges after 24h (time-mocked test).
- A simulated chip-vs-OCR mismatch produces a high-severity `nfc_data_matches_ocr` signal (test with stubbed NFC input).
- Confidence score equals 100 minus the summed configured weights (deterministic unit test).

---

## Week 10 — M6: API Gateway Integration

**Goal:** Single `/v1/verify` orchestrating all layers behind auth + rate limiting, with optional NFC fields.

Tasks:
- Express gateway: validator → OCR → face-match (localhost call) → fraud → optional NFC cross-check → aggregate response.
- Accept optional `nfc_data` (dg1/dg2/sod base64) in `/v1/verify` and add the `/v1/nfc-verify` endpoint stub returning the §5.2 NFC response shape.
- Bearer API-key auth (bcrypt-hashed keys, shown once), per-key rate limiting, no payloads in logs.
- Implement the §5.3 error codes (400/422/429/500), including `NFC_CHIP_TAMPERED` and `NFC_ACCESS_DENIED`. Note `CSCA_UNAVAILABLE` is a **200** non-failure flag, not a 4xx/5xx error — wire it as a success response that carries `passive_auth_passed: null`.
- Build the **result store** the dashboard (Week 16) reads from: persist verification results (pass/fail + score + which layers ran, no biometrics) for 30 days and request metadata (timestamp, API-key hash, latency) for 90 days, per §9.2. Retention is configurable/disable-able.

**Testable deliverables:**
- End-to-end `POST /v1/verify` returns the full §5.2 response shape (incl. `nfc_chip_authentic`, `nfc_passive_auth`, `nfc_data_matches_ocr`) with `status` PASS/REVIEW/FAIL.
- A request with valid `nfc_data` is routed through the NFC cross-check path; a request without it skips NFC cleanly.
- Request without a valid key → 401; over rate limit → `RATE_LIMIT_EXCEEDED` 429.
- `CSCA_UNAVAILABLE` returns HTTP 200 (not a 4xx), with `passive_auth_passed: null` (test).
- A completed verification writes a result row queryable by the dashboard; the row contains no image/embedding/chip-biometric bytes (test). Result rows older than 30 days and metadata older than 90 days purge (time-mocked test).
- Log inspection test confirms no base64 image or chip data appears in access logs.

---

## Weeks 11–12 — M7: JS SDK + Python SDK

**Goal:** Publishable client libraries wrapping the gateway.

Tasks:
- JS SDK (TypeScript, rollup): `Sierrafy` client with `verify`, `validateNin`, `ocr`, `faceMatch`.
- Python SDK (httpx + pydantic) with matching methods and typed responses.
- Ship the **consent-logging utility** (§9.3): records a consent timestamp + consent-version string alongside each verification result. Surface it in both SDKs. Final consent wording is gated on the NATCOM legal review (dependency table, before Week 17) — build the mechanism now, leave the version string configurable.
- Write quickstart docs for each.

**Testable deliverables:**
- JS SDK integration test hits a running gateway and parses a PASS result.
- Python SDK returns `confidence_score` as an int against the same gateway.
- Consent utility records timestamp + version and attaches it to a verification call (unit test); a verify without recorded consent is flagged per the SDK contract.
- `pnpm pack` and `python -m build` produce installable artifacts; install in a fresh venv/project and import succeeds.
- README copy-paste example runs without edits.

---

## Week 13 — M8: PHP SDK

**Goal:** Composer-installable PHP client (Guzzle, PHP 8+).

Tasks:
- Implement `Sierrafy\Client::verify()` and lightweight endpoints.
- Add PHPUnit tests and a quickstart.

**Testable deliverables:**
- `composer require` from a local path repo installs the package in a fresh project.
- `verify()` returns `PASS` against a running gateway (integration test).
- PHPUnit suite passes in CI.

---

## Week 14 — M9: React Native SDK + NFC Chip Reader

**Goal:** First mobile SDK with the full NFC verification path — the v1.1 headline capability.

Tasks:
- Build `sdk-rn` (`@sierrafy/sdk-react-native`) on `react-native-nfc-manager`, referencing `AndyQ/NFCPassportReader` for the eMRTD protocol.
- Implement the §4.5.4 handshake: OCR/MRZ scan → derive BAC key → attempt PACE, fall back to BAC → open secure channel.
- Read DG1 (personal data), DG2 (biometric photo), EF.SOD, EF.COM.
- Implement passive authentication (§4.5.5): verify DSC chain to bundled NCRA CSCA root, verify data-group hashes against EF.SOD.
- Cross-check chip DG1 against OCR fields (NIN exact, name ≥95%, DOB exact) and pass DG2 to the face engine as the reference photo.
- Handle the missing-cert path: return `passive_auth_passed: null` + `CSCA_UNAVAILABLE` rather than failing.

**Testable deliverables:**
- `scanMRZ()` derives a correct BAC key from a sample MRZ (unit test against a known eMRTD test vector).
- `readChip()` returns DG1/DG2/SOD from a test chip or recorded APDU fixture; PACE-first with BAC fallback exercised by two fixtures.
- Passive auth returns `true` for a validly signed test SOD and flags `NFC_CHIP_TAMPERED` when a data-group hash is altered.
- With no CSCA cert bundled, chip data still returns and `passive_auth_passed` is `null` with `CSCA_UNAVAILABLE` (200, not a failure).
- Chip-vs-OCR mismatch surfaces `nfc_data_matches_ocr: false` as a high-severity fraud signal.
- DG2 photo drives the face match and yields a score against a matching selfie.

> **Dependency:** NCRA CSCA root certificate (Open Question #4) for *full* passive auth. The layer is built and testable without it using test vectors; production passive auth is gated on the cert. Also confirm the eID chip uses standard ICAO 9303 data-group layout vs a proprietary X Infotech structure before relying on stock eMRTD libraries.

---

## Week 15 — M10: Flutter SDK + NFC Chip Reader

**Goal:** Port the NFC path to Flutter for parity.

Tasks:
- Build `sdk-flutter` (`sierrafy_flutter`) on `flutter_nfc_kit` + `dio`.
- Reuse the shared `nfc-engine` logic: MRZ→BAC key, PACE/BAC, DG1/DG2/SOD read, passive auth, OCR cross-check.
- Match the React Native API surface (`scanMRZ`, `readChip`, `verify`).

**Testable deliverables:**
- Flutter `readChip()` returns DG1/DG2/SOD from the same recorded fixtures used in Week 14 (parity test).
- Passive auth passes on a valid test SOD and flags tampering on an altered one.
- `CSCA_UNAVAILABLE` path returns `passive_auth_passed: null` identically to the RN SDK.
- `flutter pub` resolves the package in a fresh sample app and the quickstart runs end to end.

---

## Week 16 — M11: Admin Dashboard

**Goal:** Basic React monitoring UI (logs, error rates, audit trail, key management).

Tasks:
- React + Vite + Tailwind SPA served alongside the gateway.
- Views: verification log (pass/fail + score + verification path incl. whether NFC was used, no biometrics), error-rate chart, API-key create/revoke.

**Testable deliverables:**
- Dashboard lists recent verifications from the 30-day result store and shows which layers ran (incl. NFC chip authentic/passive-auth status); no images/embeddings/chip biometrics shown or fetchable.
- Creating a key shows the plaintext once and never again (reload proves it's hidden).
- Revoked key returns 401 on next request.
- Builds via `pnpm run build` and serves on `:3001` in Docker Compose.

---

## Weeks 17–18 — M12: Public Release + Docs

**Goal:** Tagged open-source release with docs and reproducible deploy.

Tasks:
- Finalise README, Docusaurus docs site (incl. NFC mobile-SDK guides and the passive-auth/CSCA-pending caveat), `docker-compose.yml`, `.env.example` (incl. `NCRA_CSCA_CERT_PATH`, `NFC_PASSIVE_AUTH_REQUIRED`).
- Verify full offline operation (no outbound calls unless Google Vision opt-in).
- Tag `v1.0.0`, publish all five SDK packages, push docs.

**Testable deliverables:**
- Fresh-machine `git clone → docker compose up -d` brings up gateway (:3000) + dashboard (:3001) with no manual steps beyond `.env`.
- With network egress blocked, a full `/v1/verify` (OCR + face + fraud) still succeeds (offline guarantee test).
- All five SDK packages (JS, Python, PHP, React Native, Flutter) resolve from their public registries.
- Docs clearly state Phase 1 confirms structural validity, self-consistency, face match, and — with NFC — cryptographic NCRA signing, but **not** active registry status (Phase 2).
- Docs site builds and both the server and mobile quickstart walkthroughs complete end to end.

---

## Cross-cutting "definition of done" (every week)

- New code has tests; CI stays green.
- No biometric data persisted at any point — selfies, OCR photos, **and NFC DG2 chip photos** are memory-only (enforced by the disk-watch test from Week 8 onward).
- No request image or chip payloads in logs.
- Public-facing behaviour documented in `docs/`.

## Blocking external dependencies to resolve early

| Item | Needed by | Risk if late |
|---|---|---|
| Authoritative NIN format + checksum from NCRA | Week 1 | Validator ships on inferred rules |
| ≥10 high-res samples per document type | Weeks 3 / 5 | Zone-map coordinates stay estimated |
| eID chip data-group layout (ICAO 9303 vs X Infotech proprietary) | Week 14 | Stock eMRTD libraries may need rework |
| NCRA CSCA root certificate (PEM) | Week 14+ | NFC ships read-only; no full passive auth |
| NATCOM consent/retention review (lawyer) | Before Week 17 | SDK terms not finalised |
