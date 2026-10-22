---
id: nin-validation
title: NIN validation
---

# NIN validation

Checks that a string is a structurally valid Sierra Leone NIN, offline.

```js
import { validateNin } from '@sierrafy/sdk/nin';

const result = validateNin(form.nin);

if (!result.valid) {
  return reject(result.error);
}
```

## `validateNin(input, options?)`

```ts
validateNin(input: unknown, options?: { schema?: NinFormatSchema }): NinValidationResult
```

**It never throws, for any `input`.** Pass it a number, `null`, an object or a
`Symbol` and you get an invalid result rather than an exception, so you do not
need a `try` block around user input.

### The result

```js
// valid
{
  valid: true,
  nin: 'ABCD1234',
  checks: { length: true, charset: true, checksum: true, blacklist: true }
}

// invalid
{
  valid: false,
  nin: 'abcd1234',
  checks: { length: true, charset: false, checksum: true, blacklist: true },
  error: 'INVALID_CHARSET'
}
```

Every check is reported independently, so you can see everything that is wrong,
not just the first problem. `valid` is true only when all four pass.

`nin` is the input **as validated**. For non-string input it is `''`, so you
cannot use it to tell `validateNin(12345678)` from `validateNin('')`. It is also
caller-controlled text echoed back verbatim, so escape it before putting it in a
log line or an HTML page.

### Error codes

When `valid` is false, `error` is the **first** failing check in this order:

| Order | Check | Error code | Fails when |
|---|---|---|---|
| 1 | `length` | `INVALID_LENGTH` | Length is not 8, including any non-string input |
| 2 | `charset` | `INVALID_CHARSET` | Any character outside `A-Z` and `0-9`, so lowercase, spaces and punctuation all fail |
| 3 | `checksum` | `INVALID_CHECKSUM` | Only when a checksum is enabled, which it is not by default |
| 4 | `blacklist` | `BLACKLISTED` | The NIN is in your configured blocklist |

There is no normalisation. `abcd1234` and `ABCD 234` are rejected rather than
cleaned up, because silently correcting an identifier hides a bad submission
upstream. Trim and uppercase in your own form handling if you want that.

## What this is not

A valid result means the NIN is **well formed**. It does not mean the NIN exists,
is registered, or belongs to the person in front of you. Nothing in Phase 1
contacts NCRA. See [Scope](./scope.md).

## The format is provisional

The format was derived from real eID cards, not from NCRA documentation: 8
uppercase alphanumeric characters, no country prefix, no embedded year. The long
`SL`-prefixed number printed on the card is a separate **Personal ID Number**,
which this validator deliberately does not target.

If NCRA confirms something different, you do not have to wait for a release.
[Configuring the format](./configuring-the-format.md) shows how to override it.

## Checksums

There is no checksum. One of the observed real NINs is all letters and another
ends in a letter, so no obvious check digit exists, and NCRA has not confirmed an
algorithm.

A Luhn implementation is wired in and **disabled**. Do not enable it. Luhn runs
over the decimal digits extracted from the NIN, so an all-letter NIN has no
digits and fails. Enabling it would reject a shape that appears on real cards.
It is a placeholder for an algorithm that suits an alphanumeric identifier, if
one turns out to exist.
