# zone-maps

OCR zone maps — JSON files defining the relative coordinates of each data field
on a supported document. Phase 1 ships `SL_NATIONAL_EID.json` (Week 3–4, M2 —
present) and `SL_PASSPORT.json` (Week 5–6, M3).

`SL_NATIONAL_EID.json` includes `document_number` and `expiry` zones beyond the
visible NIN/name/DOB/photo — these are the BAC-key inputs the NFC layer derives
in Week 14. It is flagged `"provisional": true` until its coordinates are
calibrated against ≥10 high-resolution samples (§12.2).

## Licence

Zone maps are dedicated to the public domain under **Creative Commons CC0 1.0**
(see `LICENSE`), separate from the repository's MIT licence. This encourages the
community to update layout definitions as NCRA and SL Immigration revise card
designs. Coordinates are provisional until validated against high-resolution
samples (Architecture Spec §12.2).
