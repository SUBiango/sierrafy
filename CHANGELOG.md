# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the version is `0.x`, breaking changes can land in a minor release. The
NIN format itself is still provisional (see below), so this is not a formality.

Only `@sierrafy/sdk` is published. Every other package in the repository is a
scaffold and is marked private.

## [Unreleased]

## [0.1.0] - 2026-09-27

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
  `GOOGLE_VISION_KEY`. This is the only outbound network call in the package and
  it is off by default.

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

[Unreleased]: https://github.com/SUBiango/sierrafy/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/SUBiango/sierrafy/releases/tag/v0.1.0
