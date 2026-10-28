# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the version is `0.x`, breaking changes can land in a minor release. The
NIN format itself is still provisional (see below), so this is not a formality.

Only `@sierrafy/sdk` is published. Every other package in the repository is a
scaffold and is marked private.

## [Unreleased]

## [0.1.1] - 2026-10-27

### Added

- **Published project policies**, in the repository root and on the docs site:
  `PRIVACY.md` (what the SDK processes, what it never stores, the single
  Google Vision egress path, and the laws the design targets, mirrored at
  [docs.sierrafy.dev/privacy](https://docs.sierrafy.dev/privacy)), `SECURITY.md`
  (private vulnerability reporting and response-time commitments),
  `RESPONSIBLE_USE.md` (exclusion, known error rates, over-trust, and the uses
  the project will not support), and `CODE_OF_CONDUCT.md` (Contributor Covenant
  2.1 with a named enforcement contact).
- **Issue templates** that require confirming no real identity data is attached,
  and route vulnerabilities to private advisories instead of public issues.

### Added

- **`cachePath` and `langPath` on the Tesseract engine**, as
  `ocr(image, { tesseract: { cachePath } })`, `createTesseractEngine({ ... })`,
  or the `TESSERACT_CACHE_PATH` and `TESSERACT_LANG_PATH` environment variables.
  Point `cachePath` at a directory holding a plain `eng.traineddata` and OCR
  runs with no network access at all, which is verified end to end against the
  real model file. An explicit option beats the environment variable, which
  beats the `tesseract.js` CDN default. Note that a local `langPath` wants
  `eng.traineddata.gz`, because `tesseract.js` appends `.gz` there; that is why
  `cachePath` is the documented route for a plain file.

### Fixed

- **Two high-severity advisories in `sharp`'s image decoders.** `sharp` is
  bumped to `^0.35.5` as both the optional peer and the dev dependency, and the
  lockfile moves from 0.35.2 to 0.35.5. The vulnerabilities are in librsvg
  (CVE-2026-96889) and libheif (GHSA-g89c-p67h-r497, GHSA-2jg2-4ch7-h545),
  which `sharp` bundles. This matters more here than the severities suggest:
  decoding an image supplied by whoever is being verified is exactly what the
  OCR engine does, so a malicious card photo was the attack path. The previous
  `^0.35.2` range already permitted a patched version, so a consumer installing
  fresh was fine; the floor now rules out the vulnerable ones for everybody.
  Raising the floor is visible to consumers: a project pinned below 0.35.5 will
  see a peer warning, and upgrading is the fix.
- **Corrected an overstated offline claim.** The docs, the README and `0.1.0`'s
  changelog entry said the default engine makes no outbound network call. It
  does make one: `tesseract.js` does not bundle `eng.traineddata`, so the first
  `ocr()` call downloads the model from the jsdelivr CDN and caches it. No
  identity data is transmitted by that request, and it is still a network call,
  and it fails on a machine with no internet, so "fully offline-capable" without
  qualification was not true of a fresh install. The wording now separates the
  unconditional claim (no identity data is transmitted on the default path) from
  the conditional one (no network call, once the model is local), and the new
  `langPath` / `cachePath` options are what make the conditional claim
  achievable. The engine's own doc comment claiming "bundled traineddata" was
  wrong too and is fixed.

### Changed

- **The architecture specification's face match engine is now model-pluggable**
  (§4.3.2), via `FACE_MODEL`, defaulting to SFace with Apache-2.0 weights.
  InsightFace `buffalo_l`, previously named as the model, licenses its weights
  for non-commercial research only and is now benchmarking-only. No shipped code
  is affected: the face layer is M4 and not yet built.
- **The specified duplicate-NIN check is now keyed** (§4.4.1): HMAC-SHA-256 with
  a per-deployment `DUPLICATE_HASH_KEY` rather than a plain SHA-256 digest, which
  for an 8-character NIN is reversible by exhaustive search. Also M5 and not yet
  built.
- The regulator is named **NatCA** (National Communications Authority)
  throughout, replacing NATCOM.
- The `0.1.0` release date below now matches the published package.

## [0.1.0] - 2026-10-22

First release. Two of the five verification layers are usable.

### Added

- **NIN format validation (M1).** `validateNin` checks length, character set, an
  optional checksum, and a blocklist, reporting each as a boolean plus the first
  failing check as an error code. Offline and structural only.
- **Schema-driven format rules.** Every rule lives in an editable JSON schema.
  `loadNinFormatSchema` validates and freezes a custom schema, so the format can
  be corrected without waiting for a release.
- **`@sierrafy/sdk/nin` subpath.** Imports the validator alone, with no OCR code
  and therefore no native dependencies. Dependency-free and isomorphic, so it
  runs in the browser and React Native.
- **Document OCR for the National eID card (M2), experimental.** `ocr` extracts
  NIN, name, and date of birth using Tesseract offline, and `crossCheck`
  compares them against user-submitted values. See the accuracy note below.
- **`SL_NATIONAL_EID` zone map**, calibrated against 10 real card samples and
  bundled with the package under CC0. It includes the document number and expiry
  zones the NFC layer will need.
- **Optional Google Vision OCR engine**, behind `OCR_ENGINE=google-vision` and
  `GOOGLE_VISION_KEY`. This is the only path in the package that transmits
  identity data and it is off by default. (This entry originally said "the only
  outbound network call in the package", which was wrong; see Unreleased.)

### Known limitations

- **Offline OCR accuracy is 20% for exact NIN extraction**, measured on 10 real
  samples against a target of 80%. The cause is understood and documented: the
  NIN is an 8-character alphanumeric with no checksum, so nothing disambiguates
  `0`/`O`, `1`/`I`, or `5`/`S`. Treat the OCR layer as experimental. The NIN
  validator is not affected.
- **The NIN format is provisional.** It was derived from real cards, not from
  NCRA documentation. If it proves wrong, override it with
  `loadNinFormatSchema` rather than waiting for a release.
- **No checksum is enforced.** Luhn is wired but disabled, and it is a
  placeholder: it runs over the NIN's decimal digits and so rejects all-letter
  NINs, a shape seen on real cards. Do not enable it.
- **No registry lookup.** Nothing here confirms that a NIN is registered or
  active. That is Phase 2, as a hand-off to NCRA's own service.

### Security and privacy

- No biometric data is persisted anywhere in this package.
- `sharp` and `tesseract.js` are optional peer dependencies loaded on first use,
  so installing the validator pulls in no native binaries.
- Published from CI with npm provenance, so the tarball can be traced to the
  commit and workflow that built it.

[Unreleased]: https://github.com/SUBiango/sierrafy/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/SUBiango/sierrafy/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/SUBiango/sierrafy/releases/tag/v0.1.0
