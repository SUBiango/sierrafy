# Supply-chain exposure in the release pipeline

What can reach the credentials that publish `@sierrafy/sdk`, and what to do about
it.

> **State of play, October 2026.** Two of the four mitigations below are done.
> `release.yml` pins its actions to commit SHAs and there is no stored npm
> credential to steal. What remains is the single-job shape: the gates and the
> publish still share one runner. Read the history below for why each mitigation
> is worth what it is; the live inventory is in
> [What is already in place](#what-is-already-in-place).

## The specific path

`release.yml` runs a job that holds, at once:

- `id-token: write`, the OIDC token that authenticates the stage and signs
  provenance
- `contents: write`, which can create releases and push
- Three third-party actions: `actions/checkout`, `pnpm/action-setup` and
  `actions/setup-node`, each **pinned to a commit SHA** with the version in a
  trailing comment

**There is no longer an npm token in that list**, and the actions are no longer
on mutable tags. Both of those were true when this document was written, and the
reasoning for removing them is kept below because it is what makes the remaining
exposure legible.

A tag is a pointer, not a fingerprint. `@v7` means "whatever the owner currently
points `v7` at", resolved fresh on every run. If an action's repository is
compromised, the attacker retags and every workflow referencing that tag runs
their code on the next build, with no change on our side and nothing to review.
`ci.yml` is still on major tags, deliberately: it holds no credentials and
`contents: read`, so a compromised action there can waste a build and nothing
more.

A stored publish token was worse than that, because scoping it to one step does
not contain it. Every step in a job shares one runner, and a step runs as a
process that can read other process memory. An action running before the publish
step could read the secret out of the Runner Worker process, or write to the
filesystem so that code of its choosing executed during the step that did hold
the credential. That is why the token is gone rather than merely narrowed.

**What is still true even with no token.** A compromised action in the publish
job can still modify `dist/` before the publish step, and the stage it produces
will carry valid provenance for a tampered artifact. OIDC removed the stealable
credential; it did not remove the shared runner. The last line of defence is the
human approving the stage, which is why staging is not optional here.

This is not hypothetical. It is exactly what happened in
[CVE-2025-30066](https://github.com/advisories/ghsa-mrrh-fwg8-r2c3): in March
2025 an attacker compromised a maintainer's personal access token for
`tj-actions/changed-files`, retagged every version from `v1` to `v45.0.7` onto a
malicious commit, and the injected script dumped secrets **out of the Runner
Worker process memory** into the build log. Over 23,000 repositories ran it.
Repositories that pinned the action to a commit SHA were unaffected, because the
tags moved and the SHAs did not.

## Why it matters more for this project than most

Two reasons specific to Sierrafy.

**The package is a security control.** Someone will call `validateNin` to decide
whether to accept an identity document. A tampered publish that always returned
`valid: true` would silently disable that check in every downstream KYC flow,
and nothing in the consuming application would look wrong. The failure is quiet,
which is the worst kind.

**Provenance does not save us here, and may mislead.** Provenance attests that an
artifact was built *by this workflow, from this repository, at this commit*. It
says nothing about whether the build was tampered with along the way. If a
compromised action modifies `dist/` before the publish step, provenance signs the
tampered artifact and makes it look more trustworthy, not less. Provenance is
worth having, but it secures the claim about origin, not the integrity of the
build.

## What to do, in order of value

**1. Pin actions to commit SHAs in `release.yml`.** ✅ **Done.** This is the fix
that would have stopped CVE-2025-30066 outright, and it costs one line of churn
per bump:

```yaml
- uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0
```

Pin `release.yml` first. It is the job that publishes. `ci.yml` matters less: it
has no secrets and `contents: read`, so a compromised action there can waste a
build but cannot publish anything. Dependabot pins both in practice, which is
fine: it groups bumps into one weekly PR, so the extra churn is negligible.

Keep the SHAs current with Dependabot, which understands the `# vX.Y.Z` comment
convention and raises a PR that updates both. This is configured, grouped into
one weekly PR, in [`.github/dependabot.yml`](../../.github/dependabot.yml):

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

**2. Remove the npm token entirely.** Done as of v0.1.0. Trusted publishing
(OIDC) means there is no stored credential to steal: npm accepts the stage
because GitHub proved which workflow is running. This is strictly better than
pinning, because it removes the asset rather than narrowing the path to it.

The trusted publisher is configured **stage-only**, so even a fully compromised
run cannot publish directly. It can only queue a version for a human to inspect
and reject, which is the point of
[staged publishing](npm-publishing.md#staged-publishing-in-more-detail).

**3. Split the release job in two.** ⬜ **Not done, and now the largest remaining
item.** Run every gate (lint, PII guard, build, tests, tarball checks) in a job
with no elevated permissions, and give the publish job only `id-token: write`,
`contents: write`, and the minimum set of actions. Fewer third-party actions
share a runner with the thing that can publish.

This matters more now than it did when the npm token existed, not less. Removing
the token removed the asset worth stealing, so the realistic attack is no longer
exfiltration but tampering: modify `dist/` during the gates and let the publish
step sign it. A split means the job that builds the artifact and the job that
publishes it do not share a process, and the second can be kept down to
`checkout` plus `setup-node`.

**4. Keep `permissions` least-privilege at the top of every workflow.** ✅ Both
workflows declare `contents: read` at the top level and elevate only where
needed. `ci.yml` had no `permissions` block at all until October 2026, despite
this document claiming otherwise, so it inherited whatever the repository
default was. Preserve the explicit block when editing either workflow.

## What is already in place

- **No stored publish credential.** Trusted publishing (OIDC) means there is
  nothing in the repository or its secrets that could publish `@sierrafy/sdk`.
- **The trusted publisher is stage-only**, so even a fully compromised run can
  only queue a version for a human to inspect and reject.
- **`release.yml` pins every action to a commit SHA**, with the version in a
  trailing comment, and Dependabot keeps those SHAs current in one weekly PR.
- Both workflows declare explicit top-level `permissions` rather than inheriting
  the permissive default.
- `release.yml` re-runs every CI gate rather than trusting the branch build, so a
  tag cannot publish something that would have failed CI.
- The tag and the manifest version must agree, so a mistagged release fails
  instead of publishing the wrong version.
- The tarball contents are asserted, and the built package is installed into an
  empty project and exercised, before the publish step runs.
- `pnpm install --frozen-lockfile` everywhere, so a dependency cannot drift
  between the lockfile and what CI resolves.

## Sources

- [CVE-2025-30066: tj-actions/changed-files](https://github.com/advisories/ghsa-mrrh-fwg8-r2c3)
- [Wiz: GitHub Action tj-actions/changed-files supply chain attack](https://www.wiz.io/blog/github-action-tj-actions-changed-files-supply-chain-attack-cve-2025-30066)
- [npm: trusted publishing](https://docs.npmjs.com/trusted-publishers/)
