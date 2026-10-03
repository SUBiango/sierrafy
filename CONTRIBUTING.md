# Contributing to Sierrafy

Thanks for your interest in Sierrafy, an open-source identity verification
toolkit for Sierra Leone. Contributions of all kinds are welcome: code,
documentation, ID sample data for OCR zone maps, and local domain knowledge
about NCRA documents and regulations.

## Before you start

- Read the [architecture specification](docs/architecture/Sierrafy_Architecture_v1.1.md).
  It defines the components, the API contracts, and the non-negotiable
  constraints listed under [Architectural constraints](#architectural-constraints).
- Check the [open questions](docs/architecture/Sierrafy_Architecture_v1.1.md#12-open-questions-and-assumptions).
  Several details (NIN format, zone-map coordinates, CSCA certificate) are still
  unconfirmed. If you have authoritative information, that is a valuable
  contribution on its own.

## What is in the repository

| Path | What it holds |
|---|---|
| `packages/core` | `@sierrafy/sdk`: the NIN format validator (M1) and the OCR engine plus eID zone map (M2). The only packages with working code so far. |
| `packages/*` | Scaffolds for the gateway, face engine, NFC engine, and the JS, Python, PHP, React Native, and Flutter SDKs. Built in later milestones. |
| `docs/architecture` | The authoritative technical spec for the planned system. |
| `docs/development` | The Phase 1 weekly breakdown and milestone plan. |
| `specs/` | One folder per feature, written just before that feature is built. |
| `zone-maps/` | OCR zone maps (CC0, separate from the repository's MIT licence). |
| `csca-certs/` | Where the NCRA CSCA root certificate will live once obtained. |
| `site/` | The landing page. Netlify publishes this directory and nothing else. |

The architecture spec describes the *intended* Phase 1 system. Most of it is not
built yet. Be precise about that distinction when writing docs or issues: do not
describe planned components as if they exist.

## Development setup

This is a pnpm workspace. Use pnpm, not npm or yarn, so the lockfile stays
consistent.

```sh
pnpm install
pnpm run build         # tsc -b across every package (this is the type-check)
pnpm test              # jest
pnpm run test:coverage # jest with the coverage thresholds CI enforces
pnpm run lint          # eslint + prettier --check
pnpm run format        # prettier --write
pnpm run check:pii     # the sample-data guard described below
```

CI runs lint, the PII guard, the build, and the coverage test. Run those locally
before opening a pull request and there should be no surprises.

The landing page has no build step. Open `site/index.html` directly, or use the
VS Code Live Server extension, which is preconfigured on port 5501 with `site/`
as its root, so it serves what Netlify serves. The email capture form only
records addresses once deployed to Netlify, not under Live Server.

## Project conventions

### Architectural constraints

These are architectural decisions, not configurable settings. Do not work around
them.

- **No biometric data is ever persisted.** Face images and embeddings are
  processed in memory and discarded once a match score is produced. This is a
  privacy-by-design rule.
- **Phase 1 is fully offline-capable.** No outbound network calls, unless the
  developer explicitly opts into the Google Vision OCR engine. That engine is the
  single egress path in the whole system, and it is off by default.
- **NFC passive authentication degrades, it does not fail.** It depends on the
  NCRA CSCA root certificate, which has not been obtained. Until it is, NFC reads
  return `passive_auth_passed: null` with a `CSCA_UNAVAILABLE` flag rather than
  failing the verification.
- **Unconfirmed details stay configurable.** Section 12 of the architecture spec
  marks several assumptions as unconfirmed (the exact NIN format and checksum,
  zone-map coordinates, the CSCA certificate). Treat them as provisional: drive
  them from an editable schema or asset file rather than hard-coding them, and
  say in the doc that they are provisional.

### Real ID samples and PII

Real ID card samples are personal data. They are gitignored and must never be
committed, and neither must the values read off them.

That second half is the part people get wrong: a real NIN quoted in a design doc
or a test fixture is just as much a leak as the image it came from, and
`.gitignore` cannot catch it. Use synthetic stand-ins instead.

`pnpm run check:pii` enforces this and runs in CI. It fails the build if a
tracked file sits in a sample directory, if any value from the local ground-truth
file appears in a tracked file, or if a NIN-shaped literal appears anywhere
without being listed in `scripts/allowed-id-literals.txt`. When you add a
synthetic identifier to a test or a doc, add it to that allowlist with a short
note saying it is invented.

### Specs

From M2 onward, each feature gets a folder under `specs/` following the
github/spec-kit split: `spec.md` for the what, `plan.md` for the how, and
`tasks.md` for the ordered work. Write the spec just before building the feature,
not long in advance. Where a detail is unconfirmed, say so in the spec and make
it configurable rather than hard-coded.

### Landing page

`site/index.html` is self-contained, with all CSS and JS inline and no
dependencies beyond Google Fonts. Netlify publishes `site/` alone, so anything
the page needs must live in that directory. The design source is
`docs/mockup/`, which also carries the full handoff document.

- **Theming is driven by CSS custom properties.** Every colour is defined once
  under `:root` and redefined under `[data-theme="light"]`. Add a new colour as a
  token in *both* themes rather than hard-coding a hex value, or it will not
  follow the theme. The theme is set by the `data-theme` attribute on `<html>`,
  persisted to `localStorage` under `sfy-theme`, and applied by an inline script
  in `<head>` before first paint so there is no flash.
- **Two things deliberately do not theme.** Code surfaces (the JSON response
  panel and the code card) carry `.dark-island`, which redeclares the dark tokens
  locally so code always renders on dark. The sample ID card uses fixed
  `--card-*` tokens so it looks identical in both themes.
- **Three fonts, by role.** Bricolage Grotesque (`--font-display`) for headings,
  IBM Plex Sans (`--font-body`) for prose, JetBrains Mono (`--font-mono`) for
  eyebrows, code, endpoints and JSON. All three are OFL licensed.
- **The sample card is fictional and must stay that way.** The NIN is
  `K7M2QX4P` and the person is "Aminata Kamara". It carries no coat of arms, no
  "Republic of Sierra Leone" wording and no NCRA marks, its MRZ uses `SFY` rather
  than a real country code, and it keeps the SPECIMEN watermark and the "NOT A
  REAL DOCUMENT" label. Never substitute a real card, photo or NIN. Any new
  identifier on the page also needs an entry in
  `scripts/allowed-id-literals.txt`, or the PII guard fails the build.
- **Every layer on the page carries a build status.** The page shows the whole
  Phase 1 API, including endpoints that do not exist yet, so each row has a
  `.pill-status` saying whether it is in the SDK, experimental, or in
  development. When a milestone ships, move its pill. A page that presents
  planned work as available is the specific failure this guards against.
- **The hero animation** runs only while in view and while the tab is visible,
  and renders a static finished state under `prefers-reduced-motion`.
- **There is no email capture form.** The earlier holding page had a Netlify
  form; the launch page replaced it with the install command. If a launch list is
  wanted again, it needs the Netlify form attributes back
  (`data-netlify`, a hidden `form-name`, a `bot-field` honeypot).

### Writing style

- **No em dashes** in user-facing documents or on the landing page. Use a colon,
  a semicolon, parentheses, or a second sentence. En dashes in numeric ranges
  such as "Weeks 1-2" are fine.
- The landing page voice is punchy and developer-focused: short, plain sentences,
  moving from gap to solution to developer benefit.

### Messaging and positioning

Sierrafy aims to **partner with NCRA, not compete with it**. Apply this
consistently in the landing page, the README, the spec, and issue discussions.

- Frame the gap as *missing developer-friendly tooling* for the wider ecosystem.
  Do not frame it as NCRA being inadequate or too expensive. Credit NCRA with
  having built the national ID foundation, and position Sierrafy as complementary
  middleware that sits on that foundation rather than around it, handing off to
  live NCRA lookups in Phase 2.
- **NCRA remains the authority. Sierrafy is the developer layer above it.** Phase
  1 is offline and structural. It cannot tell anyone that a NIN is registered or
  active, and no copy should imply otherwise.
- Keep currency figures out of public-facing copy. The pricing context that
  motivates the project belongs in the architecture spec (§2.1 and §12) only. The
  older "USD 10,000 per month" framing has been removed everywhere and must not
  be reintroduced.

### Licensing

Code contributions are accepted under the [MIT License](LICENSE). OCR zone maps
are contributed under CC0, so the community can keep layout definitions current
as NCRA and SL Immigration revise card designs.

## Branches

```
feature branch  ->  PR  ->  develop  ->  release PR  ->  main
```

- `main` is what is released and what the live site serves. Treat its history as
  a list of releases.
- `develop` is where merged work accumulates between releases.
- Neither branch takes direct pushes. Open a PR, because the PR is where CI runs.
- Feature branches are named for the spec folder they implement
  (`002-ocr-engine-eid-zone-map`) or with a `chore/` or `fix/` prefix for work
  that has no spec.
- Hotfixes branch from `main`, PR into `main`, and are then merged back into
  `develop`.

Releases are cut by a `develop` into `main` PR and a tag. The full runbook is in
[RELEASING.md](RELEASING.md); contributors do not need it.

## How to contribute

1. **Open an issue first** for anything non-trivial, so we can agree on the
   approach before code is written.
2. Fork the repository and create a branch from `develop`.
3. Keep pull requests focused: one logical change per PR, targeting `develop`.
4. Reference the related issue in your PR description.
5. Make sure `pnpm run lint`, `pnpm run check:pii`, `pnpm run build`, and
   `pnpm run test:coverage` all pass.
6. Add a line to the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md) if the
   change is visible to someone using the SDK.

## Governance

Sierrafy is currently maintainer-led by a solo developer. As contributors join, a
Technical Steering Committee will be proposed. See section 11 of the architecture
document for the governance model.

## Contact

Questions: [hello@umarubiango.com](mailto:hello@umarubiango.com)
