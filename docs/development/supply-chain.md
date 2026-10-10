# Supply-chain exposure in the release pipeline

What can reach the credentials that publish `@sierrafy/sdk`, and what to do about
it.

## The specific path

`release.yml` runs a job that holds, at once:

- `id-token: write`, the OIDC token that signs provenance
- `contents: write`, which can create releases and push
- `NODE_AUTH_TOKEN`, the npm token, on the publish step
- Four third-party actions, referenced by **mutable major tags**:
  `actions/checkout@v7`, `actions/setup-node@v7`, `actions/setup-python@v7`,
  `pnpm/action-setup@v6`

A tag is a pointer, not a fingerprint. `@v7` means "whatever the owner currently
points `v7` at", resolved fresh on every run. If an action's repository is
compromised, the attacker retags and every workflow referencing that tag runs
their code on the next build, with no change on our side and nothing to review.

The common assumption is that this is survivable because the npm token is scoped
to a single step's `env`, so only that step's process sees it. That assumption is
wrong in practice. Every step in a job shares one runner, and a step runs as a
process that can read other process memory. An action that runs before the
publish step can read the secret out of the Runner Worker process, or write to
the filesystem so that code of its choosing executes during the step that does
hold the credential.

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

**1. Pin actions to commit SHAs in `release.yml`.** This is the fix that would
have stopped CVE-2025-30066 outright, and it costs one line of churn per bump:

```yaml
- uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0
```

Pin `release.yml` first. It is the job holding the publishing credential. `ci.yml`
matters less: it has no secrets and `contents: read`, so a compromised action
there can waste a build but cannot publish anything.

Keep the SHAs current with Dependabot, which understands the `# vX.Y.Z` comment
convention and raises a PR that updates both:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

**2. Remove the npm token entirely.** Trusted publishing (OIDC) means there is no
stored credential to steal: npm accepts a publish because GitHub proved which
workflow is running. This is strictly better than pinning, because it removes the
asset rather than narrowing the path to it. See
[npm-publishing.md](npm-publishing.md), which covers the catch: the first publish
of a new package cannot use OIDC, so it needs a token once.

**3. Split the release job in two.** Run every gate (lint, PII guard, build,
tests, tarball checks) in a job with no elevated permissions, and give the
publish job only `id-token: write`, `contents: write`, and the minimum set of
actions. Fewer third-party actions share a runner with the credential.

**4. Keep `permissions` least-privilege at the top of every workflow.** Both
workflows already default to `contents: read` and elevate only where needed.
Preserve that when editing them.

## What is already in place

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
