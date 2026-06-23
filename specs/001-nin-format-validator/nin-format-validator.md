# Spec: NIN Format Validator

**Milestone:** M1 (Weeks 1–2) · **Package:** `@sierrafy/sdk` (`packages/core`)
**Sources:** Architecture Spec §4.1 (validator), §4.1.3 / §5.2 (response shape),
§12.1 (format provisional); Weekly Breakdown Weeks 1–2; **real eID card samples**
(2 cards, sourced June 2026 — held locally, never committed).

## 1. Purpose

Validate that a string is a structurally valid Sierra Leone NIN **offline**,
without any NCRA lookup. This is the first usable Sierrafy artifact and the
lightweight `/v1/validate-nin` path. It confirms *structural* validity only — it
does **not** confirm the NIN is active in the NCRA registry (that is Phase 2).

## 2. Format — corrected from real cards

The architecture spec inferred a 14-char `SL2019XXXXXXXX` NIN. Real eID samples
show that was wrong: that `SL...` value is the card's **Personal ID Number** (a
~19-char document number that embeds the issue date). The field literally
labelled **"NIN"** on the card is:

> **8 characters, uppercase alphanumeric (`A–Z`, `0–9`), no country prefix, no
> embedded year.** (Observed examples: one all-letters, one mixing letters and
> digits.)

Consequently the validator has **no prefix check and no year check** — those
belonged to the misidentified format. Still provisional pending NCRA: the exact
charset constraints (are digits always allowed? is `O`/`0` disambiguated?) and
whether any checksum exists.

## 3. Design decisions

- **Schema-driven, not hard-coded.** Every rule lives in an external JSON file
  (`src/schema/nin-format.json`). Editing the JSON changes behaviour with **no
  code change** — proven by tests. Essential while the format is provisional.
- **Checksum is configurable and OFF by default.** No obvious check digit in the
  samples (one NIN ends in a letter), and NCRA hasn't confirmed an algorithm.
  Luhn is wired and disabled; flip `checksum.enabled` once confirmed.
- **No input normalisation.** Lowercase, spaces, and punctuation must *fail*, so
  the input is validated as-is.
- **Personal ID Number is out of scope here** — it's a separate field; a
  dedicated validator can come later if needed.

## 4. API

```ts
validateNin(input: unknown, options?: { schema?: NinFormatSchema }): NinValidationResult
```

- `input` — the candidate NIN. Non-string input is treated as invalid
  (`INVALID_LENGTH`), never throws.
- `options.schema` — override the bundled default (used by callers and by the
  configurability tests). Defaults to `defaultNinFormatSchema`.

### Result shape

```jsonc
// valid
{ "valid": true, "nin": "ABCD1234",
  "checks": { "length": true, "charset": true, "checksum": true, "blacklist": true } }

// invalid — `error` is the first failing check by precedence
{ "valid": false, "nin": "abcd1234",
  "checks": { "length": true, "charset": false, "checksum": true, "blacklist": true },
  "error": "INVALID_CHARSET" }
```

## 5. Checks, precedence, and error codes

Each check is evaluated independently and reported as a boolean. `valid` is true
only when all are true. When invalid, `error` is the **first** failing check in
this precedence order:

| Order | Check | Error code | When it fails |
|---|---|---|---|
| 1 | `length` | `INVALID_LENGTH` | length ≠ `schema.length` (incl. non-string) |
| 2 | `charset` | `INVALID_CHARSET` | any char outside `schema.charset` (lowercase, space, symbol) |
| 3 | `checksum` | `INVALID_CHECKSUM` | only when `checksum.enabled`; fails the algorithm |
| 4 | `blacklist` | `BLACKLISTED` | NIN is in `schema.blacklist` |

When `checksum.enabled` is `false`, the `checksum` check reports `true` (skipped,
not failed).

## 6. Default schema (`src/schema/nin-format.json`)

```jsonc
{
  "version": "0.2.0-provisional",
  "length": 8,
  "charset": "^[A-Z0-9]+$",
  "checksum": { "enabled": false, "algorithm": "luhn" },
  "blacklist": []
}
```

## 7. Acceptance criteria (tests)

1. **≥10 valid** synthetic 8-char NINs → `valid: true`, no `error`.
2. **≥10 malformed** inputs return the correct `error`: short/empty/too-long
   (`INVALID_LENGTH`), lowercase / mixed-case / spaced / hyphen / symbol
   (`INVALID_CHARSET`); plus non-string → `INVALID_LENGTH` without throwing.
3. **Schema configurability:** overriding `length` (8 → 10) and `charset`
   (uppercase → lowercase) changes outcomes with no code change.
4. **Blacklist:** a format-valid NIN in `blacklist` → `error: "BLACKLISTED"`.
5. **Checksum toggle:** enabling `checksum` rejects non-Luhn digits
   (`INVALID_CHECKSUM`) and accepts Luhn-valid ones; disabled by default. Luhn
   helper unit-tested with known vectors.
6. **Coverage** on the validator module ≥ 90%.
7. **No real NIN values** from the samples appear in committed code or tests.

## 8. Out of scope (later)

Registry/liveness lookup (Phase 2), the Personal ID Number validator, OCR
cross-check of the NIN against a card (M2), and the HTTP `/v1/validate-nin`
endpoint wiring (M6, gateway).
