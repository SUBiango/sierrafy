# zone-maps

OCR zone maps: JSON files defining the relative coordinates of each data field
on a supported document. Phase 1 ships `SL_NATIONAL_EID.json` (Week 3–4, M2,
present) and `SL_PASSPORT.json` (Week 5–6, M3).

`SL_NATIONAL_EID.json` includes `document_number` and `expiry` zones beyond the
visible NIN/name/DOB/photo, because those are the BAC-key inputs the NFC layer
derives in Week 14. It also carries a per-field `type` hint
(`alnum`/`alpha`/`date`/`photo`) that drives the OCR character whitelist. Its coordinates are **calibrated** against 10
real eID front samples (June 2026), so `"provisional"` is `false`; they target a
reasonably framed, axis-aligned capture and may need card-boundary normalisation
for heavily rotated photos.

## Licence

Zone maps are dedicated to the public domain under **Creative Commons CC0 1.0**
(see `LICENSE`), separate from the repository's MIT licence. This encourages the
community to update layout definitions as NCRA and SL Immigration revise card
designs. Coordinates are provisional until validated against high-resolution
samples (Architecture Spec §12.2).
