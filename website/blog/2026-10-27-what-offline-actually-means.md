---
slug: what-offline-actually-means
title: "What \"offline\" actually means"
authors: [umaru]
tags: [build-log, ocr, privacy, testing]
date: 2026-10-27T17:00
---

**Build log #3 · Document OCR (M2) · Fixed in `@sierrafy/sdk@0.1.1`**

Sierrafy's docs said the default OCR engine made no outbound network calls. That was wrong. It never sent identity data anywhere, but it did make one network call, and a test that I thought proved otherwise had been passing all along.

<!-- truncate -->

## What I claimed

"Offline" is one of Sierrafy's core promises, and I wrote it in the strongest form I could:

- The OCR spec said the default engine makes **zero outbound calls**.
- The README said the only code path that touches the network is the optional Google Vision engine.
- The privacy statement said the same.

There were good reasons to promise this. Connectivity in Sierra Leone isn't something you can assume, and a process that can't reach the network can't leak data to it. That also makes the promise easy for someone else to check, instead of taking my word for it.

## What actually happens

Sierrafy reads ID cards with `tesseract.js`, which needs a trained language model, `eng.traineddata`, to recognise text. The library doesn't bundle that model. The first time OCR runs, it downloads the model from the jsdelivr CDN and caches it in the working directory.

So on a fresh install, the first `ocr()` call does this:

| | |
|---|---|
| Network requests | **1**, to cdn.jsdelivr.net |
| Download size | about **3 MB** (gzipped) |
| Identity data sent | **none**: no image, no NIN, no extracted field |
| On a machine with no internet | the first OCR run **fails** |

The privacy claim held up: no personal data ever left the machine. The offline claim didn't. Anyone deploying Sierrafy on an air-gapped machine, or on an unreliable connection, would have hit a failure the docs said couldn't happen.

## Why the test didn't catch it

There was a test for exactly this. The spec's acceptance criterion read: *with the default engine, a call makes no outbound request (asserted).* The test passed.

But look at what it actually checked. It spied on `fetch` and called `resolveEngine()`, the function that **picks** the OCR engine. Picking an engine makes no network request, so the assertion passed. It never ran a real recognition, because in the unit tests `tesseract.js` is mocked, and a mocked library doesn't download anything.

The test was honest about a smaller claim than the one I was making. A mock can't tell you anything about the network behaviour of the thing it replaces.

It came to light when I checked every claim in the DPG Registry application against the code rather than against the docs.

## What else I considered

**Bundle the model in the npm package.** This makes OCR offline out of the box, with no setup. But it adds about 4 MB to every install, including for people who only use the NIN validator, which has no dependencies at all. Sierrafy is meant to be cheap to install on slow connections.

**Download the model in a `postinstall` script.** This moves the network call from first use to install time, which doesn't remove it. Install scripts are also a common supply-chain attack route, and plenty of teams turn them off (`--ignore-scripts`). Then the model would silently never arrive.

**Point at a different download server.** This changes where the request goes, not whether there is one.

## What I decided

**Let integrators supply the model locally, and describe the two claims separately.**

The Tesseract engine now takes `cachePath` and `langPath`, as options or as the `TESSERACT_CACHE_PATH` and `TESSERACT_LANG_PATH` environment variables. Download the model once (3.9 MB from `tessdata_fast`), put it in a directory, and point Sierrafy at it:

```js
import { ocr } from '@sierrafy/sdk';

const result = await ocr(imageBuffer, {
  tesseract: { cachePath: '/opt/tessdata' }, // holds eng.traineddata
});

// or, for the whole process:
// TESSERACT_CACHE_PATH=/opt/tessdata
```

With the model in place, OCR makes no network call at all. An explicit option overrides the environment variable, and the environment variable overrides the CDN default.

The docs now make two separate promises instead of one:

- **"Transmits no identity data"** is unconditional. It's true on every default install.
- **"Makes no network call"** is true once the model is local. That's one setup step, and the docs say so.

The fix shipped in `@sierrafy/sdk@0.1.1`. I also added a dated correction note to the original spec, instead of quietly rewriting the criterion, so anyone reading it later can see what changed and why.

## What it cost

- **One setup step** for anyone who needs a truly air-gapped deployment.
- **One gotcha I had to document.** A local `langPath` expects `eng.traineddata.gz`, because `tesseract.js` adds `.gz` to the filename there. A local `cachePath` takes the plain file. That's why the docs recommend `cachePath`.
- **Rewording the claim everywhere it appeared:** the README, the privacy statement, the OCR and privacy pages on the docs site, the contributor guide and the spec.

## What's still open

The unit tests now check that the paths reach the engine, and I verified a real offline run against the actual model file by hand. There is **no CI job yet that runs real OCR with the network switched off**. That's the test that would have caught this in the first place. It's in the plan for the end-to-end checks in weeks 17–18, and until then, "offline" is checked by hand on each release.

## The takeaway

Write your guarantees as precisely as you can test them. "Offline" was really two claims, and only one of them was true. And when a test is meant to prove a guarantee, make sure it exercises the real thing, not a mock of it.

---

- [Docs: Staying offline](https://docs.sierrafy.dev/ocr#staying-offline)
- [CHANGELOG: 0.1.1](https://github.com/SUBiango/sierrafy/blob/main/CHANGELOG.md)
- [OCR spec, criterion 5 and its correction](https://github.com/SUBiango/sierrafy/blob/main/specs/002-ocr-engine-eid-zone-map/spec.md)
- [PRIVACY.md](https://github.com/SUBiango/sierrafy/blob/main/PRIVACY.md)
