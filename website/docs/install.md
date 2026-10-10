---
id: install
title: Install
---

# Install

```bash
npm install @sierrafy/sdk
# or: pnpm add @sierrafy/sdk
```

Requires Node 20 or later.

## Import only what you need

The package has three entry points. Which one you import matters, because the
OCR engine needs native dependencies and the validator does not.

| Import | Contains | Native dependencies |
|---|---|---|
| `@sierrafy/sdk/nin` | The NIN validator alone | None |
| `@sierrafy/sdk/ocr` | The OCR engine alone | `sharp`, `tesseract.js` |
| `@sierrafy/sdk` | Both | Loaded only when OCR runs |

If you only validate NIN formats, import `@sierrafy/sdk/nin`. That subpath is
dependency-free and isomorphic, so it runs in the browser and in React Native as
well as on a server.

```js
import { validateNin } from '@sierrafy/sdk/nin';
```

## Optional dependencies for OCR

`sharp` and `tesseract.js` are optional peer dependencies. They are not installed
for you, because a project that only validates NIN formats should not pay for a
native image-processing binary and a WebAssembly OCR bundle.

```bash
npm install sharp tesseract.js
```

They load on the first `ocr()` call, not at import time, so importing the package
root costs nothing until you actually run OCR. Calling `ocr()` without them
throws an error naming the missing package.

## Verifying what you installed

Releases are published from CI with
[npm provenance](https://docs.npmjs.com/generating-provenance-statements), so you
can confirm a tarball was built by this repository's workflow:

```bash
npm view @sierrafy/sdk --json | jq '.dist.attestations'
```

The package page on npm shows the commit and workflow that produced the build.
Provenance attests where an artifact came from, not that its behaviour is
correct, so it complements reading the source rather than replacing it. The
published package includes `src/` for exactly that reason.
