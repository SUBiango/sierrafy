---
id: privacy
title: Privacy
---

# Privacy

**Last reviewed: 26 October 2026. Applies to `@sierrafy/sdk` 0.1.x.**

Sierrafy is a library you run, not a service you send data to. There is no
Sierrafy server, no account, and no database. The identity data you pass to the
SDK is processed inside your own process, on your own infrastructure, and then
discarded.

The repository copy of this statement is
[`PRIVACY.md`](https://github.com/SUBiango/sierrafy/blob/main/PRIVACY.md), and
it is the version of record.

## What the SDK processes

Everything below is given to the SDK by you, held in memory for the duration of
a call, and then dropped.

| Data | Where it is used | Retained |
|---|---|---|
| National Identification Number (NIN) | Format validation, OCR cross-check | No |
| Full name | OCR extraction and cross-check | No |
| Date of birth | OCR extraction and cross-check | No |
| Document number and expiry date | OCR extraction | No |
| ID card image, including the portrait | OCR, later face match and fraud signals | No |
| Selfie image | Face match (M4, not yet shipped) | No |
| Face embedding | Face match comparison (M4, not yet shipped) | No |
| NFC chip data groups DG1 and DG2 | Chip verification (M9 and M10, not yet shipped) | No |

Nothing in that table is written to disk, to a database, to a log, or to a
network socket by the SDK.

**No biometric data is ever persisted.** It is an architectural constraint, not
a setting. If you find a path that breaks it, that is a security issue: report
it through
[`SECURITY.md`](https://github.com/SUBiango/sierrafy/blob/main/SECURITY.md).

## What the SDK stores

Nothing about a person. The only file the package writes is the Tesseract
language model that `tesseract.js` downloads on first use and caches. There is
no state directory, no cache of results, and no runtime configuration file.

## No telemetry, offline by default

- **No telemetry.** No usage reporting, no error reporting, no version pings, no
  analytics, to anyone, including the maintainer. There is no code in the package
  that could.
- **The default path makes no network call.** NIN validation is pure
  computation. OCR with the default Tesseract engine runs locally once its
  language model is present.
- **Phase 1 is built to work with no internet connection**, which is both a
  deployment requirement for Sierra Leone and the thing that makes the privacy
  promise easy to verify.

## The one exception: Google Cloud Vision

Setting `OCR_ENGINE=google-vision` sends **the ID card image, including the
portrait, to Google Cloud Vision**. It is the only outbound call in the package,
and it is off unless you turn it on.

- The image leaves your infrastructure and leaves Sierra Leone, and is processed
  under Google's terms, not under this statement.
- You become the party disclosing personal data to a third-party processor
  abroad. The consent, contract, and cross-border transfer basis for that are
  yours to arrange.

Leave it off for production identity verification unless you have specifically
decided, and documented, that you can send card images to a third party outside
Sierra Leone. See [Install](./install.md) for how the engines are selected.

## What changes when the gateway ships

The self-hostable REST gateway is specified but not built. When it ships it
keeps records on your server, under your control, with these defaults:

| Data | Default retention |
|---|---|
| Card images, selfies, face embeddings | Never stored, memory only |
| NIN, as a keyed hash for the duplicate check | Rolling 24 hours, then purged |
| Verification result (pass/fail and score) | 30 days, configurable, can be disabled |
| Request metadata (timestamp, API key hash, latency) | 90 days, audit trail |

The duplicate-check hash is an **HMAC-SHA-256 keyed with a secret unique to your
deployment**. An unkeyed hash of an 8-character NIN can be brute-forced back to
the NIN, so an unkeyed hash would be the NIN. Even keyed, treat it as
**pseudonymised personal data** in your own records, and keep the key secret.

A documented JSON and CSV export endpoint ships alongside the gateway. The
non-personal data the project produces today, the NIN format schema and the zone
maps, is already open JSON in the repository.

## If you integrate Sierrafy, this part is yours

1. **Obtain informed consent before you verify anyone.** Required by the SDK
   terms. A consent-logging utility ships with the gateway.
2. **Offer a route that does not depend on automated verification.** Some people
   have no NIN, and some have a card no OCR engine can read. See
   [`RESPONSIBLE_USE.md`](https://github.com/SUBiango/sierrafy/blob/main/RESPONSIBLE_USE.md).
3. **Do not store what Sierrafy refuses to store.** If you write a card image to
   your own disk, that is your processing and your exposure.
4. **Decide about Google Vision explicitly.**
5. **Publish your own privacy notice.** This page covers the library, not your
   product.
6. **No bulk lookup, no enumeration, no surveillance.**

## Laws and standards this is designed to align with

A design statement by the maintainer, not legal advice. A Sierra
Leone-qualified review of the consent and retention language is on the roadmap.

- Constitution of Sierra Leone 1991, section 22 (privacy)
- ECOWAS Supplementary Act A/SA.1/01/10 on Personal Data Protection (2010)
- Telecommunications Act 2006, and the data protection guidance of the National
  Communications Authority (NatCA) issued under it
- Cyber Security and Crime Act 2021
- National Civil Registration Act 2016. Sierrafy holds no copy of the National
  Civil Registration Database and does not query it in Phase 1.
- The **Data Protection and Right to Access Information Act: designed for, not
  compliant with.** No data protection statute is in force in Sierra Leone.
  Cabinet approved the policy and the Act on 21 April 2026, and the bill was not
  yet enacted as of October 2026.
- GDPR principles as a design benchmark: data minimisation, purpose limitation,
  storage limitation.

## Contact

Privacy questions: [hello@umarubiango.com](mailto:hello@umarubiango.com).

If an organisation verified your identity using Sierrafy and you want to know
what they hold about you, ask that organisation. Sierrafy holds no records about
anyone, so there is nothing here to disclose, correct, or erase.

Sierrafy is an independent open-source project. It is not affiliated with,
endorsed by, or operated by NCRA.
