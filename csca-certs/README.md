# csca-certs

Holds the **NCRA Country Signing Certificate Authority (CSCA) root certificate**
(`SL_NCRA_CSCA.pem`) used for NFC passive authentication — the cryptographic
root that proves eID chip data was signed by NCRA and is unaltered.

## Status: certificate pending NCRA

The CSCA root certificate is **not yet available**. NCRA must either publish it
to the ICAO Public Key Directory (PKD) or provide it directly; this is a Phase 2
partnership ask (Architecture Spec §4.5.5, §12.4).

Until the PEM is bundled here and pointed to via `NCRA_CSCA_CERT_PATH`
(see `.env.example`), the NFC layer still reads chip data but returns
`passive_auth_passed: null` with a `CSCA_UNAVAILABLE` flag — it does **not**
fail the verification.

Do not commit any private keys to this directory — only the public CSCA
certificate belongs here.
