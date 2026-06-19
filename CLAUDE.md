# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repository currently contains **only a marketing landing page, OSS scaffolding, and an architecture spec** — the SDK described in the docs does not exist yet. Be precise about this distinction: `docs/Sierrafy_Architecture_v1.1.md` describes the *intended* Phase 1 system (Core SDK, API gateway, face/NFC engines, language SDKs), none of which has been implemented. Do not treat the spec as describing existing code.

- `index.html` — self-contained landing page (all CSS and JS inline, no build step, no dependencies)
- `docs/Sierrafy_Architecture_v1.1.md` — the authoritative technical spec for the planned product
- `README.md`, `LICENSE` (MIT), `CONTRIBUTING.md` — open-source scaffolding
- `netlify.toml` — Netlify deploy config (publishes repo root, no build step, security headers)
- `.vscode/settings.json` — Live Server configured on port 5501

This is a git repository. The brand domain is `sierrafy.dev`; the contact email across all files is `hello@umarubiango.com`.

## Running and deploying the landing page

It's a static file — open `index.html` directly, or use VS Code Live Server (port 5501 is preconfigured). No build, install, lint, or test tooling exists. Deployment is Netlify (continuous deploy from git, driven by `netlify.toml`).

### Landing page conventions

- **Theming is CSS-variable driven.** Colors are defined as custom properties under `[data-theme="dark"]` and `[data-theme="light"]` blocks. Add new colors as variables in *both* themes rather than hardcoding. Theme is toggled via the `data-theme` attribute on `<html>` and persisted to `localStorage` under the key `sfy-theme`.
- Fonts: IBM Plex Mono (`--mono`, used for technical/label text) and Inter (`--sans`, body). Keep this split — mono for code-like UI chrome, sans for prose.
- The "Notify me at launch" input is a **Netlify Form** (`name="notify"`, `data-netlify="true"`, plus a hidden `form-name` field and a `bot-field` honeypot). It submits via `fetch` to `/` (the Netlify AJAX pattern) and shows a toast — it only actually captures emails once deployed to Netlify, not via local Live Server.
- The verification layers grid shows **four** cards; NFC is folded into card 02 ("Document OCR & NFC chip") so the grid doesn't leave an orphaned fifth item wrapping. The spec still describes this as five distinct layers.

## What the project is

Sierrafy is a planned open-source NIN (National Identification Number) verification SDK for Sierra Leone — letting developers verify IDs offline without a live NCRA database connection. The architecture spec defines five verification layers (NIN format validation, document OCR, face matching, fraud detection, NFC chip passive authentication) exposed via a self-hostable REST gateway plus JS/Python/PHP/React Native/Flutter SDKs.

When implementing against the spec, note these hard constraints called out as architectural (not configurable) requirements:

- **No biometric data is ever persisted** — face images and embeddings are processed in memory and discarded after producing a match score. This is a privacy-by-design rule, not a setting.
- **Phase 1 is fully offline-capable** — no outbound network calls unless the developer explicitly opts into Google Vision OCR.
- **NFC passive authentication** depends on the NCRA CSCA root certificate, which is not yet obtained; until then NFC reads return `passive_auth_passed: null` with a `CSCA_UNAVAILABLE` flag rather than failing.

Several spec details (exact NIN format/checksum, OCR zone-map coordinates, CSCA cert) are explicitly marked as unconfirmed assumptions in section 12 — treat them as provisional and configurable rather than authoritative.

## Messaging and positioning

Sierrafy aims to **partner with NCRA, not compete with it**. When writing or editing any copy (landing page, README, spec), follow these rules consistently:

- Frame the gap as *missing developer-friendly tooling* for the wider ecosystem — not as NCRA being too expensive or inadequate. Credit NCRA with having built the national ID foundation; position Sierrafy as complementary middleware ("on NCRA's foundation, not around it") that hands off to live NCRA lookups in Phase 2.
- The relevant pricing fact is NCRA's eKYC API at **~USD 30 per NIN check** (high for early-stage/high-volume builders). The older "USD 10,000/month" framing has been removed everywhere — do not reintroduce it.
- Public landing copy carries no currency figures; that context lives in the architecture spec (§2.1, §12) only.
- Landing-page voice is punchy and developer-focused (short, plain sentences). Keep gap → solution → developer benefit, without sounding competitive.
