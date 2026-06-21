# @sierrafy/nfc-engine

Shared NFC chip logic consumed by the React Native and Flutter SDKs: MRZ→BAC
key derivation, PACE-with-BAC fallback, DG1/DG2/SOD reads, passive
authentication, and chip-vs-OCR cross-check.

**Status:** Week 0 scaffold — placeholder only. Built alongside Weeks 14–15
(M9/M10). Full passive auth is gated on the NCRA CSCA cert — see `csca-certs/`.
