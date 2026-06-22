# Sierrafy — Technical Architecture Specification
**Sierra Leone National ID Verification SDK**
Version 1.1 · Phase 1 + NFC · Draft for Development

---

| Property | Value |
|---|---|
| Project | Sierrafy — Open-Source NIN Verification SDK |
| Phase | Phase 1 — Offline-capable validation + NFC chip reading (no NCRA live DB required) |
| Document type | Technical Architecture Specification |
| Version | 1.1 — Added NFC chip verification layer |
| Classification | Public / Open Source |
| Target audience | Solo developer / open-source contributors |
| Licence | MIT (proposed) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Context and Problem Statement](#2-context-and-problem-statement)
3. [System Overview](#3-system-overview)
4. [Component Specifications](#4-component-specifications)
5. [API Reference](#5-api-reference)
6. [SDK Reference](#6-sdk-reference)
7. [Deployment Guide](#7-deployment-guide)
8. [Full Technology Stack](#8-full-technology-stack)
9. [Security and Privacy](#9-security-and-privacy)
10. [Roadmap](#10-roadmap)
11. [Contributing and Governance](#11-contributing-and-governance)
12. [Open Questions and Assumptions](#12-open-questions-and-assumptions)

---

## 1. Executive Summary

Sierrafy is an open-source identity verification toolkit purpose-built for Sierra Leone. It gives developers a clean REST API and multi-language SDKs to verify users' National Identification Numbers (NIN) and physical ID documents — without requiring a live connection to the NCRA database. This Phase 1 specification covers all components deliverable by a solo developer before a formal NCRA API partnership is established.

Phase 1 supports two document types: the **National eID Card** (the current chip-based card issued by NCRA and the primary accepted ID for all public and private services) and the **Sierra Leone Passport**. These two documents cover the overwhelming majority of real-world onboarding flows.

The toolkit performs five verification layers: NIN format validation, document OCR and cross-check, selfie-to-document face matching, basic fraud signal detection, and — for mobile apps — NFC chip reading with cryptographic passive authentication against NCRA's signing certificate. The NFC layer is the highest-confidence verification path available without a live NCRA database lookup: chip data is mathematically guaranteed to be original government-issued data, not OCR'd from a printed surface that could be tampered with.

> **Phase 1 guarantee:** Sierrafy Phase 1 confirms that a NIN is structurally valid, that a scanned ID card is self-consistent, and that the person presenting the ID matches the card photo. The optional NFC layer additionally confirms that the chip data was cryptographically signed by NCRA and has not been altered. Neither layer confirms that the NIN is active in the NCRA database — that requires Phase 2 live lookup.

---

## 2. Context and Problem Statement

### 2.1 The gap in the market

Sierra Leone reached 93% NIN registration coverage as of June 2025, and NCRA has built the national ID foundation the country now runs on. The NIN is legally mandatory for opening a bank account, enrolling in education, accessing employment, and registering a SIM card. What is still missing is accessible, developer-friendly tooling that lets the wider ecosystem — startups, fintechs, NGOs, and government agencies building digital products — adopt NIN verification without specialised identity expertise.

Today, integrating verification at the individual-check level remains out of reach for most small builders: NCRA's eKYC API is priced at around USD 30 per NIN check, which adds up quickly for high-volume onboarding flows and is hard to justify for early-stage products still finding traction. International providers (Smile ID, uqudo, Dojah) either do not cover Sierra Leone's NIN database or are oriented toward enterprise clients. The result is that many Sierra Leonean apps skip identity verification entirely — increasing fraud exposure, weakening KYC, and slowing trusted digital adoption.

### 2.2 What Sierrafy solves

Sierrafy is the missing middleware layer that complements NCRA's infrastructure: a thin, open-source, self-hostable API gateway and SDK collection that local developers can integrate in minutes. It lets developers run the high-confidence, offline checks (NIN format, document OCR, face match, NFC chip authentication) locally and at no per-check cost, reserving live NCRA database lookups for when they are truly needed. It lowers the identity verification floor for every Sierra Leonean app — from e-commerce and HR platforms to government service portals — and is explicitly designed to plug into NCRA's live verification once a Phase 2 partnership is established.

### 2.3 Scope of this document

This document covers Phase 1 only, including the NFC chip verification layer added in v1.1. Phase 2 (live NCRA NIN database lookup) will be specified separately once an MoU with NCRA is established, drawing on the precedent set by the NCRA–MoCTI MoU signed in May 2024.

---

## 3. System Overview

### 3.1 High-level architecture

Sierrafy is composed of three deployable layers that developers can use independently or together.

| Layer | Component | Deployment model |
|---|---|---|
| 1 — Core SDK | `sierrafy-core` (npm / pip / composer) | Installed as a library in the developer's app |
| 2 — API Gateway | `sierrafy-server` (Node.js / Express) | Self-hosted Docker container or cloud VM |
| 3 — Dashboard (optional) | `sierrafy-admin` (React SPA) | Served alongside the gateway for monitoring |

Developers can use the Core SDK directly for server-side integration (no gateway needed), or point their frontend to the hosted API Gateway for browser and mobile clients. The Admin Dashboard is optional and provides verification logs, error rates, and audit trails.

### 3.2 Data flow — single verification request

```
[Client App]
    |
    |  POST /v1/verify
    |  { nin, id_image_base64, selfie_base64, nfc_data? }
    v
[Sierrafy API Gateway]
    |
    |--- 1. NIN format validator    (sync, in-process)
    |--- 2. Document OCR engine     (Tesseract / custom model)
    |--- 3. Face match engine       (DeepFace / InsightFace)
    |--- 4. Fraud signal checks     (metadata, duplicate detection)
    |--- 5. NFC chip verifier       (passive auth — mobile SDK only)
    |
    v
[Verification Response]
    {
      nin_valid: true,
      nin_matches_card: true,
      face_match_score: 0.94,
      fraud_signals: [],
      nfc_chip_authentic: true,
      nfc_data_matches_ocr: true,
      confidence_score: 99,
      status: "PASS"
    }
```

### 3.3 Supported ID document types (Phase 1)

Phase 1 focuses on the two documents that are universally accepted for all public and private services in Sierra Leone. Pre-chip National ID cards have been phased out by NCRA's replacement drive. Voter ID cards are election-specific and not accepted for general national services. Driver's licenses are deferred to a future release.

| Document | Issuing authority | Key fields extracted | Phase 1 support |
|---|---|---|---|
| National eID Card (chip) | NCRA | NIN, full name, DOB, photo, chip number | ✅ Full support + NFC chip read |
| Passport | SL Immigration | Surname, given name, DOB, MRZ, photo | ✅ Full support + NFC chip read |
| National ID Card (pre-chip) | NCRA | — | ⏭ Deferred — replaced by eID |
| Voter ID Card | ECSL | — | ⏭ Deferred — election use only |
| Driver's License | SLRSA | — | ⏭ Deferred to future release |

---

## 4. Component Specifications

### 4.1 NIN Format Validator

#### 4.1.1 NIN structure

The Sierra Leone NIN is a short alphanumeric identifier assigned by NCRA. The format below was **corrected against real eID card samples** (June 2026); an earlier draft of this spec inferred a 14-character `SL2019…` pattern, but that value is actually the card's separate **Personal ID Number** (see note), not the NIN.

| Property | Specification |
|---|---|
| Length | 8 characters (observed on cards; confirm with NCRA documentation) |
| Character set | Uppercase alphanumeric — A–Z and 0–9, no special characters |
| Structure | No country prefix and no embedded year; no fixed sub-segment layout observed |
| Example pattern | 8 × `[A-Z0-9]` (e.g. all-letters, or letters mixed with digits) |
| Check digit | Unknown — no obvious check digit (one sample NIN ends in a letter); none enforced |

> **Personal ID Number vs NIN:** The eID card prints **two** distinct numbers. The **Personal ID Number** is a ~19-character `SL`-prefixed value that embeds the issue date (`YYYYMMDD`, with expiry ≈ issue + 5 years) — this is the document/card number. The **NIN** is the separate 8-character alphanumeric code labelled "NIN". This SDK's validator targets the NIN; a Personal ID Number validator may be added later.

> **Implementation note:** The exact NIN charset and any checksum should still be confirmed directly with NCRA before release. The validator is configurable via a JSON schema file (`packages/core/src/schema/nin-format.json`) so format rules can be updated without a code change — anticipating minor variations across registration cohorts.

#### 4.1.2 Validation rules

- **Length check** — reject any string not matching the expected character count (8)
- **Character set check** — reject lowercase, spaces, or special characters
- **Checksum validation** — optional, disabled by default until the algorithm (if any) is confirmed
- **Blacklist check** — reject NINs on a developer-supplied blocklist (e.g. known test values)

> Prefix and embedded-year checks were removed: they applied to the misidentified `SL…` Personal ID Number, not the NIN.

#### 4.1.3 Response

```json
// Valid NIN
{
  "valid": true,
  "nin": "ABCD1234",
  "checks": {
    "length": true,
    "charset": true,
    "checksum": true,
    "blacklist": true
  }
}

// Invalid NIN
{
  "valid": false,
  "nin": "abcd1234",
  "error": "INVALID_CHARSET",
  "checks": { "length": true, "charset": false, "checksum": true, "blacklist": true }
}
```

---

### 4.2 Document OCR Engine

#### 4.2.1 Purpose

The OCR engine extracts structured data from a photo or scan of a Sierra Leone ID document. This data is then cross-checked against what the user typed into the developer's form — confirming that the NIN on the card matches the NIN submitted, and that name and date of birth are consistent.

#### 4.2.2 Technology stack

| Concern | Chosen library / approach |
|---|---|
| Primary OCR | Tesseract.js (v5) — open source, runs in Node.js and browser |
| Image pre-processing | Sharp (Node.js) — resize, grayscale, contrast enhancement before OCR |
| Document layout detection | Custom zone-map JSON per document type (defines bounding boxes for NIN, name, DOB fields) |
| MRZ parsing (passports) | `mrz-detection` npm package — handles ICAO 9303 Machine Readable Zone |
| Fallback / accuracy boost | Google Cloud Vision API (optional, developer can supply own key) |

#### 4.2.3 Document zone maps

Each supported document type has a corresponding zone map — a JSON file that defines the pixel regions (relative coordinates as fractions of card width/height) where each data field appears. Phase 1 ships with two zone maps: one for the National eID Card and one for the Passport MRZ region.

```json
// Zone map: National eID Card
{
  "document_type": "SL_NATIONAL_EID",
  "zones": {
    "nin":        { "x": 0.05, "y": 0.58, "w": 0.55, "h": 0.10 },
    "surname":    { "x": 0.05, "y": 0.38, "w": 0.55, "h": 0.10 },
    "given_name": { "x": 0.05, "y": 0.46, "w": 0.55, "h": 0.10 },
    "dob":        { "x": 0.05, "y": 0.68, "w": 0.35, "h": 0.10 },
    "photo":      { "x": 0.65, "y": 0.28, "w": 0.30, "h": 0.40 }
  }
}

// Zone map: Passport (MRZ lines + biographical data page)
{
  "document_type": "SL_PASSPORT",
  "zones": {
    "surname":    { "x": 0.05, "y": 0.18, "w": 0.70, "h": 0.08 },
    "given_name": { "x": 0.05, "y": 0.26, "w": 0.70, "h": 0.08 },
    "dob":        { "x": 0.05, "y": 0.42, "w": 0.30, "h": 0.08 },
    "photo":      { "x": 0.72, "y": 0.10, "w": 0.25, "h": 0.38 },
    "mrz_line1":  { "x": 0.02, "y": 0.82, "w": 0.96, "h": 0.08 },
    "mrz_line2":  { "x": 0.02, "y": 0.91, "w": 0.96, "h": 0.08 }
  }
}
```

> **Note:** Passport MRZ lines are parsed by the `mrz-detection` library using the ICAO 9303 standard, providing a secondary high-confidence extraction path independent of the zone-map OCR.

#### 4.2.4 Cross-check logic

After OCR extraction, the engine performs fuzzy matching between the card data and the user-submitted data, using Levenshtein distance to tolerate minor OCR errors.

- **NIN match** — exact match required (NINs are alphanumeric codes with no natural variation)
- **Name match** — fuzzy match with threshold of 85% similarity (handles OCR noise, hyphenated names)
- **DOB match** — exact match after normalising date format (DD/MM/YYYY → ISO 8601)
- **Document type detection** — auto-classify the uploaded image to select the correct zone map

---

### 4.3 Face Match Engine

#### 4.3.1 Purpose

The face match engine compares the user's selfie against the portrait photo extracted from their ID card. A passing match confirms that the physical person presenting the ID is the same person whose photo appears on the card.

#### 4.3.2 Technology stack

| Concern | Chosen library |
|---|---|
| Face detection | face-api.js (TensorFlow.js backend) — runs in Node.js |
| Face embedding / comparison | DeepFace (Python microservice) or InsightFace (Python) |
| Liveness detection (basic) | Passive liveness — BRISQUE sharpness score, blink detection via MediaPipe (optional, client-side) |
| Threshold | Cosine similarity >= 0.82 for PASS (tunable via config) |
| Fallback | If the ID photo cannot be extracted cleanly, return `FACE_UNREADABLE` and skip match |

#### 4.3.3 Face match architecture

The face matching component runs as a lightweight Python microservice (FastAPI) alongside the main Node.js gateway. The Node.js gateway calls it over localhost HTTP, keeping the SDK self-contained within a single Docker Compose deployment.

```yaml
# docker-compose.yml (excerpt)
services:
  gateway:
    image: sierrafy-gateway
    ports: ["3000:3000"]
    depends_on: [face-engine]

  face-engine:
    image: sierrafy-face
    build: ./services/face-engine
    environment:
      - MATCH_THRESHOLD=0.82
      - MODEL=insightface-buffalo-l
```

#### 4.3.4 Privacy considerations

Biometric data (face embeddings and selfie images) must never be stored by the Sierrafy gateway. All face processing is ephemeral — images are processed in memory, embeddings are compared and discarded, and no biometric data is written to disk or database. This is a hard architectural constraint, not a configuration option.

> **Privacy-by-design requirement:** Sierrafy stores NO biometric data. Face images and embeddings are processed in memory and discarded immediately after the match score is returned. Developers may not configure the gateway to persist these. This is required for compliance with Sierra Leone's data protection provisions under the Telecommunications Act 2006 and NATCOM guidelines.

---

### 4.4 Fraud Signal Detection

#### 4.4.1 Checks performed

| Signal | Method | What it catches | Severity |
|---|---|---|---|
| Digital tampering | ELA (Error Level Analysis) on card image | Photoshopped NIN or photo regions | High |
| Screen recapture | BRISQUE noise pattern analysis | Photo taken of a screen or printout | High |
| Duplicate NIN | SHA-256 hash of NIN checked against request log | Same NIN submitted multiple times in session | Medium |
| Expired document | DOB + issue date extracted vs current date | Expired ID being reused | Medium |
| Font anomaly | Zone-specific pixel variance check | Altered text on card fields | Medium |
| Selfie–photo mismatch | Embedding distance outside threshold | Wrong person presenting the card | High |

#### 4.4.2 Risk scoring

Each signal contributes a penalty to a risk score (0–100). The overall confidence score returned to the developer is 100 minus the accumulated risk. Developers configure their own PASS / REVIEW / FAIL thresholds in their integration.

```json
// sierrafy.config.json
{
  "thresholds": {
    "pass":   { "min_confidence": 80 },
    "review": { "min_confidence": 60 },
    "fail":   { "max_confidence": 59 }
  },
  "risk_weights": {
    "digital_tampering": 40,
    "screen_recapture":  30,
    "duplicate_nin":     20,
    "font_anomaly":      20,
    "selfie_mismatch":   40
  }
}
```

---

### 4.5 NFC Chip Verifier

#### 4.5.1 Purpose

The Sierra Leone National eID Card carries an ICAO-compliant contactless NFC chip, personalised with ICAO-compliant biometrics and public key infrastructure by X Infotech. Reading this chip directly gives the highest confidence available in Phase 1 — chip data is cryptographically signed by NCRA and mathematically cannot be forged or altered without detection. This is qualitatively different from OCR, which reads printed text that could theoretically be tampered with.

The NFC verifier runs exclusively in the Sierrafy mobile SDKs (React Native and Flutter). It is not available in the web SDK or the server-side Node.js SDK because NFC APDU commands require direct hardware access. Web apps fall back gracefully to the OCR + face match pipeline.

#### 4.5.2 Verification confidence levels

| Layer | Method | Confidence | What it proves |
|---|---|---|---|
| 1 | NIN format validation | Low | String is structurally valid |
| 2–4 | Document OCR + face match + fraud checks | Medium–High | Card looks authentic, face matches |
| **5** | **NFC chip read + passive authentication** | **Very high** | **Chip data is NCRA-signed and unaltered** |
| Phase 2 | Live NCRA DB lookup | Definitive | NIN is active in the registry |

#### 4.5.3 Technology stack

| Concern | Technology |
|---|---|
| NFC low-level transport (Android) | Android NFC API — ISO 7816-4 APDU |
| NFC low-level transport (iOS) | CoreNFC — NFCTagReaderSession (ISO 7816) |
| React Native NFC bridge | `react-native-nfc-manager` |
| Flutter NFC bridge | `flutter_nfc_kit` |
| eMRTD chip protocol (iOS reference) | `AndyQ/NFCPassportReader` (MIT, Swift) |
| Cryptographic verification | OpenSSL (via native bridge) |
| CSCA certificate store | Bundled PEM file — NCRA root certificate |

#### 4.5.4 Access control protocols

Before the chip data can be read, an access control handshake must be completed. This prevents the chip being skimmed silently without the card being physically presented. Two protocols are supported, following the ICAO 9303 standard:

**BAC (Basic Access Control)** — the fallback protocol. The access key is derived from the MRZ fields scanned by the OCR engine: document number + date of birth + expiry date. The SDK performs the MRZ scan first, derives the BAC key, then opens the NFC session.

**PACE (Password Authenticated Connection Establishment)** — the preferred protocol where supported. More secure than BAC; uses a stronger key exchange to prevent eavesdropping. The SDK attempts PACE first and falls back to BAC automatically if the chip does not support it.

```
[Mobile SDK]
    |
    |--- 1. OCR scan (extract MRZ / card number for BAC key)
    |--- 2. Derive BAC key: hash(doc_number + dob + expiry)
    |--- 3. Attempt PACE → fallback to BAC if unsupported
    |--- 4. Establish secure messaging channel with chip
    |--- 5. Read DG1 (personal data: name, DOB, NIN)
    |--- 6. Read DG2 (biometric photo — JPEG/JPEG2000)
    |--- 7. Read EF.SOD (document security object — NCRA digital signature)
    |--- 8. Passive authentication: verify SOD signature against NCRA CSCA cert
    |
    v
    { chip_authentic: true, dg1: {...}, dg2: <image>, passive_auth_passed: true }
```

#### 4.5.5 Passive authentication

Passive authentication is the cryptographic proof that chip data is genuinely government-issued. The Document Security Object (EF.SOD) stored on the chip contains a digital signature over all the data groups, signed by NCRA's Document Signer Certificate (DSC), which is in turn signed by NCRA's Country Signing Certificate Authority (CSCA) root certificate.

Sierrafy bundles the NCRA CSCA certificate as a PEM file in the mobile SDK. On every NFC read, the SDK:

1. Reads EF.SOD from the chip
2. Verifies the DSC chain up to the bundled NCRA CSCA root
3. Verifies the hash of each data group against the signed hashes in EF.SOD
4. Returns `passive_auth_passed: true` only if the entire chain validates

If any hash mismatches or the certificate chain is invalid, the chip is flagged as tampered.

> **Open question — NCRA CSCA certificate:** Passive authentication requires the NCRA CSCA root certificate in PEM format. NCRA must either publish this to the ICAO Public Key Directory (PKD) or provide it directly to Sierrafy. This should be part of the Phase 2 partnership discussion. Until the certificate is obtained, the NFC layer can still read and return chip data but cannot perform passive authentication — it will return `passive_auth_passed: null` with a `CSCA_UNAVAILABLE` flag rather than failing the verification.

#### 4.5.6 Data groups read

| Data group | Contents | Mandatory |
|---|---|---|
| DG1 | MRZ / personal data (name, DOB, NIN, expiry) | Yes |
| DG2 | Biometric portrait photo (JPEG or JPEG2000) | Yes |
| EF.SOD | Document Security Object — NCRA digital signature | Yes (for passive auth) |
| EF.COM | List of data groups present on chip | Yes |

DG3 (fingerprints) and DG4 (iris) require Extended Access Control (EAC) with government-issued inspection certificates and are outside the scope of this SDK.

#### 4.5.7 Cross-check against OCR data

After chip reading, the NFC verifier cross-checks the chip's DG1 fields against the OCR-extracted fields from the same session:

- **NIN match** — DG1 NIN must exactly match OCR-extracted NIN
- **Name match** — fuzzy match at 95% threshold (chip data is canonical; OCR may have minor noise)
- **DOB match** — exact match after date normalisation
- **Photo cross-check** — DG2 biometric photo is passed to the face match engine as the reference image, replacing the OCR-cropped photo for higher-quality face matching

If the chip data and OCR data do not match, `nfc_data_matches_ocr: false` is returned as a high-severity fraud signal.

#### 4.5.8 Privacy considerations

DG2 biometric photo extracted from the NFC chip is treated identically to selfie images — processed in memory and discarded after the face match. It is never stored, logged, or transmitted beyond the local device SDK session.

---

### 5.1 Authentication

Developers authenticate using an API key passed in the request header. In self-hosted deployments, API keys are generated via the Admin Dashboard or the CLI. There is no central Sierrafy auth server — each self-hosted gateway manages its own keys.

```
Authorization: Bearer sfy_live_xxxxxxxxxxxxxxxx
```

### 5.2 Endpoints

#### `POST /v1/verify` — Full verification

```json
// Request
{
  "nin":           "SL2019XXXXXXXX",
  "id_image":      "<base64-jpeg>",
  "selfie":        "<base64-jpeg>",
  "full_name":     "Aminata Kamara",
  "date_of_birth": "1992-04-17",
  "nfc_data": {
    "dg1_base64":  "<base64>",
    "dg2_base64":  "<base64>",
    "sod_base64":  "<base64>"
  },
  "options": {
    "face_match":    true,
    "fraud_check":   true,
    "nfc_verify":    true,
    "return_fields": ["nin", "name", "dob"]
  }
}

// Response
{
  "request_id":       "req_01HZ...",
  "status":           "PASS",
  "confidence_score": 99,
  "checks": {
    "nin_format_valid":     true,
    "nin_matches_card":     true,
    "name_match_score":     0.96,
    "dob_match":            true,
    "face_match_score":     0.97,
    "fraud_signals":        [],
    "nfc_chip_authentic":   true,
    "nfc_passive_auth":     true,
    "nfc_data_matches_ocr": true
  },
  "extracted": {
    "nin":  "SL2019XXXXXXXX",
    "name": "AMINATA KAMARA",
    "dob":  "1992-04-17"
  },
  "document_type": "SL_NATIONAL_EID",
  "processing_ms": 980
}
```

#### `POST /v1/validate-nin` — NIN format only (lightweight)

```json
// Request
{ "nin": "SL2019XXXXXXXX" }

// Response
{
  "valid": true,
  "nin": "SL2019XXXXXXXX",
  "checks": { "length": true, "prefix": true, "year": true }
}
```

#### `POST /v1/ocr` — Document OCR only

```json
// Request
{ "id_image": "<base64-jpeg>", "document_type": "auto" }

// Response
{
  "document_type": "SL_NATIONAL_EID",
  "extracted": { "nin": "...", "name": "...", "dob": "..." },
  "ocr_confidence": 0.91
}
```

#### `POST /v1/face-match` — Face comparison only

```json
// Request
{ "id_image": "<base64-jpeg>", "selfie": "<base64-jpeg>" }

// Response
{ "match": true, "score": 0.94, "threshold_used": 0.82 }
```

#### `POST /v1/nfc-verify` — NFC chip verification only (mobile SDK)

```json
// Request
{
  "dg1_base64": "<base64>",
  "dg2_base64": "<base64>",
  "sod_base64": "<base64>",
  "selfie":     "<base64-jpeg>"
}

// Response
{
  "chip_authentic":      true,
  "passive_auth_passed": true,
  "passive_auth_status": "CSCA_VERIFIED",
  "dg1": {
    "nin":  "SL2019XXXXXXXX",
    "name": "AMINATA KAMARA",
    "dob":  "1992-04-17",
    "expiry": "2029-08-15"
  },
  "face_match_score": 0.97
}
```

### 5.3 Error codes

| Code | HTTP status | Meaning | Action |
|---|---|---|---|
| `INVALID_NIN_FORMAT` | 400 | NIN does not pass format validation | Return error to user before image upload |
| `IMAGE_UNREADABLE` | 422 | ID image too blurry or poorly lit | Prompt user to retake photo |
| `FACE_UNREADABLE` | 422 | Photo not extractable from ID card | Fallback to OCR-only result |
| `SELFIE_REQUIRED` | 400 | `face_match: true` but no selfie sent | Include selfie in request |
| `DOCUMENT_UNSUPPORTED` | 422 | Document type not in supported list | Check supported document types |
| `NFC_CHIP_TAMPERED` | 422 | Passive authentication failed — chip data does not match NCRA signature | Reject document; treat as fraud signal |
| `NFC_ACCESS_DENIED` | 422 | BAC/PACE handshake failed — incorrect MRZ data used as key | Retry with correct MRZ scan |
| `CSCA_UNAVAILABLE` | 200 | NCRA root certificate not yet bundled — passive auth skipped | Chip data returned; auth result is `null` |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Implement backoff; check plan limits |
| `INTERNAL_ERROR` | 500 | Processing failure | Retry; check gateway logs |

---

## 6. SDK Reference

### 6.1 JavaScript / TypeScript

```bash
pnpm add @sierrafy/sdk
```

```typescript
import { Sierrafy } from '@sierrafy/sdk';

const client = new Sierrafy({
  apiKey:  'sfy_live_xxx',
  baseUrl: 'https://your-gateway.example.com'
});

const result = await client.verify({
  nin:     'SL2019XXXXXXXX',
  idImage: imageBase64,
  selfie:  selfieBase64,
  options: { faceMatch: true, fraudCheck: true }
});

if (result.status === 'PASS') {
  // Proceed with onboarding
}
```

### 6.2 Python

```bash
pip install sierrafy
```

```python
from sierrafy import Sierrafy

client = Sierrafy(
    api_key  = 'sfy_live_xxx',
    base_url = 'https://your-gateway.example.com'
)

result = client.verify(
    nin      = 'SL2019XXXXXXXX',
    id_image = image_bytes,
    selfie   = selfie_bytes,
    options  = {'face_match': True}
)

print(result['confidence_score'])  # e.g. 91
```

### 6.3 PHP

```bash
composer require sierrafy/sdk
```

```php
use Sierrafy\Client;

$client = new Client([
    'api_key'  => 'sfy_live_xxx',
    'base_url' => 'https://your-gateway.example.com'
]);

$result = $client->verify([
    'nin'      => 'SL2019XXXXXXXX',
    'id_image' => base64_encode($imageData),
    'selfie'   => base64_encode($selfieData),
]);

echo $result['status'];  // PASS
```

### 6.4 React Native (NFC-enabled)

```bash
pnpm add @sierrafy/sdk-react-native react-native-nfc-manager
```

```typescript
import { SierrafyNFC } from '@sierrafy/sdk-react-native';

const client = new SierrafyNFC({
  apiKey:  'sfy_live_xxx',
  baseUrl: 'https://your-gateway.example.com'
});

// Step 1 — Scan MRZ from card image (derives BAC key)
const mrz = await client.scanMRZ(idImageBase64);

// Step 2 — Tap card to phone: read NFC chip using BAC key from MRZ
const chipData = await client.readChip({
  mrzKey: mrz.bacKey,   // doc_number + dob + expiry
  readDG1: true,        // personal data
  readDG2: true,        // biometric photo
  readSOD: true         // for passive authentication
});

// Step 3 — Full verify: OCR + NFC + face match in one call
const result = await client.verify({
  nin:      mrz.nin,
  idImage:  idImageBase64,
  selfie:   selfieBase64,
  nfcData:  chipData,
  options:  { faceMatch: true, nfcVerify: true, fraudCheck: true }
});

if (result.status === 'PASS' && result.checks.nfc_chip_authentic) {
  // Highest confidence — chip verified by NCRA signature
}
```

### 6.5 Flutter (NFC-enabled)

```bash
flutter pub add sierrafy_flutter flutter_nfc_kit
```

```dart
import 'package:sierrafy_flutter/sierrafy_flutter.dart';

final client = SierrafyNFC(
  apiKey:  'sfy_live_xxx',
  baseUrl: 'https://your-gateway.example.com',
);

// Step 1 — Scan MRZ to derive BAC key
final mrz = await client.scanMRZ(idImageBytes);

// Step 2 — Read NFC chip
final chipData = await client.readChip(
  mrzKey:  mrz.bacKey,
  readDG1: true,
  readDG2: true,
  readSOD: true,
);

// Step 3 — Full verification
final result = await client.verify(
  nin:      mrz.nin,
  idImage:  idImageBytes,
  selfie:   selfieBytes,
  nfcData:  chipData,
  options:  SierrafyOptions(faceMatch: true, nfcVerify: true),
);

print(result.confidenceScore);  // e.g. 99
print(result.checks.nfcChipAuthentic);  // true
```

---

## 7. Deployment Guide

### 7.1 Docker (recommended)

```bash
# Clone and configure
git clone https://github.com/your-org/sierrafy
cd sierrafy
cp .env.example .env
# Set API_KEY_SEED, LOG_LEVEL, FACE_THRESHOLD in .env

# Start all services
docker compose up -d

# Gateway is now available at http://localhost:3000
# Admin dashboard at http://localhost:3001
```

### 7.2 Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | Gateway HTTP port (default: 3000) |
| `API_KEY_SEED` | Seed for generating and validating API keys |
| `FACE_THRESHOLD` | Cosine similarity threshold for face match pass (default: 0.82) |
| `OCR_ENGINE` | `tesseract` (default) or `google-vision` |
| `GOOGLE_VISION_KEY` | Required only if `OCR_ENGINE=google-vision` |
| `LOG_LEVEL` | `error` \| `warn` \| `info` \| `debug` |
| `DISABLE_BIOMETRIC_STORAGE` | Must always be `true` — prevents accidental logging of face data |
| `RATE_LIMIT_PER_MIN` | Max requests per API key per minute (default: 60) |
| `NCRA_CSCA_CERT_PATH` | Path to NCRA CSCA root certificate PEM file for NFC passive authentication |
| `NFC_PASSIVE_AUTH_REQUIRED` | `false` (default) — if `true`, NFC verifications without passive auth return `FAIL` |

### 7.3 Minimum hardware requirements

- **CPU** — 2 vCPU (4 vCPU recommended for face matching)
- **RAM** — 2 GB minimum, 4 GB recommended
- **Storage** — 5 GB (models + logs)
- **Network** — outbound not required in Phase 1 (fully offline-capable)
- **OS** — Ubuntu 22.04 LTS or any Docker-compatible Linux distribution

> **Offline operation:** Sierrafy Phase 1 is fully offline-capable. All OCR models, face embedding models, and zone maps are bundled in the Docker image. No external API calls are made unless the developer explicitly configures Google Vision as the OCR engine. This is critical for deployments in Sierra Leone where internet reliability may be intermittent.

---

## 8. Full Technology Stack

| Concern | Technology | Language | Licence |
|---|---|---|---|
| API Gateway | Node.js + Express | TypeScript | MIT |
| OCR | Tesseract.js v5 | JavaScript | Apache 2.0 |
| Image processing | Sharp | Node.js (libvips) | Apache 2.0 |
| Face detection | face-api.js | TypeScript | MIT |
| Face matching | InsightFace / DeepFace | Python | MIT / Apache |
| Face service framework | FastAPI | Python | MIT |
| Error level analysis | python-ela | Python | MIT |
| MRZ parsing | mrz-detection | JavaScript | MIT |
| NFC transport (Android) | Android NFC API (ISO 7816-4) | Kotlin / Java | Apache 2.0 |
| NFC transport (iOS) | CoreNFC (NFCTagReaderSession) | Swift | Proprietary (Apple) |
| React Native NFC bridge | react-native-nfc-manager | TypeScript | MIT |
| Flutter NFC bridge | flutter_nfc_kit | Dart | MIT |
| eMRTD chip protocol reference | AndyQ/NFCPassportReader | Swift | MIT |
| NFC crypto (passive auth) | OpenSSL (native bridge) | C / Swift / Kotlin | Apache 2.0 |
| Containerisation | Docker + Compose | YAML | Apache 2.0 |
| JS SDK | TypeScript, rollup | TypeScript | MIT |
| Python SDK | httpx + pydantic | Python | MIT |
| PHP SDK | Guzzle HTTP | PHP 8+ | MIT |
| React Native SDK | react-native-nfc-manager + axios | TypeScript | MIT |
| Flutter SDK | flutter_nfc_kit + dio | Dart | MIT |
| Admin dashboard | React + Vite + Tailwind | TypeScript | MIT |
| Testing | Jest (JS) / pytest (Python) | Both | MIT |
| CI/CD | GitHub Actions | YAML | Free tier |

---

## 9. Security and Privacy

### 9.1 Security principles

- No biometric data is persisted at any point — all face images and embeddings are memory-only
- API keys are hashed (bcrypt) before storage; plaintext keys are only shown once on creation
- All inter-service communication is over localhost only in the default Docker Compose setup
- TLS must be configured at the reverse proxy level (Nginx / Caddy) for any internet-facing deployment
- Request payloads (containing ID images) are never written to access logs
- Rate limiting is enforced per API key to prevent enumeration attacks

### 9.2 Data retention policy (default)

| Data type | Retention |
|---|---|
| NIN (hashed for duplicate check) | Rolling 24-hour window, then purged |
| ID card images | Never stored — memory-only processing |
| Selfie images | Never stored — memory-only processing |
| Face embeddings | Never stored — discarded after match |
| Verification result (pass/fail + score) | 30 days (configurable, can be disabled) |
| Request metadata (timestamp, API key hash, latency) | 90 days for audit trail |

### 9.3 Consent requirement

Developers integrating Sierrafy are required (by the SDK terms) to obtain explicit informed consent from their users before initiating a verification request. The SDK includes a consent-logging utility that records a consent timestamp and version alongside the verification result. This is a legal requirement under Sierra Leone's data protection provisions.

---

## 10. Roadmap

### 10.1 Phase 1 milestones (this document)

| Milestone | Target |
|---|---|
| M1 — NIN validator (`@sierrafy/sdk` npm package) | Week 2 |
| M2 — Document OCR + zone maps for National eID Card | Week 4 |
| M3 — Document OCR + zone maps for Passport (incl. MRZ) | Week 6 |
| M4 — Face match microservice (Docker / FastAPI) | Week 8 |
| M5 — Fraud signal checks (ELA, screen recapture, duplicate NIN) | Week 9 |
| M6 — API Gateway with all endpoints integrated | Week 10 |
| M7 — JS SDK (npm) + Python SDK (pip) | Week 12 |
| M8 — PHP SDK (composer) | Week 13 |
| M9 — React Native SDK + NFC chip reader (BAC/PACE + passive auth) | Week 14 |
| M10 — Flutter SDK + NFC chip reader | Week 15 |
| M11 — Admin dashboard (basic) | Week 16 |
| M12 — Public GitHub release + README + docs site | Week 18 |

### 10.2 Phase 2 (post-NCRA MoU)

- Live NIN database lookup against NCRA eKYC endpoint
- Real-time NIN status check (active / deactivated / deceased)
- MOSIP eVerify protocol integration (aligned with NCRA's MOSIP pilot)
- Full passive authentication — NCRA CSCA certificate obtained and bundled
- Hosted shared-gateway tier for developers without their own server
- Developer portal with usage dashboard, key management, and billing

### 10.3 Phase 3 (ecosystem)

- Driver's License OCR support (SLRSA)
- Voter ID verification via ECSL API (subject to access agreement — election-period use)
- No-code widget — embeddable iframe for non-technical integrators
- Webhook support — push verification results to developer endpoints
- DPG registration — submit to the Digital Public Goods Alliance registry
- NCRA co-branding — formal recognition as an approved developer gateway

---

## 11. Contributing and Governance

### 11.1 Repository structure

```
sierrafy/
├── packages/
│   ├── core/           # NIN validator, OCR engine, fraud checks (TypeScript)
│   ├── gateway/        # Express API server
│   ├── face-engine/    # Python FastAPI face match microservice
│   ├── nfc-engine/     # NFC chip reader + passive auth (shared logic)
│   ├── sdk-js/         # npm SDK (@sierrafy/sdk)
│   ├── sdk-python/     # pip SDK (sierrafy)
│   ├── sdk-php/        # composer SDK (sierrafy/sdk)
│   ├── sdk-rn/         # React Native SDK (@sierrafy/sdk-react-native)
│   └── sdk-flutter/    # Flutter SDK (sierrafy_flutter)
├── zone-maps/          # OCR zone map JSONs (CC0 licensed)
│   ├── SL_NATIONAL_EID.json
│   └── SL_PASSPORT.json
├── csca-certs/         # NCRA root certificate PEM (added when obtained)
│   └── SL_NCRA_CSCA.pem
├── dashboard/          # React admin UI
├── docs/               # Documentation site (Docusaurus)
├── docker-compose.yml
├── .env.example
└── README.md
```

### 11.2 Licence

Sierrafy is released under the MIT Licence. All contributions to the main repository must be compatible with MIT. Zone maps (document layout definitions) are contributed under Creative Commons CC0 to encourage community updates as NCRA and SL Immigration update card designs.

### 11.3 Governance model

Initial governance is maintainer-led (solo developer). As the project gains contributors, a Technical Steering Committee will be proposed — modelled on similar open-source civic-tech projects in Africa. NCRA and MoCTI will be invited as advisory stakeholders once Phase 2 partnership discussions begin.

---

## 12. Open Questions and Assumptions

> **Items requiring external confirmation before Phase 1 release**

1. **Exact NIN format** — *partially resolved from real eID samples (June 2026):* the NIN is an **8-character uppercase alphanumeric** code (no `SL` prefix, no embedded year); the 14-char `SL…` value is the separate Personal ID Number. Still to confirm with NCRA: exact charset constraints (e.g. `O`/`0` handling, whether digits are always permitted) and whether any **checksum** exists. The validator ships on these observed rules with the checksum disabled until confirmed.

2. **Zone map coordinates** — the pixel bounding boxes for OCR zones for both the National eID Card and Passport have been estimated from publicly available card photos. Accurate coordinates require a controlled set of high-resolution scans of each document type. Priority: source at least 10 samples per document type before M2/M3 milestones.

3. **NCRA developer sandbox** — Phase 2 depends on NCRA offering a sandbox and a developer tier suited to smaller builders. The existing eKYC API is priced at around USD 30 per NIN check, which is difficult for early-stage and high-volume products to absorb. A partnership proposal should be drafted — framed around expanding trusted NIN adoption across the developer ecosystem — citing the MoCTI open-source software policy (November 2025) and the NCRA–MoCTI MoU (May 2024).

4. **NCRA CSCA certificate** — full NFC passive authentication requires the NCRA Country Signing Certificate Authority (CSCA) root certificate in PEM format. This is the cryptographic root that proves chip data is genuine. NCRA must either publish this to the ICAO Public Key Directory (PKD) or provide it directly. This should be the first technical ask in the NCRA partnership conversation. Until it is obtained, the NFC layer reads chip data but returns `passive_auth_passed: null` with `CSCA_UNAVAILABLE`. Confirm also whether the eID chip uses standard ICAO 9303 data group layout or a proprietary X Infotech structure — this determines whether existing open-source eMRTD libraries can be used without modification.

5. **NATCOM data protection guidance** — the specific consent language and data retention requirements under NATCOM's data protection enforcement should be reviewed with a Sierra Leone-based lawyer before the SDK terms are finalised.

---

*End of document — Sierrafy Technical Architecture Specification v1.1*
