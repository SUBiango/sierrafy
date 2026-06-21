# Contributing to Sierrafy

Thanks for your interest in Sierrafy — an open-source NIN verification toolkit for Sierra Leone. Contributions of all kinds are welcome: code, documentation, ID sample data for OCR zone maps, and local domain knowledge about NCRA documents and regulations.

## Before you start

- Read the [architecture specification](docs/architecture/Sierrafy_Architecture_v1.1.md) — it defines the components, API contracts, and the non-negotiable constraints (especially **no biometric data is ever persisted** and **Phase 1 is offline-capable**).
- Check the [open questions](docs/architecture/Sierrafy_Architecture_v1.1.md#12-open-questions-and-assumptions) — several details (NIN format, zone-map coordinates, CSCA certificate) are still unconfirmed. If you have authoritative information, that's a valuable contribution on its own.

## How to contribute

1. **Open an issue first** for anything non-trivial, so we can agree on the approach before code is written.
2. Fork the repository and create a feature branch (`git checkout -b feature/short-description`).
3. Keep pull requests focused — one logical change per PR.
4. Reference the related issue in your PR description.

## Project conventions

- **Landing page:** all styling is driven by CSS custom properties defined for both `[data-theme="dark"]` and `[data-theme="light"]`. Add new colors as variables in *both* themes; don't hardcode. Use IBM Plex Mono for technical/label text and Inter for prose.
- **Licensing:** all code contributions are accepted under the [MIT License](LICENSE). OCR zone maps are contributed under CC0.

## Governance

Sierrafy is currently maintainer-led (solo developer). As contributors join, a Technical Steering Committee will be proposed. See section 11 of the architecture document for the governance model.

## Contact

Questions: [hello@umarubiango.com](mailto:hello@umarubiango.com)
