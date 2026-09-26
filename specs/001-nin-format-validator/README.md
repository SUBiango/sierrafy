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
| 1 | NIN format validator | [nin-format-validator.md](nin-format-validator.md) · [review](review.md) | M1 (Weeks 1–2) | Done · reviewed; all 10 findings fixed except the git-history purge (review §6) |
| 2 | OCR engine + National eID zone map | [../002-ocr-engine-eid-zone-map/spec.md](../002-ocr-engine-eid-zone-map/spec.md) | M2 (Weeks 3–4) | Built · offline NIN accuracy 20% (see plan §4) |

From M2 onward, specs follow the github/spec-kit split — `spec.md` (the *what*),
`plan.md` (the *how*), and `tasks.md` (ordered work) — in a per-feature folder.

Specs for passport/MRZ, face match, fraud detection, the gateway, the SDKs, and
the NFC layer are added as each milestone begins.


