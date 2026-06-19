# Sierrafy

**Open-source NIN verification SDK for Sierra Leone.**

Sierra Leone has 93% NIN coverage. What it doesn't have is a developer-friendly way to use it. Sierrafy is an open-source SDK that gives any developer a clean API to verify National Identification Numbers and ID documents — self-hostable, offline-capable, free to use.

> **Status: Phase 1 · in development.** This repository currently contains the project landing page and the [technical architecture specification](docs/Sierrafy_Architecture_v1.1.md). The SDK itself is not built yet — follow or watch the repo for progress.

## The problem

Sierra Leone reached 93% NIN registration coverage in 2025, and a NIN is now legally required to open a bank account, get a SIM, enrol in school, or access most services. NCRA has built the national ID foundation; what's still missing is accessible, developer-friendly tooling so the wider ecosystem — startups, fintechs, and solo developers — can integrate ID verification into their products without specialised expertise. Sierrafy fills that gap with an open, self-hostable toolkit, designed to integrate with NCRA's infrastructure as a formal partnership develops (Phase 2).

## Planned architecture (Phase 1)

Five verification layers, usable independently or together:

1. **NIN format validation** — structural + checksum checks
2. **Document OCR** — extract and cross-check data from the National eID Card and Passport
3. **Face matching** — selfie vs. ID portrait
4. **Fraud signal detection** — tampering, screen-recapture, duplicates
5. **NFC chip verification** — cryptographic passive authentication of the eID chip (mobile SDKs)

Delivered as a self-hostable REST gateway (Docker) plus SDKs for JavaScript, Python, PHP, React Native, and Flutter. Fully offline-capable; **no biometric data is ever stored**.

See the full spec: [`docs/Sierrafy_Architecture_v1.1.md`](docs/Sierrafy_Architecture_v1.1.md).

## The landing page

The page is a single self-contained `index.html` (inline CSS/JS, no build step). To preview locally, open the file in a browser or use the VS Code Live Server extension (port 5501 is preconfigured in `.vscode/settings.json`).

Deployment instructions for Netlify are in [`docs/SETUP.md`](docs/SETUP.md).

## Contributing

Contributions are welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md). The roadmap and component specs live in the architecture document.

## License

[MIT](LICENSE) © 2026 Umaru Biango. OCR zone maps will be contributed under CC0.

## Contact

Built by Umaru · Sierra Leone — [hello@umarubiango.com](mailto:hello@umarubiango.com)
