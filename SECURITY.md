# Security policy

Sierrafy handles identity documents, so a bug here can expose a real person's
data. Please report anything you find. You will be credited unless you ask not
to be.

## How to report

**Use GitHub's private vulnerability reporting:**
[Report a vulnerability](https://github.com/SUBiango/sierrafy/security/advisories/new).
It opens a private advisory visible only to you and the maintainer, and it is
the preferred route because the discussion, the fix, and the eventual CVE all
live in one place.

If you cannot use GitHub, email
[hello@umarubiango.com](mailto:hello@umarubiango.com) with "security" in the
subject line.

**Please do not open a public issue for a vulnerability.** Public issues are the
right place for ordinary bugs, and the wrong place for anything that could be
used against a deployment before a fix exists.

### Never attach a real identity document

This matters more here than in most projects. Do not attach a real eID card, a
passport page, a selfie, a National Identification Number, a Personal ID Number,
or a chip dump to a report, even a private one. A private advisory is still a
permanent record, and a leaked NIN cannot be unleaked.

Reproduce the issue with a synthetic value from
[`scripts/allowed-id-literals.txt`](scripts/allowed-id-literals.txt) or the
specimen card on [sierrafy.dev](https://sierrafy.dev). If a bug genuinely cannot
be shown without real data, say so in the report and we will agree a way to
share it that does not involve posting it.

## What to expect

| Stage | Commitment |
|---|---|
| Acknowledgement | Within 3 working days |
| Initial assessment, with a severity and a plan | Within 10 working days |
| Fix or documented mitigation, critical and high severity | Within 30 days of the assessment |
| Fix or documented mitigation, medium and low severity | Next scheduled release |
| Public advisory and credit | On release of the fix, or at 90 days by mutual agreement |

Sierrafy is maintained by one person today, so these are honest targets rather
than a staffed rota. If a date is going to slip you will hear it from the
maintainer rather than discovering it in silence. Governance, including how this
changes as the project gains maintainers, is in the
[architecture specification](docs/architecture/Sierrafy_Architecture_v1.1.md)
§11.3.

## What is in scope

- `@sierrafy/sdk` (`packages/core`), including the NIN validator, the OCR
  engine, and the bundled zone maps
- Every other package in this repository, once it ships
- The release pipeline: the GitHub Actions workflows, the published npm tarball,
  and its provenance attestation
- `sierrafy.dev` and `docs.sierrafy.dev`

Vulnerability classes that are especially relevant to this project:

- Anything that causes an image, a face embedding, or a biometric byte to be
  written to disk, a log, or a network socket. No biometric data is persisted,
  by design and not by configuration, so a path that breaks that is a serious
  bug regardless of how hard it is to reach.
- Anything that makes a verification result claim more than it should, for
  example a forged document scoring as genuine, or a failed check reported as
  passed.
- Anything that leaks an identifier: a NIN in an error message, a stack trace, a
  log line, or a cached file.
- Reversal of the keyed duplicate-check hash, or any other way to recover a NIN
  from stored state.
- Supply-chain weaknesses in the release path. The known exposure and the
  reasoning behind the current controls are written up in
  [`docs/development/supply-chain.md`](docs/development/supply-chain.md).

## What is out of scope

- **NCRA systems.** Sierrafy is an independent project and is not affiliated
  with NCRA. Do not test, probe, or attempt to access NCRA infrastructure or the
  national registry. Findings about NCRA systems belong with NCRA, not here.
- A well-formed NIN that was never issued returning `valid: true`. That is
  documented behaviour, not a bug: Phase 1 is structural and offline. See
  [Scope](https://docs.sierrafy.dev/scope).
- OCR misreads and face-match false results within the documented accuracy
  limits. The known numbers are in [`CHANGELOG.md`](CHANGELOG.md) and the docs.
  Report a systematic failure, not an individual misread.
- A self-hosted deployment configured against the documented guidance, for
  example one that disables a safety default. Tell us if the guidance itself is
  unsafe or unclear.

## Supported versions

While the version is `0.x`, only the latest published release gets fixes. There
are no long-term support branches yet.

| Version | Supported |
|---|---|
| 0.1.x | Yes, as the current release line |
| < 0.1 | No |

## For people deploying Sierrafy

Two things do not travel in the package and are your responsibility:

1. **Terminate TLS** at a reverse proxy for any internet-facing gateway, and
   keep inter-service traffic on localhost. Architecture specification §9.1.
2. **Set a strong, deployment-specific `DUPLICATE_HASH_KEY`** and do not share
   it between deployments. It is what keeps the duplicate-check hash from being
   reversible back to a NIN. Architecture specification §4.4.1.

What the SDK processes, what it stores, and what it never touches is in
[`PRIVACY.md`](PRIVACY.md). The obligations that come with running an identity
check on someone are in [`RESPONSIBLE_USE.md`](RESPONSIBLE_USE.md).
