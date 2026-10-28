# Privacy statement

**Last reviewed: 26 October 2026. Applies to `@sierrafy/sdk` 0.1.x.**

Sierrafy is a library you run, not a service you send data to. There is no
Sierrafy server, no Sierrafy account, and no Sierrafy database. When you install
`@sierrafy/sdk`, the identity data you pass to it is processed inside your own
process, on your own infrastructure, and then discarded.

That shape is the whole privacy story, and the rest of this document is the
detail behind it.

## What the SDK processes

Given to the SDK by the integrator, held in memory for the duration of a call:

| Data | Where it is used | Retained |
|---|---|---|
| National Identification Number (NIN) | Format validation, OCR cross-check | No |
| Full name | OCR extraction and cross-check | No |
| Date of birth | OCR extraction and cross-check | No |
| Document number and expiry date | OCR extraction (zone map includes both) | No |
| ID card image, including the portrait | OCR, and in later milestones face match and fraud signals | No |
| Selfie image | Face match (M4, not yet shipped) | No |
| Face embedding derived from either image | Face match comparison (M4, not yet shipped) | No |
| NFC chip data groups DG1 and DG2 | Chip verification (M9 and M10, not yet shipped) | No |

"Retained: No" means exactly that. Nothing in the above list is written to disk,
to a database, to a log, or to a network socket by the SDK. Images and
embeddings are held in memory for the call and dropped when it returns.

**No biometric data is ever persisted.** This is an architectural constraint, not
a setting you can turn off, and it is written into the architecture
specification (§4.3.4 and §9.1) as a hard requirement. If you find a path that
breaks it, that is a security issue:
[`SECURITY.md`](SECURITY.md).

## What the SDK stores

Nothing about a person. The package writes exactly two kinds of file, neither of
which touches identity data:

- **OCR language models.** On the first OCR run `tesseract.js` downloads
  `eng.traineddata` from the jsdelivr CDN and caches it, by default in the
  process working directory. It is a language model, identical for every user of
  Tesseract anywhere, and nothing about the person being verified is sent to
  fetch it. Set `TESSERACT_CACHE_PATH` to control where it lands, and if that
  directory already holds `eng.traineddata` nothing is downloaded at all.
- **Nothing else.** There is no state directory, no cache of results, and no
  configuration written at runtime.

## No telemetry, offline by default

- **There is no telemetry.** The SDK reports no usage, no errors, no version
  pings, and no analytics to anyone, including to the maintainer. There is no
  code in the package that could.
- **No identity data is transmitted on the default path.** NIN validation is
  pure computation. OCR with the default Tesseract engine recognises locally, on
  WebAssembly, and no image, NIN or extracted field is sent anywhere.
- **One non-identity network call, once.** The Tesseract language model is not
  bundled in the package, so the first OCR run fetches `eng.traineddata` from
  the jsdelivr CDN and caches it. That request contains no personal data of any
  kind, and it is still a network call: on a machine with no internet, the first
  OCR run fails until the model is supplied locally.
- **Phase 1 is designed to work with no internet connection**, and pre-placing
  the model in `TESSERACT_CACHE_PATH` is what delivers that: with a local model,
  the whole OCR path is air-gapped.
  Connectivity is not a given in Sierra Leone, and a process that cannot reach
  the network cannot leak to it, which is also what makes this promise easy to
  verify rather than merely asserted.

## The one exception: Google Cloud Vision

There is a single path by which identity data leaves your infrastructure, and it
is off unless you turn it on.

Setting `OCR_ENGINE=google-vision` (with `GOOGLE_VISION_KEY`) sends **the ID
card image, including the portrait, to Google Cloud Vision for text
recognition.** That means:

- The image leaves your infrastructure and leaves Sierra Leone. It is processed
  on Google's servers, under Google's terms and retention practices, not under
  this policy.
- You, not Sierrafy, become the party disclosing personal data to a third-party
  processor outside the country. Whatever consent, contract, and cross-border
  transfer basis that requires is yours to put in place.
- **It is the only path in the package that transmits identity data.** The
  default, `OCR_ENGINE=tesseract`, transmits none: its one network call fetches
  a language model and can be removed entirely with a local model.

The honest recommendation: leave it off for production identity verification
unless you have specifically decided, and documented, that you can send card
images to a third party outside Sierra Leone. Tesseract is the default for this
reason, not just for licensing.

## What changes when the gateway ships

The self-hostable REST gateway (M6) is specified but not built. When it does
ship it keeps records, on **your** server, under **your** control, with these
defaults (architecture specification §9.2):

| Data | Default retention |
|---|---|
| ID card images, selfies, face embeddings | Never stored, memory only |
| NIN, keyed hash for the duplicate check | Rolling 24 hours, then purged |
| Verification result (pass/fail and score) | 30 days, configurable, can be disabled |
| Request metadata (timestamp, API key hash, latency) | 90 days, for the audit trail |

Two notes on the duplicate-check hash. It is an **HMAC-SHA-256 keyed with a
secret unique to your deployment**, not a plain hash: an unkeyed hash of an
8-character NIN can be brute-forced back to the NIN, so an unkeyed hash would be
the NIN. And it is still **pseudonymised personal data**, not anonymous data.
Treat it as personal data in your own records, keep `DUPLICATE_HASH_KEY` secret,
and do not reuse it across deployments.

A documented export endpoint ships alongside the gateway, so you can get your
own records out as JSON or CSV. The non-personal data the project produces today
(the NIN format schema and the zone maps) is already open JSON in the
repository.

## If you integrate Sierrafy, this part is yours

Sierrafy gives you the check. The relationship with the person being checked is
yours, and these obligations come with it.

1. **Obtain informed consent before you verify anyone.** This is required by the
   SDK terms (architecture specification §9.3). Tell the person what you are
   checking, why, and what happens to their document image. A consent-logging
   utility that records a consent timestamp and a consent-version string
   alongside each result ships with the gateway.
2. **Offer a route that does not depend on automated verification.** Some people
   have no NIN, and some have a card too damaged to read. See
   [`RESPONSIBLE_USE.md`](RESPONSIBLE_USE.md).
3. **Do not store what Sierrafy refuses to store.** Nothing stops you writing a
   card image to your own disk. If you do, that is your processing, your legal
   basis, and your breach exposure.
4. **Decide about Google Vision explicitly**, as described above.
5. **Publish your own privacy notice.** This document covers the library. It
   cannot cover your product.
6. **Do not use Sierrafy for bulk lookups, enumeration, or surveillance.** See
   [`RESPONSIBLE_USE.md`](RESPONSIBLE_USE.md).

## Laws and standards this is designed to align with

Sierrafy is designed to comply with, or to align with, the following. This is a
design statement by the maintainer and not legal advice, and a Sierra
Leone-qualified review of the consent and retention language is on the roadmap
(architecture specification §12.5).

- **Constitution of Sierra Leone 1991, section 22**, on protection of privacy of
  home and other property
- **ECOWAS Supplementary Act A/SA.1/01/10 on Personal Data Protection (2010)**,
  which binds Sierra Leone as a member state
- **Telecommunications Act 2006**, and the data protection guidance of the
  National Communications Authority (NatCA) issued under it
- **Cyber Security and Crime Act 2021**
- **National Civil Registration Act 2016**, which establishes NCRA and the
  National Civil Registration Database. Sierrafy holds no copy of that database
  and does not query it in Phase 1.
- **The Data Protection and Right to Access Information Act: designed for, not
  compliant with.** Sierra Leone has no data protection statute in force.
  Cabinet approved a National Data Protection Policy and the Act on 21 April
  2026, and the bill had not been enacted as of October 2026. Sierrafy is built
  to meet it, and this statement will be revised when it becomes law.
- **GDPR principles as a design benchmark**, specifically data minimisation,
  purpose limitation, and storage limitation. Sierrafy is not a GDPR-regulated
  controller, but those three principles are the yardstick the design was held
  to.

## Changes to this statement

This file is versioned in the repository, so every change is in the git history.
Material changes are noted in [`CHANGELOG.md`](CHANGELOG.md).

## Contact

Privacy questions, including questions from a person whose document an
integrator checked:
[hello@umarubiango.com](mailto:hello@umarubiango.com).

If an organisation verified your identity using Sierrafy and you want to know
what they hold about you, you need to ask that organisation. Sierrafy holds no
records about anyone, so there is nothing here to disclose, correct, or erase.

Sierrafy is an independent open-source project. It is not affiliated with,
endorsed by, or operated by NCRA.
