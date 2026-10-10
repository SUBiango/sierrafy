---
id: configuring-the-format
title: Configuring the format
---

# Configuring the format

The NIN format is provisional, so every rule lives in a JSON schema rather than
in code. If the bundled format turns out to be wrong, you can correct it in your
own application without waiting for a release.

## Supply your own schema

```js
import { readFileSync } from 'node:fs';
import { loadNinFormatSchema, validateNin } from '@sierrafy/sdk/nin';

const schema = loadNinFormatSchema(readFileSync('./nin-format.json', 'utf8'));

validateNin('ABCD123456', { schema });
```

`loadNinFormatSchema` takes JSON text or an already-parsed object, validates it,
and freezes it. It does no filesystem access of its own, which is what keeps the
validator usable in the browser and in React Native: you supply the bytes.

Do not edit the copy inside `node_modules`. That is not a supported
configuration path, and it will vanish on your next install.

## The schema

```json
{
  "version": "0.3.0-provisional",
  "length": 8,
  "charset": "^[A-Z0-9]+$",
  "checksum": { "enabled": false, "algorithm": "luhn" },
  "blacklist": []
}
```

| Field | Rule |
|---|---|
| `version` | Non-empty string, for your own traceability |
| `length` | Positive integer, the exact character count |
| `charset` | A regex source string that **must** be anchored with `^` and `$` |
| `checksum.enabled` | Boolean. Leave it `false`, see [NIN validation](./nin-validation.md#checksums) |
| `checksum.algorithm` | Must be one of `CHECKSUM_ALGORITHMS`, currently `luhn` only |
| `blacklist` | Array of exact NINs to reject, such as known test values |

## Bad schemas fail loudly

A malformed schema throws `InvalidNinFormatSchemaError` naming the offending
field, at the point you load it rather than deep inside a later validation call:

```js
import { loadNinFormatSchema, InvalidNinFormatSchemaError } from '@sierrafy/sdk/nin';

try {
  loadNinFormatSchema({ length: 8 });
} catch (error) {
  if (error instanceof InvalidNinFormatSchemaError) {
    console.error(error.message, error.origin);
    // Invalid NIN format schema (<object>): "version" must be a non-empty string
  }
}
```

Two rules exist specifically because breaking them fails **open**, accepting
invalid NINs rather than rejecting valid ones:

- **An unanchored `charset` is rejected.** `[A-Z0-9]+` matches a substring, so it
  would accept `abc!@#12` through the `12`. The anchors are required.
- **An unrecognised `checksum.algorithm` is rejected** rather than skipped, so a
  typo cannot silently turn the check into a pass.

Load your schema once at startup rather than per request. A schema problem is a
configuration error, and it should stop your service from starting rather than
surface as a failed request later.
