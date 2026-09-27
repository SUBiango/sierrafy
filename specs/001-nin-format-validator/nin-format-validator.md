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
- **Schemas are validated, and a bad one fails at configuration time.** The
  bundled default is checked when the module loads; a caller-supplied schema is
  checked on first use. Problems throw `InvalidNinFormatSchemaError` naming the
  offending field, rather than escaping as a `SyntaxError`/`TypeError` from
  inside a check on the request path. Same convention as `loadZoneMap`: a
  malformed *asset* is a developer error and throws; end-user *input* never does.
  Unknown checksum algorithms and unanchored charsets are rejected — both would
  otherwise fail **open**.
- **`loadNinFormatSchema` is the supported override path for consumers.** Editing
  the JSON inside `node_modules` is not. It takes JSON text or a parsed object,
  validates, and freezes. It does no filesystem I/O, so the validator stays
  isomorphic for the browser and React Native SDKs.
- **Checksum is configurable and OFF by default.** No obvious check digit in the
  samples (one NIN ends in a letter), and NCRA hasn't confirmed an algorithm.
  Luhn is wired and disabled.

  > **Do not flip `checksum.enabled` until NCRA confirms an algorithm.** Luhn is
  > a *placeholder*, not a NIN checksum: it runs the mod-10 formula over the
  > NIN's extracted **decimal digits**, so an all-letter NIN — one of the two
  > observed real shapes — has no digits and fails. A test pins this so the trap
  > stays visible.
- **No input normalisation.** Lowercase, spaces, and punctuation must *fail*, so
  the input is validated as-is.
- **Personal ID Number is out of scope here** — it's a separate field; a
  dedicated validator can come later if needed.

## 4. API

```ts
validateNin(input: unknown, options?: { schema?: NinFormatSchema }): NinValidationResult
```

- `input` — the candidate NIN. **Never throws for any `input`.** Non-string input
  is treated as invalid (`INVALID_LENGTH`), and `nin` is reported as `""` — the
  result echoes the input *as validated*, so a caller cannot use it to tell
  `validateNin(12345678)` from `validateNin("")`. Document this at the gateway
  boundary (M6) rather than relying on `nin` to reflect the raw submission; also
  never interpolate `result.nin` into logs or HTML unescaped, since for string
  input it is caller-controlled text echoed verbatim.
- `options.schema` — override the bundled default (used by callers and by the
  configurability tests). Defaults to `defaultNinFormatSchema`. Validated on
  first use; a structurally broken schema throws
  `InvalidNinFormatSchemaError` (see §3). Prefer `loadNinFormatSchema` so it is
  checked up front.

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
  "version": "0.3.0-provisional",
  "length": 8,
  "charset": "^[A-Z0-9]+$", // must be anchored: ^ and $ are required
  "checksum": { "enabled": false, "algorithm": "luhn" }, // see the §3 warning
  "blacklist": []
}
```

Edits are validated at load. `length` must be a positive integer, `charset` must
be an anchored, compilable regex, `checksum.algorithm` must be one of
`CHECKSUM_ALGORITHMS`, and `blacklist` must be an array of strings — otherwise
loading throws `InvalidNinFormatSchemaError` naming the field. (The real
`description` field in the file carries the same warnings for whoever opens it.)

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
6. **Coverage** on the validator module ≥ 90% — enforced, not just measured, by
   `coverageThreshold` in `jest.config.js` (`validate-nin.ts`,
   `nin-format-schema.ts`, `luhn.ts`).
7. **No real NIN values** from the samples appear anywhere in the repository —
   code, tests, *or docs*. Enforced by `scripts/check-sample-pii.mjs`, which runs
   in CI: it rejects tracked files in a sample directory, any ground-truth value
   found in a tracked file (where the samples are available), and any NIN-shaped
   literal not on `scripts/allowed-id-literals.txt`. The last check is the one
   that works in CI, which never checks the samples out.
8. **Schema validation:** a malformed schema (uncompilable or unanchored
   `charset`, unknown `checksum.algorithm`, missing key, bad `length`) throws
   `InvalidNinFormatSchemaError` naming the field; `validateNin` still never
   throws for any `input`.
9. **Packaging:** importing `@sierrafy/sdk/nin` exposes the validator and loads
   neither `sharp` nor `tesseract.js` (unit-tested against the require cache).

## 8. Out of scope (later)

Registry/liveness lookup (Phase 2), the Personal ID Number validator, OCR
cross-check of the NIN against a card (M2), and the HTTP `/v1/validate-nin`
endpoint wiring (M6, gateway).

When M6 wires the endpoint it must decide how `InvalidNinFormatSchemaError`
surfaces. It is a startup/config error, not a request error — load the schema
once at boot with `loadNinFormatSchema` so a bad deploy fails to start, rather
than letting it reach a request handler as a 500.
