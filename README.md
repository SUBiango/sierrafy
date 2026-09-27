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
Python, PHP, React Native, and Flutter. Fully offline-capable, and **no biometric
data is ever stored**.

See the full spec:
[`docs/architecture/Sierrafy_Architecture_v1.1.md`](docs/architecture/Sierrafy_Architecture_v1.1.md).

## Quick start

The NIN validator is the one piece you can use today.

```sh
pnpm install
pnpm run build
```

```ts
import { validateNin } from '@sierrafy/sdk/nin';

validateNin('ABCD1234');
// { valid: true, nin: 'ABCD1234',
//   checks: { length: true, charset: true, checksum: true, blacklist: true } }
```

See [`packages/core/README.md`](packages/core/README.md) for the OCR engine and
for configuring the (still provisional) NIN format.

## Contributing

Contributions are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the
development setup, the project conventions, and the constraints that are not
negotiable. The roadmap and component specs live in the architecture document.

## License

[MIT](LICENSE) © 2026 Umaru S. Biango. OCR zone maps are contributed under CC0.

## Contact

Built by Umaru S. Biango · Sierra Leone ·
[hello@umarubiango.com](mailto:hello@umarubiango.com)
