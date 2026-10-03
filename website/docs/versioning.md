---
id: versioning
title: Versioning and stability
---

# Versioning and stability

## 0.x means the API can change

While the version starts with `0.`, a minor release can contain a breaking
change. That is not boilerplate here. The NIN format is provisional, and if NCRA
confirms something different we would rather correct it quickly than carry a
known-wrong format for the sake of a version number.

Pin an exact version if that matters to you:

```json
{ "dependencies": { "@sierrafy/sdk": "0.1.0" } }
```

Every change is recorded in the
[changelog](https://github.com/SUBiango/sierrafy/blob/main/CHANGELOG.md).

## What counts as stable today

| Surface | Stability |
|---|---|
| `validateNin` and its result shape | Stable. It mirrors the documented API response, so it will not churn casually. |
| Error codes | Stable. New codes may be added; existing ones will not change meaning. |
| `loadNinFormatSchema` and the schema shape | Stable, though new optional fields may appear. |
| The default format itself | **Provisional.** It will change if NCRA confirms otherwise. |
| The OCR API | Experimental. Expect changes as accuracy work continues. |

Treat the default *format* and the *API that applies it* as separate questions.
The API is settled. The 8-character uppercase alphanumeric rule is a best
reading of real cards.

## Which packages are published

Only `@sierrafy/sdk`. Every other package in the repository is a scaffold and is
blocked from publishing at its own manifest. If you find something named
`sierrafy` on PyPI or Packagist today, it is not from this project yet.

## Releases

Releases are cut from `main` and published from CI with npm provenance, so each
tarball can be traced to the commit and workflow that built it. See
[RELEASING.md](https://github.com/SUBiango/sierrafy/blob/main/RELEASING.md).
