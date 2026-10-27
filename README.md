# Sierrafy

**Open-source identity verification SDK for Sierra Leone.**

Sierra Leone has built significant national identity infrastructure through NCRA.
Sierrafy is the developer tooling that sits on top of it: an open-source SDK that
gives any developer a clean API to verify National Identification Numbers and ID
documents. Self-hostable, offline-capable, free to use.

> **Status: Phase 1, in development.** Two milestones have shipped into
> `packages/core`: the NIN format validator (M1) and the document OCR engine with
> the National eID zone map (M2). Everything else in the
> [architecture specification](docs/architecture/Sierrafy_Architecture_v1.1.md)
> is designed but not yet built. Watch the repo for progress.

## The problem

Sierra Leone reached 93% NIN registration coverage in 2025, and a NIN is now
legally required to open a bank account, get a SIM, enrol in school, or access
most services. NCRA has built the national ID foundation. What is still missing
is accessible, developer-friendly tooling, so that the wider ecosystem of
startups, fintechs, and solo developers can integrate ID verification into their
products without specialised expertise. Sierrafy fills that gap with an open,
self-hostable toolkit, designed to integrate with NCRA's infrastructure as a
formal partnership develops in Phase 2.

## What Phase 1 does and does not do

Phase 1 verifies an ID **offline**. It does **not** query the NCRA database, so
it cannot confirm that a NIN is registered or active. Live NCRA lookups arrive in
Phase 2, as a hand-off to NCRA's own service.

NCRA remains the authority. Sierrafy is the developer layer that sits above it.

## Architecture (Phase 1)

Five verification layers, usable independently or together:

1. **NIN format validation:** structural and checksum checks. *Shipped (M1).*
2. **Document OCR:** extract and cross-check data from the National eID Card and
   Passport. *eID shipped (M2); passport is M3.*
3. **Face matching:** selfie against the ID portrait. *Planned (M4).*
4. **Fraud signal detection:** tampering, screen recapture, duplicates.
   *Planned (M5).*
5. **NFC chip verification:** cryptographic passive authentication of the eID
   chip, in the mobile SDKs. *Planned (M9 and M10).*

Delivered as a self-hostable REST gateway (Docker) plus SDKs for JavaScript,
Python, PHP, React Native, and Flutter. **No biometric data is ever stored**, and
no identity data is transmitted anywhere unless you opt into the Google Vision
OCR engine.

Offline-capable, with one setup step to be literal about it: the Tesseract
language model is not bundled in the package, so the first OCR run downloads
`eng.traineddata` from a CDN and caches it. That request carries no identity
data, and it does need internet. Supply the model locally, via
`TESSERACT_CACHE_PATH` or `ocr(image, { tesseract: { cachePath } })`, and OCR
runs air-gapped. See
[Staying offline](https://docs.sierrafy.dev/ocr#staying-offline).

See the full spec:
[`docs/architecture/Sierrafy_Architecture_v1.1.md`](docs/architecture/Sierrafy_Architecture_v1.1.md).

## Quick start

The NIN validator is the one piece you can use today.

```sh
npm install @sierrafy/sdk
```

```ts
import { validateNin } from '@sierrafy/sdk/nin';

validateNin('ABCD1234');
// { valid: true, nin: 'ABCD1234',
//   checks: { length: true, charset: true, checksum: true, blacklist: true } }
```

See [`packages/core/README.md`](packages/core/README.md) for the OCR engine and
for configuring the (still provisional) NIN format, or
[docs.sierrafy.dev](https://docs.sierrafy.dev) for the full documentation.

Working on Sierrafy itself rather than building with it? That setup is in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## Privacy, security and responsible use

Four short documents, and they are worth the five minutes before you integrate:

| Document | What it tells you |
|---|---|
| [`PRIVACY.md`](PRIVACY.md) | Every field the SDK touches, the fact that it stores none of them, the one opt-in path by which an image leaves your infrastructure, and the laws the design targets. Also at [docs.sierrafy.dev/privacy](https://docs.sierrafy.dev/privacy). |
| [`RESPONSIBLE_USE.md`](RESPONSIBLE_USE.md) | What a result means for the person on the other side of it: who gets excluded, the known error rates and why they are not evenly distributed, and the uses this project will not support. |
| [`SECURITY.md`](SECURITY.md) | How to report a vulnerability privately, and what happens then. |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | How contributors treat each other, and the one rule that is absolute: never post a real identity document here. |

The short version of all four: **no biometric data is ever stored**, nothing is
reported back to anyone, and a `valid: true` means well formed, not registered.

## Contributing

Contributions are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the
development setup, the project conventions, and the constraints that are not
negotiable. Participation is governed by the
[Contributor Covenant](CODE_OF_CONDUCT.md). The roadmap and component specs live
in the architecture document.

**Never commit a real ID sample, or any value read off one.** Real samples are
gitignored and `pnpm run check:pii` fails the build on a NIN-shaped literal that
is not on the synthetic allowlist. Use a synthetic stand-in.

## Ownership

Sierrafy is owned and maintained by **Umaru S. Biango**, an individual developer
based in Sierra Leone. All code in this repository is the maintainer's own work,
except for third-party dependencies used under their own open-source licences.
The OCR zone maps are derived measurements of document layouts, not copies of
card images.

It is an independent open-source project: not affiliated with, endorsed by, or
operated by NCRA, MoCTI, or any Sierra Leonean government body.

## License

[MIT](LICENSE) © 2026 Umaru S. Biango. OCR zone maps are contributed under CC0.

## Contact

Built by Umaru S. Biango · Sierra Leone ·
[hello@umarubiango.com](mailto:hello@umarubiango.com)
