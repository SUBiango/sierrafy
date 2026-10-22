# Publishing Sierrafy to npm

How `@sierrafy/sdk` gets onto npm, and how to do the first publish.

This is the npm-specific setup, done once. [RELEASING.md](../../RELEASING.md) is
the per-release runbook; it assumes the setup here is already in place.

**Verified against npm's docs on 2026-10-22.** npm changed its authentication
model substantially through late 2025 and 2026, and some of it is still on a
timeline. Re-check the [sources](#sources) before acting on this, and treat any
date below as something to confirm rather than assume.

## What changed, and why it shapes the order of work

Three things matter before you touch anything.

**Classic tokens are gone.** New ones stopped being issued on 5 November 2025 and
every existing one was permanently revoked on 9 December 2025. Granular access
tokens are the only kind that exists, so there is no longer a choice to make.

**Granular write tokens enforce 2FA by default and expire within 90 days.** A
token meant for CI has to have *Bypass 2FA* switched on explicitly, or the
publish will fail on an interactive prompt that nothing can answer. This is the
single most common way to get stuck here.

**Direct publishing with a granular token is being removed in January 2027.**
After that, a token can stage a release but not publish one. Trusted publishing
stops being the better option and becomes the only one, so treat the token below
as a bootstrap step with a shelf life, not a working arrangement.

## The bootstrap problem

npm will not let you configure a trusted publisher for a package that does not
exist, and the package only comes into existence when something publishes it. So
the first publish needs a token even though every publish after it does not.

```
claim the scope  ->  bootstrap publish with a short-lived token
                 ->  configure trusted publishing  ->  revoke the token
                 ->  (optional) move to staged publishing
```

This is a known gap, not something peculiar to this project. crates.io has the
same one.

## Phase 0: account setup

Do this before anything else. It is cheap now and expensive once someone else
takes the name.

**1. Create or sign in to an npm account** at [npmjs.com](https://www.npmjs.com/).
Use an address you will keep. The account owns the package namespace.

**2. Turn on two-factor authentication**, under Account Settings, before you own
anything worth taking. Choose "Authorization and Publishing". You will need a 2FA
device for staged-release approvals later, so set it up on something you will
still have in a year.

**3. Claim the `@sierrafy` scope.** Create an organization named `sierrafy`
rather than publishing under your user scope: it survives a change of maintainer
and lets you add people later. Scopes are free for public packages.

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

## Phase 1: the bootstrap publish

This is the only publish that uses a token.

### Create the token

On npmjs.com: Access Tokens, Generate New Token. Granular is the only type now.

| Field | Value | Why |
|---|---|---|
| Expiration | 7 days | You need it once. 90 days is the cap; use far less. |
| Packages and scopes | `@sierrafy/*` | A token may cover up to 50 packages or scopes |
| Permission | **Read and write (publish and stage)** | See the warning below |
| Organizations | No access | The token must not manage the org |
| Bypass 2FA | **Enabled** | Required, see below |
| IP allowlist | Leave empty | GitHub runner IPs are not predictable |

Two of those will bite you if you get them wrong:

> **Pick "publish and stage", not "stage only".** npm added a stage-only
> permission on 18 September 2026. A stage-only token refuses `npm publish`
> outright, even with 2FA bypass enabled, so the bootstrap publish would fail.
> Stage-only is a good choice later, once the package exists; it is the wrong
> one now.

> **Bypass 2FA must be on.** Write tokens enforce 2FA by default as of 5 November
> 2025. Without the bypass, the publish stalls on a prompt no CI run can answer.
>
> The bypass is deliberately narrow: since 31 July 2026 a bypass-2FA token cannot
> perform account-identity actions, change package access, add maintainers, or
> change trusted-publishing settings. That last one matters for Phase 2, which has
> to be done in the web UI rather than from CI.

Copy the token. npm shows it once.

### Decide where the bootstrap publish runs

**From CI (recommended).** Add the token as a repository secret named
`NPM_TOKEN`, under Settings, Secrets and variables, Actions. `release.yml`
already reads it. The publish then goes through every gate: lint, PII guard,
build, coverage, the tarball content check, and the consumer install test.

**From your machine.** Faster to debug, but it publishes whatever is in your
working directory, including anything uncommitted. Two further snags: `npm login`
now issues a two-hour session rather than a durable token, and
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
this straight after the bootstrap publish, for three reasons: the token is still
short-lived, direct token publishing disappears in January 2027, and a new
trusted publisher configuration has to complete a successful publish **within two
days** of being created.

### Configure it on npm

Package page, Settings, Trusted Publisher, GitHub Actions. Do this in the browser:
a bypass-2FA token is not allowed to change trusted-publishing settings.

| Field | Value |
|---|---|
| Organization or user | `SUBiango` |
| Repository | `sierrafy` |
| Workflow filename | `release.yml` |
| Environment | leave empty, unless you add a protected environment later |

The workflow filename is matched exactly, so a rename breaks publishing until you
update it here. A package can hold up to 10 trusted publisher connections, which
is how you would later add a second workflow or another CI provider.

> **Check the allowed actions.** Configurations created after 3 September 2026
> allow `npm stage publish` by default, and direct `npm publish` is opt-in. If you
> leave the default and the workflow still runs `npm publish`, the publish is
> refused. Either tick direct publishing, or move the workflow to staged
> publishing as described in Phase 3.

### Change the workflow

Four edits to `.github/workflows/release.yml`.

**1. `id-token: write` must be present.** It already is, for provenance. OIDC
publishing requires the same permission.

**2. Node 24, not 22.** Trusted publishing needs npm 11.5.1 or later, and Node 22
ships npm 10.9.9. Node 24 (LTS, "Krypton") ships npm 11.19.1 and clears it. This
repository already sets `node-version: 24` in the release job for that reason; if
you ever lower it, trusted publishing stops working with a confusing
authentication error rather than a version error.

**3. Publish with npm, not pnpm.** This project pins `pnpm@9.15.9`, and pnpm only
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

**4. Drop the token wiring.** Remove the `env:` block carrying `NODE_AUTH_TOKEN`
and `NPM_CONFIG_PROVENANCE`. Under trusted publishing, npm generates provenance
automatically for a public package from a public repository, so the flag is
redundant.

Also drop `registry-url` from the `setup-node` step, or leave it: it writes an
`.npmrc` expecting a token, which is the source of the pnpm 404 above. With
`npm publish` it is harmless, but removing it keeps the intent clear.

### Revoke the token

Once a trusted-publishing release has succeeded, delete the `NPM_TOKEN` secret
from the repository and revoke the token on npm. Leaving it is the whole risk you
just removed, still sitting there.

## Phase 3: staged publishing, worth doing here

Optional, and recommended for this project specifically.

Staged publishing, generally available since May 2026, splits publishing in two.
CI runs `npm stage publish`, which uploads the tarball to a queue instead of the
registry. Nothing is installable until a human approves it with a 2FA challenge,
from the CLI or npmjs.com. Staging itself needs no 2FA, which is what lets CI do
it.

```sh
npm stage list            # versions awaiting approval
npm stage view <stage-id> # inspect the tarball before approving
npm stage approve <id>    # promotes it, prompts for 2FA
npm stage reject <id>     # discards it
```

[supply-chain.md](supply-chain.md) argues that provenance attests *where* an
artifact was built, not that the build was clean: a compromised action that edits
`dist/` before the publish step gets its tampering signed. Staged publishing is
the direct answer to that. It puts a person holding a 2FA device between a
compromised pipeline and the registry, which is the gap provenance alone leaves
open. For a package whose whole job is deciding whether to accept an identity
document, that is worth one manual step per release.

Pairing it with a stage-only trusted publisher means the pipeline has no way to
publish directly even if it is fully compromised.

Needs npm CLI 11.15.0 or later, so Node 24 covers it. Changing the workflow is a
one-line edit from `npm publish` to `npm stage publish`, plus a note in
RELEASING.md that a release is not done until it is approved.

## Requirements

| Requirement | Needed for | Minimum |
|---|---|---|
| npm CLI | Trusted publishing | 11.5.1 |
| npm CLI | Staged publishing (`npm stage`) | 11.15.0 |
| Node | Trusted publishing | 22.14.0, but see below |
| Permission | OIDC and provenance | `id-token: write` |

The Node minimum is misleading on its own. Node 22 satisfies it and still ships
npm 10.9.9, which is too old for either feature. Use Node 24.

## Dates to keep an eye on

| When | What |
|---|---|
| 5 Nov 2025 | Classic tokens no longer issued; granular write tokens enforce 2FA and cap at 90 days |
| 9 Dec 2025 | All classic tokens permanently revoked; `npm login` issues 2-hour sessions |
| May 2026 | Staged publishing generally available |
| 31 Jul 2026 | Bypass-2FA tokens barred from account-identity actions and trusted-publishing changes |
| 3 Sep 2026 | New trusted publisher configs default to allowing `npm stage publish`; direct publish opt-in |
| 18 Sep 2026 | "Read and write (stage only)" token permission added |
| **Jan 2027** | **Direct publishing with a granular token removed** |

That last row is the deadline that matters. If the move to trusted publishing
slips past it, the bootstrap path in Phase 1 stops working and a new package has
to be staged and approved by hand instead.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Publish hangs or fails asking for an OTP | Write token without Bypass 2FA | Recreate the token with the bypass enabled |
| `403` on `npm publish` with a valid token | Token is "stage only" | Use "publish and stage", or run `npm stage publish` |
| `403` under OIDC, token removed | Trusted publisher mismatch, or direct publish not in allowed actions | Org, repository and workflow filename must match exactly; check allowed actions |
| OIDC ignored, npm asks for auth | npm CLI older than 11.5.1 | Node 24 in the release job |
| OIDC ignored, token used instead | pnpm older than 11.0.7 | Publish with `npm publish`, as above |
| `402 Payment Required` | Scoped packages default to private | `--access public`, which `publishConfig` already sets |
| `404` on publish | Scope does not exist, or the token cannot write to it | Create the `sierrafy` org; check the token's scope list |
| `E409 Conflict` | Version already published | npm versions are immutable. Bump and publish again. |
| Provenance step fails | Missing `id-token: write`, or a private repository | Add the permission; provenance needs a public repo |
| Trusted publishing stops working for no reason | Config was created but never used within 2 days | Recreate it and publish promptly |
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
for the consumer install test before each release, and for taking Phase 3
seriously. See [supply-chain.md](supply-chain.md) for the rest of the hardening.

## Sources

Checked 2026-10-22. npm's authentication rules are still changing, so confirm
these before a release rather than trusting this page.

- [npm: about access tokens](https://docs.npmjs.com/about-access-tokens)
- [npm: trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [GitHub Changelog: staged publishing and new install-time controls](https://github.blog/changelog/2026-05-22-staged-publishing-and-new-install-time-controls-for-npm/)
- [GitHub Changelog: stage-only npm tokens](https://github.blog/changelog/2026-09-18-stage-only-npm-tokens-for-safer-automation/)
- [GitHub Discussion: revised npm security timeline](https://github.com/orgs/community/discussions/178140)
- [GitHub Discussion: classic token removal moved to December 9](https://github.com/orgs/community/discussions/179562)
