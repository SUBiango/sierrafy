# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read CONTRIBUTING.md first

The project's durable conventions live in [`CONTRIBUTING.md`](CONTRIBUTING.md),
because human contributors need them too. Follow them exactly. They cover:

- **Architectural constraints** that are not configurable: no biometric data is
  ever persisted, Phase 1 is fully offline-capable, NFC passive auth degrades to
  `CSCA_UNAVAILABLE` rather than failing, and unconfirmed spec details stay
  schema-driven rather than hard-coded.
- **Real ID samples and PII**, including the rule that trips people up: a real NIN
  quoted in a doc or a test is as much a leak as the image it came from. Run
  `pnpm run check:pii`.
- **Landing page conventions**: CSS-variable theming across both themes, the
  mono/sans font split, the Netlify form wiring, and why the layers grid shows
  four cards rather than five.
- **Writing style**, including no em dashes in user-facing documents.
- **Messaging and positioning**: partner with NCRA, never compete. Frame the gap
  as missing developer tooling, not as NCRA being inadequate. No currency figures
  in public copy.
- **Development setup**: pnpm, and the four commands CI runs.

What follows is only the guidance specific to working here as an agent.

## State of the repository

Be precise about what exists versus what is specified, and do not describe
planned components as if they are built.

**Built and tested:** `packages/core` (`@sierrafy/sdk`) holds the M1 NIN format
validator and the M2 OCR engine with the National eID zone map. The landing page
and the OSS scaffolding are in place.

**Specified but not built:** everything else in the architecture spec, including
the API gateway, the face engine, the NFC engine, and all five language SDKs.
The other `packages/*` directories are scaffolds with placeholder exports.

`docs/architecture/Sierrafy_Architecture_v1.1.md` describes the *intended* Phase
1 system. It is a design document, not a description of existing code.

## Working here

- **Check the milestone specs before changing `packages/core`.** Each feature has
  a folder under `specs/` with its acceptance criteria. `specs/001-nin-format-validator/`
  also has a `review.md` recording the findings from an implementation review and
  how each was resolved; it is a useful map of the decisions behind the current
  shape of the validator.
- **The NIN format is provisional.** It was derived from real eID card samples,
  not from NCRA documentation. The field labelled "NIN" is 8 uppercase
  alphanumeric characters. The long `SL`-prefixed number on the card is the
  separate Personal ID Number, which the validator deliberately does not target.
  Do not "fix" the validator toward the older 14-character `SL2019XXXXXXXX`
  pattern that early drafts of the spec inferred; that was the misidentified
  field.
- **Do not enable the NIN checksum.** Luhn is wired but disabled, and it runs over
  the NIN's decimal digits, so it rejects all-letter NINs, one of the two observed
  real shapes. It is a placeholder awaiting an NCRA-confirmed algorithm. A test
  pins this behaviour.
- **Real ID samples never enter the repository, and neither do values read off
  them.** Two real NINs once reached a spec document as worked OCR examples; they
  were scrubbed and purged from git history on 2026-09-27. `pnpm run check:pii`
  now enforces this in CI. Use synthetic stand-ins and add them to
  `scripts/allowed-id-literals.txt`.

The brand domain is `sierrafy.dev` and the contact email across all files is
`hello@umarubiango.com`.
