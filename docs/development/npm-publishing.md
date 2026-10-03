# Publishing Sierrafy to npm

How `@sierrafy/sdk` gets onto npm, and how to do the first publish.

This is the npm-specific setup, done once. [RELEASING.md](../../RELEASING.md) is
the per-release runbook; it assumes the setup here is already in place.

## The thing to understand first

There are two ways to authenticate a publish, and you will use both, in order.

**Trusted publishing (OIDC)** is the target state. GitHub proves to npm that a
specific workflow in a specific repository is running, and npm accepts the
publish. No token exists, so no token can leak, expire, or be stolen from a
compromised action.

**A granular access token** is how you bootstrap. npm cannot configure a trusted
publisher for a package that does not exist yet, and the package only comes into
existence when something publishes it. So the first publish uses a token, and
every publish after that uses OIDC.

Plan for that rather than discovering it halfway through. The sequence is:

```
claim the scope  ->  first publish with a token  ->  configure trusted publishing
                     ->  switch the workflow to OIDC  ->  revoke the token
```

## Phase 0: account setup

Do this before anything else. It is cheap now and expensive once someone else
takes the name.

**1. Create or sign in to an npm account** at [npmjs.com](https://www.npmjs.com/).
Use an address you will keep. The account owns the package namespace.

**2. Turn on two-factor authentication**, under Account Settings, before you own
anything worth taking. Choose "Authorization and Publishing", which requires 2FA
for publishing as well as for signing in. CI publishes are unaffected: tokens and
OIDC both bypass the interactive 2FA prompt by design.

**3. Claim the `@sierrafy` scope.** Create an organization named `sierrafy`, or
publish under your user scope. The organization is better: it survives a change
of maintainer and lets you add people later. Scopes are free for public packages.

The roadmap is public, so the names are guessable. Claim these at the same time,
even though nothing is ready to publish to them:

| Registry | Name | Why now |
|---|---|---|
| npm | `@sierrafy` scope | Covers every `@sierrafy/*` package |
| PyPI | `sierrafy`, `sierrafy-face-engine` | Flat namespace, no scope to protect them |
| Packagist | `sierrafy/sdk` | Claimed by submitting the repository |

**4. Confirm the package name is free:**

```sh
npm view @sierrafy/sdk
# "npm error 404" is the answer you want
```

## Phase 1: the first publish

This is the only publish that uses a token.

### Create a granular access token

On npmjs.com, Access Tokens, Generate New Token, **Granular Access Token**. Not a
classic token: granular tokens can be scoped to one package and given a short
life, classic ones cannot.

| Field | Value | Why |
|---|---|---|
| Expiration | 7 days | You need it once. Anything longer is a liability. |
| Packages and scopes | `@sierrafy/*`, Read and write | Narrowest scope that can create the package |
| Organizations | No access | The token must not manage the org |
| IP allowlist | Leave empty | GitHub runner IPs are not predictable |

Copy the token. npm shows it once.

### Decide where the first publish runs

**From CI (recommended).** Add the token as a repository secret named
`NPM_TOKEN`, under Settings, Secrets and variables, Actions. `release.yml`
already reads it. The publish then goes through every gate: lint, PII guard,
build, coverage, the tarball content check, and the consumer install test.

**From your machine.** Faster to debug, but it publishes whatever is in your
working directory, including anything uncommitted. If you do this, note that
`packages/core/package.json` sets `publishConfig.provenance`, which fails outside
CI because provenance needs an OIDC token only a workflow has. You would need
`npm publish --no-provenance`, and the published artifact would then be
unverifiable. Use CI unless CI is broken.

### Publish

```sh
git checkout main && git pull
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

The tag triggers `release.yml`. Watch it:

```sh
gh run watch "$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')"
```

### Verify the published package

Do not trust the green check. Install what a developer would install:

```sh
npm view @sierrafy/sdk           # version, files, dist-tags
npm view @sierrafy/sdk --json | jq '.dist.attestations'   # provenance present?

mkdir /tmp/verify && cd /tmp/verify && npm init -y
npm install @sierrafy/sdk
node -e "const {validateNin}=require('@sierrafy/sdk/nin'); console.log(validateNin('ABCD1234'))"
```

The validator must work with no native dependencies installed. If that fails, the
packaging is wrong, not the code.

Check the package page at `npmjs.com/package/@sierrafy/sdk` for the README, the
MIT licence, the repository link, and a "Provenance" panel showing the commit and
workflow that built it.

## Phase 2: switch to trusted publishing

Now the package exists, so npm will let you configure a trusted publisher. Do
this straight after the first publish, while it is fresh.

### Configure it on npm

Package page, Settings, Trusted Publisher, GitHub Actions:

| Field | Value |
|---|---|
| Organization or user | `SUBiango` |
| Repository | `sierrafy` |
| Workflow filename | `release.yml` |
| Environment | leave empty, unless you add a protected environment later |

The workflow filename is matched exactly, so a rename breaks publishing until you
update it here.

### Change the workflow

Three edits to `.github/workflows/release.yml`.

**1. `id-token: write` must be present.** It already is, for provenance. OIDC
publishing requires the same permission.

**2. Publish with npm, not pnpm.** This project pins `pnpm@9.15.9`, and pnpm only
handles OIDC properly from 11.1.3 onward: 11.0.7 fixed OIDC losing to a static
auth token, and 11.1.3 fixed a 404 when OIDC meets the `.npmrc` that
`actions/setup-node` writes. Rather than move the whole workspace to pnpm 11 for
one step, keep pnpm for install and build and publish with npm:

```yaml
      - name: Publish to npm
        working-directory: packages/core
        run: npm publish --access public
```

`packages/core` has no `workspace:` protocol dependencies, so npm can publish it
directly. Check that again if that ever changes.

**3. Drop the token wiring.** Remove the `env:` block carrying `NODE_AUTH_TOKEN`
and `NPM_CONFIG_PROVENANCE`. Under trusted publishing, npm generates provenance
automatically for a public package from a public repository, so the flag is
redundant.

Also drop `registry-url` from the `setup-node` step, or leave it: it writes an
`.npmrc` expecting a token, which is the source of the pnpm 404 above. With
`npm publish` it is harmless, but removing it keeps the intent clear.

### Requirements to check

| Requirement | Needed | Where |
|---|---|---|
| npm CLI | 11.5.1 or later | Ships with Node 22.14+; `npm --version` in a CI step to confirm |
| Node | 22.14.0 or later | `node-version: 22` resolves to the latest 22.x |
| Permission | `id-token: write` | Already in `release.yml` |

### Revoke the token

Once a trusted-publishing release has succeeded, delete the `NPM_TOKEN` secret
from the repository and revoke the token on npm. Leaving it is the whole risk you
just removed, still sitting there.

## Verifying it worked

A release published through OIDC should show, on the npm package page, a
provenance panel naming the repository, the commit SHA, and the workflow. Confirm
the SHA matches the tag you pushed. Provenance attests where a build came from,
not that the code is good, so this tells you the artifact came from your pipeline
and nothing else.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `402 Payment Required` | Scoped packages default to private | `--access public`, which `publishConfig` already sets |
| `404 Not Found` on publish | Scope does not exist, or the token cannot write to it | Create the `sierrafy` org; check the token's package scope |
| `403 Forbidden` under OIDC | Trusted publisher does not match | Org, repository, and workflow filename must match exactly |
| `E409 Conflict` | Version already published | npm versions are immutable. Bump and publish again. |
| Provenance step fails | Missing `id-token: write`, or a private repository | Add the permission; provenance needs a public repo |
| OIDC ignored, token used instead | pnpm older than 11.0.7 | Publish with `npm publish`, as above |
| Publish succeeds, install fails | `files` is missing a runtime asset | Run the consumer install test in RELEASING.md step 4 |

## If a release is wrong

Do not unpublish. It breaks anyone who already installed it, and npm will not let
you reuse the version anyway.

```sh
npm deprecate @sierrafy/sdk@0.1.0 "Broken packaging, use 0.1.1"
```

Then fix forward with a patch release. A leaked secret or personal data is
different: unpublish inside the 72-hour window if you can, rotate whatever
leaked, and purge it from git history the way
[`specs/001-nin-format-validator/review.md`](../../specs/001-nin-format-validator/review.md)
section 6 records.

## Why this matters more than usual here

This package is a security control. Someone will use `validateNin` to decide
whether to accept an identity document. A tampered publish that always returned
`valid: true` would silently disable that check in every downstream KYC flow, and
nothing in the consuming application would look wrong.

That is the reason for trusted publishing over a stored token, for provenance,
and for the consumer install test before each release. See
[`docs/development/supply-chain.md`](supply-chain.md) for the rest of the
hardening.

## Sources

- [npm: trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [GitHub Changelog: npm trusted publishing with OIDC is generally available](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
