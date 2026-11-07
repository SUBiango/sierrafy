# Sierrafy: MoCTI DPG Funding Routes and DPG Registry Readiness

**Research brief · 25 October 2026**
Prepared for Umaru S. Biango · Sierrafy (sierrafy.dev)
Evidence checked against: npm `@sierrafy/sdk@0.1.1` (`0.1.0` at the time of writing), docs.sierrafy.dev, sierrafy.dev, github.com/SUBiango/sierrafy, DPG Standard repo (DPGAlliance), MoCTI, UNICEF and press sources listed at the end.

> **Implementation status, 26 October 2026.** Everything in Part 6 steps 1 and 2 is done in the repository: the four policy documents, the README ownership section, the issue templates, the docs Privacy page, and all six spec edits. Indicators 7, 9A, 9B and 9C now have evidence to point at, and nothing in the mapping below is still blocking submission. The items still outstanding are the ones that need someone else: the registry application itself (step 3), the two emails (step 4), contributors (step 5), and a pilot letter (step 6). Per-item notes are marked **Done** inline.

---

## Bottom line

1. **There is no standalone, always-open "public good grant".** What the government runs is the **National Digital Public Goods Accelerator**, a five-month, cohort-based programme for youth-led startups, delivered as the **DPG Accelerator Lab** by Christex Foundation through MoCTI, with UNICEF and Norway (NORAD) funding. No open call for the next cohort was published as of 25 October 2026.
2. **The gate into the next cohort is the DPG Standard.** MoCTI says projects that meet the standard through the national **DPG Pipeline** become eligible for the next Accelerator Lab. So the fastest route into the grant is to apply to the DPG Registry now, not to wait for a call.
3. **Sierrafy is registry-ready.** ✅ Six of the nine indicators were already met with public evidence. The four that needed work needed documentation, not product code: the privacy statement and laws list, a code of conduct, a responsible-use note, and two spec changes. All four are now in the repository.
4. **Two spec issues are corrected.** ✅ The face-match model named in the spec (InsightFace `buffalo_l`) ships weights licensed for non-commercial research only; the face model is now pluggable via `FACE_MODEL` with an Apache-2.0-weighted default (SFace), and `buffalo_l` is benchmarking-only. The duplicate-NIN check, which used an unsalted SHA-256 hash reversible by brute force, is now HMAC-SHA-256 keyed per deployment. Both were corrected on paper, before M4 and M5 are built, so no shipped code changed.
5. **Framing check.** ✅ The NCRA per-check price is out of spec §2.1 and §12.3, and `grep -i usd` on the spec now returns nothing. The gap is framed as missing developer tooling: no sandbox, nothing self-hostable, no on-ramp for a two-person team. `CONTRIBUTING.md` now bans currency figures from the spec as well as from public copy, since the spec is the document that goes to MoCTI, Christex and UNICEF.

---

## Part 1 — What the government's DPG programme actually is

### 1.1 The pieces

| Piece | Who runs it | What it is | Status (25 Oct 2026) |
|---|---|---|---|
| **National Digital Public Goods Accelerator** | MoCTI (listed on its Opportunities page) | Five-month programme for youth-led startups building open-source DPGs in education, health, climate resilience and **digital public infrastructure**. Stages: ideation, open-source development, pilot testing, DPG registry readiness. | Listed, but no deadline or application form visible. |
| **DPG Accelerator Lab** (cohort 1) | Christex Foundation, implemented through MoCTI | First delivery of the accelerator: 4 youth-led teams, 24 founders and contributors, being prepared for DPG Registry submission. | Cohort 1 ran in 2026. Next Lab not yet announced. |
| **Seed funding** | UNICEF-supported | A UNICEF consultancy brief for the Lab described managing **US$50,000 in seed funding** for innovative projects. Read this as the cohort's pool, not a per-team award. | Amount for the next cohort unknown. |
| **DPG Pipeline / Pipeline Platform** | MoCTI with UNICEF and Christex | National intake that identifies, assesses and supports promising open-source projects. Projects that meet the DPG Standard become eligible for the next Lab. | Platform upgraded in 2026. Universities are being added as feeders. |
| **Funding behind it** | Government of Norway (NORAD) and UNICEF Office of Innovation | Funds the national DPG initiative, which includes the Lab. | Active. |

I found nothing that ties the accelerator to the World Bank-funded Sierra Leone Digital Transformation Project (SLDTP). If your existing accelerator application draft describes it that way, change it to "MoCTI's DPG Accelerator, delivered with Christex Foundation and UNICEF".

### 1.2 Is it a continuous open portal?

**No.** It is cohort-based and partner-delivered:

- Cohort 1 was a fixed group of four teams, selected and run by an implementing partner.
- MoCTI describes entry to the *next* Lab as conditional on meeting the DPG Standard through the Pipeline, which is a staged intake rather than an open portal.
- The Opportunities listing has no form or deadline, and no new call appeared in MoCTI, UNICEF or press sources up to 25 October 2026.

That triggers the local-funding route in Part 2.

### 1.3 What the next intake will most likely look for

These follow from the programme's own stated stages and criteria:

| Signal | Sierrafy today |
|---|---|
| Fits a priority area (DPI named explicitly; identity is a core DPI domain) | ✅ Strong fit |
| Open source, working code | ✅ MIT, published on npm with provenance, public repo |
| Meets or is near the DPG Standard | 🟡 Close. See Part 4. A registry application ID is the clearest signal you can show. |
| Youth-led **team** | 🟡 Cohort 1 teams averaged six people. You're currently solo. |
| Pilot readiness (a real user to test with) | 🔴 No named pilot partner yet |

### 1.4 Eligibility risks to resolve before a call opens

1. **"Youth-led."** Check the age band in the next call. Comparable Sierra Leonean programmes use 15–35 (READY Salone does). If you're outside it, bring in a youth co-lead.
2. **Team.** Recruit two or three named contributors (a second developer, a community/QA lead, someone on partnerships). Your non-technical contributor guide is a ready recruiting tool.
3. **Legal form.** The listing says "startups". Find out whether an unregistered project can join, or whether you need a business name or NGO registration.
4. **Pilot partner.** One letter of intent from a fintech, microfinance institution, telco agent network or NGO that onboards people with NINs. An organisation you're connected to (for example YAH) can be a first pilot, but pair it with one independent partner so reviewers don't discount it.

### 1.5 Updates to make in your existing application materials

- **Open-source policy anchor.** Ecofin reports the Ministry approved Sierra Leone's first public-sector open-source software policy in 2025. UNICEF reported in June 2026 that the national Open-Source Policy had been drafted and tabled for Cabinet. Phrase it as "the MoCTI open-source software policy (approved by the Ministry in 2025, before Cabinet)" rather than as settled law.
- **New, stronger anchor.** In June 2026 MoCTI signed an MoU with Bhutan National Digital Identity and the SIGN Foundation, followed in August by a national public-private dialogue on trusted digital identity built on **open-source technology, verifiable credentials and international privacy standards**. Sierrafy, as the developer layer for using national ID, fits that agenda directly. Cite it.
- **Regulator name.** ✅ Done. The spec said "NATCOM"; MoCTI now refers to the regulator as the **National Communications Authority (NatCA)**. Renamed in spec §4.3.4 and §12.5 and in the weekly breakdown, with one sentence retained to explain the rename. `CONTRIBUTING.md` records the naming rule.
- **Data protection law status.** ✅ Done in the repository; still to apply in your application prose. There's still no data protection law in force. Cabinet approved a National Data Protection Policy and a new Data Protection and Right to Access Information Act on 21 April 2026; the bill had not been enacted as of 21 October 2026. Say "designed for" the bill, not "compliant with" it. Spec §4.3.4 and §9.3 and `PRIVACY.md` now use that wording, and `CONTRIBUTING.md` pins it.
- **Pricing lines.** ✅ Done. Deleted from spec §2.1 and §12.3. The gap framing is kept: NCRA built the foundation; Sierrafy is the developer layer above it.
- **Proof points to add.** `@sierrafy/sdk@0.1.1` published 27 October 2026 with npm provenance (SLSA v1 attestation) and a [published release page](https://github.com/SUBiango/sierrafy/releases/tag/v0.1.1), superseding `0.1.0` of 22 October; docs at docs.sierrafy.dev, including a Privacy page; the four published policies (`PRIVACY.md`, `SECURITY.md`, `RESPONSIBLE_USE.md`, `CODE_OF_CONDUCT.md`); OCR zone map calibrated on 10 real cards with no PII committed; your DPG Registry application ID once you have it.
- **A proof point that is better than a claim of good practice.** `0.1.1` exists because a review found the SDK's "fully offline-capable" claim was overstated: `tesseract.js` downloads its language model from a CDN on first use, so a fresh install on an offline machine failed. The fix shipped the capability (`cachePath` / `langPath`) rather than only softening the wording, and the changelog says plainly what was wrong. The same release raised `sharp` to `^0.35.5` for two high-severity advisories in the image decoders it bundles, which is the exact attack surface an OCR engine exposes. Reviewers assessing indicators 8 and 9A are reading for whether a maintainer corrects their own claims and patches what processes untrusted input. This is the evidence for both, so cite the release, not just the policies.

---

## Part 2 — Local funding: cohort and partner doors

Ranked by fit and how soon each can move. "Partner door" means the route opens through a relationship, not a form.

| # | Door | Type | Why it fits Sierrafy | What to do now |
|---|---|---|---|---|
| 1 | **MoCTI DPG Pipeline → next DPG Accelerator Lab** (Directorate of Innovation; DPG Lead: Hawa Kallon) | Partner door → cohort | The direct path to the government's DPG money and mentorship. DPG Standard compliance is the stated entry test. | Email info@mocti.gov.sl for the DPG Lead's attention. Ask for Pipeline intake and notice of the next Lab. Attach the DPG application ID (Part 6, step 2). |
| 2 | **Christex Foundation** (Lab implementer; venture studio; Freetown innovation hub) | Partner door | Runs the Lab and builds DPG infrastructure; it will shape selection. | Request a 20-minute intro: show the npm package and docs, ask what cohort 2 will need. |
| 3 | **UNICEF Sierra Leone Innovation** (Innovation Lead James Houghton; Innovation Officer Alpha Amadu Barrie) | Partner door | Funds the national DPG initiative with Norway and offers DPG technical support. | Ask for a DPG-readiness review of your registry application. Note: UNICEF Venture Fund's 2026 calls were themed (climate and health, femtech, blockchain), so they aren't a fit today. Watch for an identity or DPI call. |
| 4 | **National digital identity / DPI dialogue** (MoCTI with Bhutan NDI and SIGN Foundation) | Positioning door (not money) | Puts Sierrafy in the room where national ID tooling is being shaped, alongside NCRA. | Ask MoCTI to add you to the stakeholder list for the next forum. Offer Sierrafy as an open developer-layer reference. |
| 5 | **READY Salone** (ITC with KOICA funding, MoCTI partner) | Cohort | Supports youth-led digital startups aged 15–35; ran an Investor Day in 2026 where 11 startups pitched. | Register interest so you're notified of the next cohort. |
| 6 | **Sierra Leone Innovates: Big 5 Innovation Investment Challenge** | Cohort / prize | The 2025 round ran 20 January to 21 February 2025, for market-ready solutions aligned with national priorities. | The next round isn't announced. If it follows the 2025 pattern, expect a window early in the year. Have a pitch and demo video ready by December. |
| 7 | **UniPod Sierra Leone** (UNDP timbuktoo, at Fourah Bay College, opened 9 July 2026) and the **UNDP Accelerator Lab** | Partner door | Prototyping space, mentorship and pathways to investment for young builders. | Use it for contributor recruitment and demo days. Ask about timbuktoo funding pathways. |
| 8 | **Bank of Sierra Leone regulatory sandbox** (running since 2018) | Pilot door (not money) | Fintechs testing in the sandbox need KYC. A sandbox fintech is an ideal first pilot. | Ask Christex or BSL which sandbox participants need ID checks. Offer a free pilot. |
| 9 | **Sierra Leone Innovation Investment Fund (SLIIF)** | Watch | Aims to mobilise US$150m over five years and make Freetown a regional DPG testing hub. A feasibility study of its governance framework was still being procured in 2026. | Not open yet. Follow MoCTI and Felei TechCity announcements. |
| 10 | **DPI/DPG mini-grants** (an August 2026 listing open to individual practitioners and local fintechs, on open payments and DPI/DPG themes) | Small grant | Individuals are eligible, and DPI/DPG is a named theme. | Confirm the funder and deadline before investing time. |

**After DPG status:** Co-Develop (a DPI funder and co-steward of the DPGA's "DPGs for DPI" collection) becomes realistic once Sierrafy is a registered DPG with an external integration. That's a 2027 target.

### 2.1 Recommended sequence

1. **This week:** ✅ the documentation gaps in Part 4 are fixed. Merge them to `main` so the links resolve publicly, then submit the DPG Registry application.
2. **Same week:** send the MoCTI and Christex emails with the application ID.
3. **Within a month:** one pilot letter of intent and two or three named team members.
4. **When the Lab call opens:** you apply as a project already in DPG review (or approved), with a team and a pilot. That puts you at the front of the Pipeline.

### 2.2 Draft email to MoCTI (DPG Lead)

> **Subject:** Sierrafy, an open-source developer layer for NIN verification, for the DPG Pipeline
>
> Dear Ms Kallon,
>
> I'm Umaru Biango, a Sierra Leonean developer building Sierrafy, an MIT-licensed SDK that helps developers check NINs and eID documents in their apps, offline and without storing biometric data. NCRA built the national ID foundation; Sierrafy is the developer layer that makes it easier for startups, NGOs and agencies to use it.
>
> The first package is live on npm (`@sierrafy/sdk`), with documentation at docs.sierrafy.dev. We have applied to the global DPG Registry (application ID: ______).
>
> I'd be grateful to be considered for the national DPG Pipeline and to hear when the next DPG Accelerator Lab opens. I can share the architecture specification or give a short demo at your convenience.
>
> Kind regards,
> Umaru S. Biango · sierrafy.dev

---

## Part 3 — How the DPG Standard and Registry work

- **Current standard:** DPG Standard **v1.1.7** (latest changelog entry, 26 June 2025; the version line inside `standard.md` still reads 1.1.4, so go by the changelog). Nine indicators, with indicator 9 split into 9A, 9B and 9C. Licensed CC BY-SA 4.0.
- **Scope of review:** the design of the core solution only. Local deployments aren't assessed.
- **Process:**
  1. Take the online eligibility test (about five minutes).
  2. An **authorised representative** applies at app.digitalpublicgoods.net (email verification required).
  3. Everything in the application becomes public under the Unlicense. Your name and contact details stay private.
  4. Review is binary: **DPG** or **Ineligible**. Fail one indicator and the application is ineligible.
  5. The DPGA aims for a 30-day review, but its policy expects 4–8 weeks end to end.
  6. If reviewers ask for clarification and you don't reply in time, the application is automatically ineligible. Watch your inbox.
  7. DPG status lasts **one year**. A renewal application is generated 60 days before expiry; update it or it's resubmitted as-is.
- **Fees:** none mentioned.
- **Collections:** the **DPGs for DPI** collection (co-stewarded with Co-Develop and CDPI) lists Digital Identity, including ID verification and eKYC, as a core domain. Entry needs registry status first, plus extra criteria: published OpenAPI specs, at least one external integration, a `SECURITY.md` and vulnerability disclosure process, audit logging, and federated deployment. Treat this as the 2027 goal once the gateway ships.

---

## Part 4 — Sierrafy mapped to the DPG Standard (v1.1.7)

Assessment of what existed publicly on 25 October 2026, with the fixes applied on 26 October marked **Done**. It updates your earlier mapping (`Sierrafy_DPGA_Standard_Mapping_v1`): indicator 5 is met by the docs site; indicator 7 was open and is now closed by `PRIVACY.md`; the two gaps that were new (9C, and the future risk under 4) are both closed.

### Scoreboard

| # | Indicator | Status | Evidence now in the repository |
|---|---|---|---|
| 1 | SDG relevance | ✅ Met | Part 4, indicator 1 below |
| 2 | Open licensing | ✅ Met | `LICENSE` (MIT), `zone-maps/LICENSE` (CC0), npm metadata. Name form reconciled to "Umaru S. Biango" |
| 3 | Clear ownership | ✅ Met | README **Ownership** section, landing-page footer, `LICENSE` |
| 4 | Platform independence | ✅ Met | Spec §4.3.2 makes the face model pluggable with Apache-2.0 default weights; §8 licence rows corrected |
| 5 | Documentation | ✅ Met | docs.sierrafy.dev, README quick start, `CONTRIBUTING.md`, spec, `CHANGELOG.md` (`0.1.0` date corrected to 2026-10-22; `0.1.1` released 2026-10-27) |
| 6 | Data extraction | ✅ Met | Format schema, zone maps, results, all open JSON |
| 7 | Privacy and applicable laws | ✅ Met | `PRIVACY.md` and [docs.sierrafy.dev/privacy](https://docs.sierrafy.dev/privacy), with the laws list |
| 8 | Standards and best practices | ✅ Met | Part 4, indicator 8 below; CI, npm provenance, `check:pii` |
| 9A | Data privacy and security | ✅ Met | `PRIVACY.md`, `SECURITY.md`, `RESPONSIBLE_USE.md`; spec §4.4.1 keyed hash |
| 9B | Inappropriate and illegal content | ✅ Met | `RESPONSIBLE_USE.md` §6, issue templates |
| 9C | Protection from harassment | ✅ Met | `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1, named enforcement contact) |

Nothing on this board blocks submission any more. The remaining work is external: the application itself, the emails, contributors, and a pilot.

### Indicator 1 — SDG relevance ✅

Pick three SDGs and keep each answer specific:

- **SDG 16, target 16.9 (legal identity for all).** Sierra Leone has near-universal NIN registration. Sierrafy makes that legal identity usable in digital services by giving any developer free tools to check NINs and ID documents.
- **SDG 8, target 8.10 (access to financial services).** KYC is the gate to accounts, mobile money and credit. Cheaper document checks let small fintechs and microfinance institutions onboard customers with verified ID.
- **SDG 9, target 9.b (domestic technology development).** Open infrastructure built and maintained in Sierra Leone, reusable by local developers rather than imported.

### Indicator 2 — Open licensing ✅

- Evidence: [`LICENSE`](https://github.com/SUBiango/sierrafy/blob/main/LICENSE) (MIT, OSI-approved); npm metadata shows `"license": "MIT"`; zone maps under CC0 (`zone-maps/LICENSE`), also on the approved list.
- ✅ Done: `LICENSE` said "Umaru Biango" and the README said "Umaru S. Biango". Both now read **Umaru S. Biango**.

### Indicator 3 — Clear ownership ✅

- Owner: individual, Umaru S. Biango, based in Sierra Leone. Evidence: LICENSE copyright line, README licence section, npm maintainer.
- All code is yours. Dependencies are third-party open source under their own licences. Zone maps are derived measurements, not card images.
- ✅ Done: the README has an **Ownership** section stating that Sierrafy is owned and maintained by Umaru S. Biango, Sierra Leone, that the code is the maintainer's own work, and that the project is not affiliated with NCRA or MoCTI. The sierrafy.dev footer carries the same line.

### Indicator 4 — Platform independence ✅ today · ⚠️ future

- **Today's dependencies** (`@sierrafy/sdk`): Node.js ≥ 20, TypeScript, `fastest-levenshtein` (MIT); optional peers `tesseract.js` (Apache-2.0) and `sharp` (Apache-2.0, bundling LGPL libvips). All open.
- **The one closed component is optional:** Google Cloud Vision, off by default, behind `OCR_ENGINE=google-vision`. Tesseract is the open default. Answer "No mandatory closed components", and name Tesseract as the open alternative.
- ✅ **Fixed in the spec, before M4.** The spec named InsightFace `buffalo_l` as the face model. InsightFace's code is MIT, but its pretrained models, `buffalo_l` included, are released for non-commercial research only and need a separate licence from the authors for commercial use (confirmed against the project's own README, 26 October 2026). That is a mandatory dependency more restrictive than MIT, which this indicator treats as a closed component, and it would also stop fintechs using the face match commercially. What changed:
  - §4.3.2 makes the model a configuration value, `FACE_MODEL`, with a table of permitted models recording each one's **weights** licence, and a rule that adding a model means adding its weights licence.
  - The default is `sface`: SFace from OpenCV Zoo (`face_recognition_sface`), whose ONNX weights are published under Apache 2.0 (verified on the OpenCV Zoo model directory, 26 October 2026). `buffalo_l` stays selectable for benchmarking and is never the default.
  - §8 listed "InsightFace / DeepFace · MIT / Apache", implying the models were MIT. It now separates inference library, default weights, and alternative weights, each with its own licence.
  - §4.3.3's compose excerpt no longer pins `MODEL=insightface-buffalo-l`, and `.env.example`, the weekly breakdown, and `packages/face-engine/README.md` match.
  - New open question §12.6 gates M4 on two things: written confirmation of the default's weights licence, and a published accuracy measurement on Sierra Leonean faces.
- **Note for the mobile SDKs:** iOS NFC depends on Apple's CoreNFC. That's an OS framework with no open alternative on iOS, but the Android path uses the platform's open NFC API, so state it plainly in the application.

### Indicator 5 — Documentation ✅

- Evidence: [docs.sierrafy.dev](https://docs.sierrafy.dev) (Introduction, Install, NIN validation, Configuring the format, Document OCR, Scope, Versioning and stability); README quick start; `CONTRIBUTING.md` (development setup); architecture spec; `CHANGELOG.md`.
- The test is whether a technical stranger can launch and run it. For an SDK, `npm install` plus the quick start meets that.
- ✅ Done: `CHANGELOG.md` dated 0.1.0 to 27 September 2026 while npm showed 22 October 2026. It now reads `2026-10-22`, which matches both npm and the `v0.1.0` tag.
- When the gateway ships (M6), add a "Self-host with Docker" page.

### Indicator 6 — Mechanism for extracting data ✅

- Non-PII the solution uses or produces: NIN format schema (JSON), zone maps (JSON, CC0), verification results (JSON). All open formats.
- When the gateway and dashboard ship: verification results (30 days) and request metadata (90 days) will be stored. Add a documented JSON/CSV export endpoint at the same time.

### Indicator 7 — Privacy and applicable laws ✅

The application asks for (a) a list of laws and (b) **links** to a privacy policy, terms or similar. The only privacy text used to be a section of the Scope page.

**Laws to list** (worded as "designed to comply with / align with"):

- Constitution of Sierra Leone 1991, section 22 (privacy)
- ECOWAS Supplementary Act A/SA.1/01/10 on Personal Data Protection (2010)
- Telecommunications Act 2006
- Cyber Security and Crime Act 2021
- National Civil Registration Act 2016
- Designed to align with the forthcoming Data Protection and Right to Access Information Act (Cabinet-approved policy, April 2026; not yet enacted)
- GDPR principles (data minimisation, purpose limitation, storage limitation) as the design benchmark

**✅ Fixed.** [`PRIVACY.md`](../PRIVACY.md) is in the repository root and [`website/docs/privacy.md`](../website/docs/privacy.md) publishes the same statement at docs.sierrafy.dev/privacy, linked from the docs sidebar, the Scope page, the README, and the landing-page footer. Both cover all six required points:

1. ✅ What the SDK processes, field by field in a table, each row marked "Retained: No"
2. ✅ The no-telemetry, offline-by-default stance, with the reason it is verifiable
3. ✅ The Google Vision egress path, spelled out: the image leaves your infrastructure and leaves Sierra Leone, and the integrator becomes the party disclosing it abroad
4. ✅ Integrator obligations, six of them, including consent per spec §9.3 and the consent-logging utility
5. ✅ The laws list above, worded as "designed to comply with / align with", with the Data Protection Act marked as designed-for and not yet enacted
6. ✅ `hello@umarubiango.com`, plus a note that a person asking what an integrator holds about them must ask that integrator, because Sierrafy holds nothing

The statement also documents what changes when the gateway ships, including the §9.2 retention defaults and the keyed-hash caveat, so indicator 6's export promise and indicator 9A's retention answer agree with it.

The Sierra Leone lawyer review stays on the list as spec §12.5, now expanded to cover the Act once enacted. It is not a blocker for submission.

### Indicator 8 — Standards and best practices ✅

- **Open standards:** ICAO Doc 9303 (MRZ; LDS and PKI; BAC/PACE; passive authentication), ISO/IEC 7816-4 (APDU), ISO/IEC 14443 (contactless), ISO 8601 (dates), JSON Schema (format rules), Semantic Versioning 2.0, Keep a Changelog 1.1.
- **Best practices:** published to npm with **provenance** (SLSA v1 attestation, visible on npm); CI on every push and PR (lint, build, test); Dependabot; a PII guard script that keeps real card data out of the repo; synthetic test fixtures only; Principles for Digital Development (privacy and security, open standards, reuse, design with the local ecosystem).
- Add when the gateway ships: an OpenAPI 3.1 spec for `/v1/*`. That also counts toward the DPI collection later.

### Indicator 9A — Data privacy and security ✅

**Answer to select today:** "PII data can be collected but NOT stored and NOT distributed." Add a note that enabling the optional Google Vision engine transmits card images to Google.

**PII types:** NIN; full name; date of birth; document number; expiry date; ID card images including the portrait; selfie images; face embeddings (in memory only); NFC chip data groups DG1 and DG2 (planned).

**Protections already in the design:** memory-only processing of images and embeddings; no biometric persistence by design; no telemetry; offline by default; synthetic fixtures and a PII-check script in the repo; provenance-signed releases.

**✅ All three fixed.**

1. **Duplicate-NIN hash (spec §4.4.1).** Done. An unsalted SHA-256 of an 8-character A-Z/0-9 NIN has only about 2.8 trillion possible inputs, so a single consumer GPU reverses every hash in minutes and the stored hash is effectively the NIN. §4.4.1 now specifies **HMAC-SHA-256 with a per-deployment secret**, keeps the 24-hour purge, and adds three requirements: the key comes from `DUPLICATE_HASH_KEY`, the check refuses to run unkeyed rather than silently degrading, and the digest is documented as pseudonymised personal data excluded from exports. §7.2 and `.env.example` carry the new variable, §9.2's retention row says "keyed HMAC-SHA-256 digest ... pseudonymised personal data, not anonymous", and the M5 week in the weekly breakdown gains two tests: unkeyed refusal, and two keys producing two digests. `CONTRIBUTING.md` records "identifiers are never stored under an unkeyed hash" as an architectural constraint.
2. **[`SECURITY.md`](../SECURITY.md).** Done. GitHub private advisories as the primary route with email as a fallback, a response-time table (3 working days to acknowledge, 10 to assess, 30 for critical and high fixes, 90-day disclosure), the vulnerability classes that matter most here (any biometric byte reaching disk, a result claiming more than it should, an identifier leaking into a log, reversal of the keyed hash, supply-chain), what is out of scope (NCRA systems explicitly, plus documented behaviour and known OCR limits), supported versions, and the two deployment duties: terminate TLS, and set a unique `DUPLICATE_HASH_KEY`.
3. **[`RESPONSIBLE_USE.md`](../RESPONSIBLE_USE.md).** Done, covering all four themes:
   - **Exclusion:** people with no NIN, uncollected cards, and cards too damaged to read, who are over-represented among the remote and the displaced. Integrators must offer a documented non-automated path, staffed by someone who can say yes, and findable before the automated check fails.
   - **False rejects:** the published 20% offline OCR accuracy, and face recognition error rates that are worse for darker-skinned faces. Three rules: use a REVIEW band, never auto-reject on a face score alone, and measure the default model on Sierra Leonean faces before M4 ships, which is now a spec gate at §12.6.
   - **Over-trust:** `valid: true` means well formed, not registered, with the instruction not to describe a check as "NIN verified" to users, investors or a regulator.
   - **Misuse:** no bulk lookup, no enumeration, no surveillance, no one-to-many face search, no verification without consent, and no denial of a legal right on an automated result alone. The "not an NCRA product" disclaimer is its own section.

### Indicator 9B — Inappropriate and illegal content ✅

- **Answer:** "Content is collected but NOT stored and NOT distributed" (card images and selfies are processed transiently and never hosted).
- ✅ Done. `RESPONSIBLE_USE.md` §6 states that the project hosts no user-generated content at all, and commits to removing real ID images or personal data from issues, pull requests and discussions **within 48 hours** of the maintainer becoming aware, purged from git history where they reached a commit, citing the September 2026 scrub as precedent. It also points at `check:pii` as the forward-looking enforcement.
- ✅ Done. `.github/ISSUE_TEMPLATE/` has a bug report and a feature request, both opening with a "never attach a real identity document" warning and a **required** checkbox confirming the report contains only synthetic values, both pointing at the allowlist and the specimen card. `config.yml` disables blank issues and routes vulnerabilities, and reports of real ID data found in the repository, to private advisories.

### Indicator 9C — Protection from harassment ✅

- Contributors interact through GitHub issues and pull requests, so the answer is **Yes**, which requires a code of conduct.
- ✅ **Done.** [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) is the Contributor Covenant 2.1, verbatim, with the enforcement contact named (Umaru S. Biango, hello@umarubiango.com) and an acknowledgement commitment of 3 working days and resolution within 14 days. Linked from the README, from `CONTRIBUTING.md`'s "Before you start", and from spec §11.3.
- ✅ Done. A **Younger contributors** section states the three things plainly, because the DPG programmes recruit university and secondary-school students, some of whom will be under 18: the project collects no contributor personal data beyond what GitHub shows publicly, there are no private channels, and reports involving a minor go to the maintainer directly rather than a public issue.
- A second project-specific addition, **Identity documents and personal data**, makes posting a real document a Code of Conduct violation as well as a technical one, which is what ties 9B and 9C together.

---

## Part 5 — Draft answers for the DPG application form

Copy and adjust. Fields follow the DPGA's published question list.

- **Solution name:** Sierrafy
- **Category:** Open Software
- **Short description (tweet length):** Open-source, offline SDK that lets developers check Sierra Leonean NINs, eID cards and passports in their apps. Free to self-host; stores no biometric data.
- **Website:** https://sierrafy.dev · Docs: https://docs.sierrafy.dev
- **Source:** https://github.com/SUBiango/sierrafy · npm: https://www.npmjs.com/package/@sierrafy/sdk
- **SDGs:** 16 (16.9), 8 (8.10), 9 (9.b). Use the text in Part 4, indicator 1.
- **Licence:** MIT (code), CC0 (zone maps). Evidence: LICENSE and zone-maps/LICENSE links.
- **Owner:** Umaru S. Biango (individual), Sierra Leone. Evidence: LICENSE, README Ownership section.
- **Own all code?** Yes.
- **Core technologies:** TypeScript and Node.js ≥ 20; optional Tesseract.js and Sharp; planned Python FastAPI face service (pluggable model, default weights Apache 2.0), React Native and Flutter SDKs.
- **Closed components?** No mandatory ones. Google Cloud Vision is optional and off by default; Tesseract.js is the open default.
- **Documentation:** docs.sierrafy.dev; README; CONTRIBUTING.md; architecture spec.
- **Non-PII data?** Yes: format schema, zone maps and verification results, all JSON.
- **Laws:** the list in Part 4, indicator 7. Evidence: link to PRIVACY.md and the docs Privacy page.
- **Standards:** the list in Part 4, indicator 8. Evidence: CI workflow, npm provenance, CHANGELOG.
- **9A:** collected, not stored, not distributed. Types and protections as in Part 4. Evidence: PRIVACY.md, SECURITY.md, RESPONSIBLE_USE.md.
- **9B:** content collected, not stored, not distributed. Evidence: RESPONSIBLE_USE.md, issue template.
- **9C:** Yes. Evidence: CODE_OF_CONDUCT.md.
- **Deployed in:** Sierra Leone (early adopters; add the pilot when signed).
- **Programmes:** add "Sierra Leone DPG Pipeline" once MoCTI confirms intake.

---

## Part 6 — Action plan (pass/fail)

| Step | Task | Pass when | Status |
|---|---|---|---|
| 1 | Add `CODE_OF_CONDUCT.md`, `SECURITY.md`, `PRIVACY.md`, `RESPONSIBLE_USE.md`, README Ownership section, issue template with PII warning; add a Privacy page to the docs | All six files on `main`, each linked from README; docs Privacy page live | ✅ Written and linked, on `develop`. **Merge to `main`** so the raw.githubusercontent and docs.sierrafy.dev links a reviewer clicks actually resolve |
| 2 | Spec edits: delete the two NCRA price lines; NATCOM → NatCA; HMAC for duplicate NIN; pluggable face model with commercially usable default; fix §8 licence row; align the CHANGELOG date | `grep -i "USD"` on the spec returns nothing; §4.4.1 says HMAC; §4.3.2 names a configurable model | ✅ All six done; the three pass checks verified. Also fixed: `LICENSE` name form, the §11.1 repository tree, and "MIT (proposed)" in the spec metadata |
| 3 | Take the DPG eligibility test, then submit at app.digitalpublicgoods.net | Application ID received | ⬜ Next. Part 5 has the draft answers |
| 4 | Email MoCTI DPG Lead and Christex (draft in Part 2.2) | Both sent with application ID, spec and docs links | ⬜ After step 3 |
| 5 | Recruit two or three named contributors | Names in CONTRIBUTORS or the README | ⬜ The issue templates and `CODE_OF_CONDUCT.md` are now the recruiting surface |
| 6 | Secure a pilot letter of intent | Signed letter from at least one independent organisation | ⬜ |
| 7 | Respond to DPGA clarifications within 48 hours | No "Ineligible for non-response" | ⬜ Watch the inbox |
| 8 | Register interest with READY Salone; join the DPG Sierra Leone community forum | Confirmation emails received | ⬜ |

---

## Sources

**MoCTI DPG programme**
- [MoCTI Opportunities: National Digital Public Goods Accelerator](https://mocti.gov.sl/opportunities/)
- [UNICEF Sierra Leone: From Disaster to Digital Innovation (26 June 2026)](https://www.unicef.org/sierraleone/stories/disaster-digital-innovation-sierra-leones-youth-are-building-solutions-public-good)
- [MoCTI: Sierra Leone Embeds Digital Public Goods into University Curriculum (23 July 2026)](https://mocti.gov.sl/sierra-leone-embeds-digital-public-goods-into-university-curriculum/)
- [UNICEF job listing: DPG Technical Consultant, Freetown (seed funding reference)](https://jobs.unicef.org/en-us/job/585472)
- [MoCTI Directorate of Innovation](https://mocti.gov.sl/directorate-of-innovation/)
- [MoCTI on X: DPG Pipeline preview (15 January 2025)](https://x.com/MoCTI_SL/status/1879517871627481092)
- [UNICEF Innovation: Sierra Leone's Digital Revolution](https://www.unicef.org/innovation/stories/sierra-leones-digital-revolution)
- [MoCTI: National Dialogue on Digital Identity and DPI (5 August 2026)](https://mocti.gov.sl/sierra-leone-advances-national-dialogue-on-digital-identity-and-digital-public-infrastructure/)
- [Ecofin Agency: University training aligned with DPG standards](https://www.ecofinagency.com/news-services/3107-57911-sierra-leone-aligns-university-training-with-global-digital-standards-to-build-future-tech-talent)
- [MoCTI home page (news, NatCA, upcoming)](https://mocti.gov.sl/)

**Local doors**
- [ITC: READY Salone](https://www.intracen.org/our-work/projects/sierra-leone-empowering-youth-through-digital-technologies-ready-salone)
- [MoCTI: Sierra Leone Innovates, Big 5 Innovation Investment Challenge](https://mocti.gov.sl/innovation-series/)
- [UNDP: UniPod Sierra Leone launch](https://www.undp.org/sierra-leone/press-releases/where-sierra-leones-young-innovators-will-build-future-president-bio-open-unipod-sierra-leone)
- [Christex Foundation: BSL regulatory sandbox](https://www.christex.foundation/insight/all/sierra-leone-takes-strategic-steps-toward-web3-enabled-financial-innovation)
- [DevelopmentAid: SLIIF governance feasibility EOI](https://www.developmentaid.org/country-portal/sierra-leone)
- [Fundraising Dispatch: open funding opportunities, August 2026](https://www.fundraisingdispatch.com/p/open-funding-opportunities-august-2026)
- [DPG Sierra Leone community forum](https://dpg.discourse.group/t/introduce-yourself/205)

**DPG Standard and Registry**
- [DPG Standard](https://digitalpublicgoods.net/standard)
- [DPG Registry submission guide](https://www.digitalpublicgoods.net/submission-guide)
- [DPG Standard repository (standard, changelog, application questions, DPI collection)](https://github.com/DPGAlliance/DPG-Standard)
- [DPG Resources (review policy, platform-independence guide)](https://github.com/DPGAlliance/DPG-Resources)

**Law and licensing**
- [The Times Sierra Leone: Cabinet approves Data Protection Policy (April 2026)](https://thetimes-sierraleone.com/cabinet-approves-first-ever-data-protection-policy-paving-way-for-new-data-law/)
- [Passenger Data Explained: Sierra Leone data law status (21 October 2026)](https://passengerdataexplained.org/sierra-leone/)
- [MoICE: Pre-legislative session on the Data Protection bill (October 2025)](https://moice.gov.sl/ministry-of-information-holds-pre-legislative-session-on-draft-data-protection-and-right-to-access-information-bill/)
- [Data Protection Africa: Sierra Leone fact sheet](https://dataprotection.africa/sierra-leone/)
- [InsightFace on PyPI (model licence)](https://pypi.org/project/insightface/)

**Sierrafy**
- [sierrafy.dev](https://sierrafy.dev) · [docs.sierrafy.dev](https://docs.sierrafy.dev) · [GitHub](https://github.com/SUBiango/sierrafy) · [npm](https://www.npmjs.com/package/@sierrafy/sdk)
