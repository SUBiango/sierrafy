# Releasing Sierrafy

This is the maintainer's runbook. Contributors do not need it; see
[CONTRIBUTING.md](CONTRIBUTING.md) for the day-to-day workflow.

## What gets published

Only **`@sierrafy/sdk`** (`packages/core`). Every other package is a scaffold
with placeholder exports, and each is blocked from publishing at its own
manifest: the JavaScript packages are `"private": true`, the Flutter package is
`publish_to: none`, and the Python packages carry the `Private :: Do Not Upload`
classifier that makes PyPI reject them. Remove the guard from a package only in
the release that makes it real.

Versions are **fixed across the monorepo**: one number for everything, bumped
together. That is simpler than independent versioning while there is one
publishable package and one maintainer. Revisit it when the SDKs ship.

While the version is `0.x`, a minor release can break the API. That is not a
formality here: the NIN format is provisional, and correcting it is a breaking
change we should be free to make quickly.

## Branches

```
feature branch  ->  PR  ->  develop  ->  release PR  ->  main  ->  tag  ->  npm
```

- `main` is what is released and what Netlify serves. Its history should read as
  a list of releases.
- `develop` accumulates merged work between releases.
- Never push directly to either. The PR is where CI runs, and a two-branch model
  that gates nothing is just bookkeeping.
- Hotfixes branch from `main`, PR into `main`, then `main` is merged back into
  `develop` so the fix is not lost.

Both branches should be protected, requiring the `Node (lint + build + test)` and
`Python (pytest)` checks, with force-pushes disallowed.

## Cutting a release

**1. Open the release PR.** From `develop` into `main`, titled `Release vX.Y.Z`.
The description is the changelog entry. This PR is the review: read the full diff
since the last tag as though someone else wrote it.

**2. Bump the version.** On the release branch, set the same version in
`package.json` and `packages/core/package.json`, and move the `Unreleased`
section of [CHANGELOG.md](CHANGELOG.md) under the new number with today's date.

**3. Check what will actually ship**, rather than trusting `files`:

```sh
pnpm install --frozen-lockfile
pnpm run lint && pnpm run check:pii && pnpm run build && pnpm run test:coverage
cd packages/core && npm pack --dry-run
```

The tarball must contain `dist/`, `src/` without tests, `LICENSE`,
`dist/schema/nin-format.json`, and `dist/zone-maps/`. The last two are easy to
lose and break the package at runtime rather than at build time, which is why
they are called out.

**4. Install the tarball somewhere clean and run it.** This is the step that
catches what the test suite cannot, because the test suite runs inside the
monorepo where the repository layout papers over packaging mistakes:

```sh
cd packages/core && npm pack
mkdir /tmp/sfy-check && cd /tmp/sfy-check && npm init -y
npm install /path/to/sierrafy-sdk-X.Y.Z.tgz

# The validator must work with no native dependencies installed at all.
node -e "const {validateNin}=require('@sierrafy/sdk/nin'); console.log(validateNin('ABCD1234'))"

# OCR must give a clear message about the optional peers, not a module-not-found.
node -e "require('@sierrafy/sdk').ocr(Buffer.from('x')).catch(e=>console.log(e.message))"

# Then install the peers and confirm OCR runs.
npm install sharp tesseract.js
```

This check has already caught one release-blocking bug: `loadZoneMap` resolved
the zone maps by walking up to the repository root, which lands in
`node_modules/` for an installed package, so OCR failed for every consumer while
passing every test.

**5. Merge and tag.** Merge the release PR, then tag `main`:

```sh
git checkout main && git pull
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

The tag triggers `.github/workflows/release.yml`, which re-runs every gate,
verifies the tag matches the version in `packages/core/package.json`, publishes
to npm with provenance, and opens a GitHub Release.

**6. Merge `main` back into `develop`** so the version bump is not stranded.

## Publishing is CI-only, on purpose

`packages/core/package.json` sets `publishConfig.provenance`, so a publish from a
laptop fails. Provenance requires the OIDC token that only a GitHub Actions run
has, and it is what lets someone verify the tarball was built from this
repository at a known commit. For an identity library, that is worth the
inconvenience.

If CI is broken and a release genuinely cannot wait, `npm publish --no-provenance`
from `packages/core` works. Treat it as an incident, not a shortcut: the
published artifact is then unverifiable.

## One-time setup

- **Claim the names before publishing anything.** The `@sierrafy` scope on npm,
  `sierrafy` and `sierrafy-face-engine` on PyPI, and `sierrafy/sdk` on Packagist.
  The roadmap is public, so the names are guessable, and the fix is free only
  until someone takes them.
- **Add an `NPM_TOKEN` secret** to the repository, an automation token with
  publish rights on the `@sierrafy` scope.
- **Protect `main` and `develop`** as described above.

## If a release is wrong

Do not unpublish. It breaks anyone who already installed it, and npm blocks
re-using the version anyway.

```sh
npm deprecate @sierrafy/sdk@0.1.0 "Broken packaging, use 0.1.1"
```

Then fix forward with a patch release. If the problem is a leaked secret or
personal data, that is different: unpublish within the 72-hour window if you can,
rotate whatever leaked, and purge it from git history the way
`specs/001-nin-format-validator/review.md` section 6 records.
