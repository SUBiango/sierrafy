# Sierrafy feature specs

One spec per feature, written **just before** the feature is implemented. Each
spec is the contract for that unit of work: it names the behaviour, the data
shapes, the error codes, the design decisions (and why), and the acceptance
criteria that the tests must satisfy.

These are narrower and more implementation-facing than the system-wide
[architecture specification](../docs/architecture/Sierrafy_Architecture_v1.1.md);
they translate a slice of that spec (plus the
[weekly breakdown](../docs/development/Sierrafy_Phase1_Weekly_Breakdown.md)) into
something directly buildable and testable. Where a detail is unconfirmed (NIN
format, zone-map coordinates, CSCA cert), the spec says so and makes it
configurable rather than hard-coded.

## Index

| # | Feature | Spec | Milestone | Status |
|---|---|---|---|---|
| 1 | NIN format validator | [nin-format-validator.md](nin-format-validator.md) | M1 (Weeks 1–2) | In progress |

Specs for OCR, passport/MRZ, face match, fraud detection, the gateway, the
SDKs, and the NFC layer are added as each milestone begins.
