---
id: intro
title: Sierrafy
sidebar_label: Introduction
slug: /
---

# Sierrafy

An open-source SDK for checking Sierra Leonean identity documents. It runs
offline, stores nothing, and is free to self-host.

NCRA built Sierra Leone's national identity infrastructure. Sierrafy is the
developer layer above it: a clean API so any developer can use that foundation
without specialised expertise.

## What works today

| Layer | Status |
|---|---|
| NIN format validation | Shipped in `v0.1.0` |
| Document OCR for the National eID | Experimental, see [OCR](./ocr.md) |
| Face matching | In development |
| Fraud signals | In development |
| NFC chip reading | In development |
| Live registry lookup | Phase 2, needs an NCRA partnership |

## What it does not do

Sierrafy checks whether an identity document is **structurally** valid. It does
not query the NCRA database, so it cannot tell you a NIN is registered or
active. That is Phase 2, as a hand-off to NCRA's own service.

NCRA remains the authority. Sierrafy is the developer layer that sits above it.
[Read the full scope](./scope.md) before building on it.

## Start here

```bash
npm install @sierrafy/sdk
```

```js
import { validateNin } from '@sierrafy/sdk/nin';

validateNin('ABCD1234');
// { valid: true, nin: 'ABCD1234',
//   checks: { length: true, charset: true, checksum: true, blacklist: true } }
```

[Install](./install.md) covers the optional dependencies, and
[NIN validation](./nin-validation.md) covers the full API.
