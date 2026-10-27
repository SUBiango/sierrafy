# Responsible use

Identity verification decides who gets a bank account, a SIM card, a school
place, or a job. A tool that makes that decision cheaper also makes it cheaper
to get wrong, at scale, against the people least able to argue back.

This document is what the project asks of anyone who builds on it. Sierrafy is
MIT-licensed, so none of it is legally enforceable, and all of it is the
condition under which this tool is worth having.

The short version: **a Sierrafy result is evidence for a human decision, not a
verdict.**

## 1. Not everyone has a usable NIN

Sierra Leone's NIN coverage is high and it is not complete. Some people have
never registered. Some registered and never collected a card. Some hold a card
that has been through a rainy season in a back pocket and cannot be read by any
OCR engine. Newborns, people in remote chiefdoms, and people displaced from home
are over-represented in every one of those groups.

**If your product gates access on a Sierrafy check, you have built a wall around
those people.** So:

- Offer a documented path that does not depend on automated verification, staffed
  by a person with the authority to say yes.
- Make that path findable before someone fails the automated check, not only
  after.
- Treat a high failure rate for a particular district, age group, or document
  vintage as a bug in your onboarding, not as fraud in your users.

## 2. The checks make mistakes, and not evenly

Every layer has a known error rate, and we publish the embarrassing ones.

- **OCR.** Offline exact-NIN extraction is **20% accurate** on the measured
  sample, against a target of 80%. The cause is understood: an 8-character
  alphanumeric NIN with no checksum gives nothing to disambiguate `0` from `O`,
  `1` from `I`, or `5` from `S`. The OCR layer is experimental. Do not reject
  anyone because OCR disagreed with what they typed.
- **Face matching (M4, not yet shipped).** Face recognition accuracy varies by
  skin tone, lighting, camera, and age, and published error rates are
  consistently worse for darker-skinned faces, which in Sierra Leone means worse
  for nearly every user. Three rules follow:
  - Use a **REVIEW** band, not a binary pass/fail. A score near the threshold
    means a person looks at it.
  - **Never auto-reject on a face score alone.** A face score is one signal
    among several, and the weakest one.
  - The default model must be **evaluated on Sierra Leonean faces before M4
    ships**, and the measured accuracy published, the same way the OCR number
    is. A model that has not been measured locally does not get to be the
    default.
- **Fraud signals (M5, not yet shipped).** Error level analysis and recapture
  detection flag suspicion, not guilt. A flagged document means look closer. It
  does not mean the person in front of you is a fraudster, and it must never be
  presented to a reviewer as though it does.

Build the review queue before you build the rejection path. If you cannot afford
to review edge cases, you cannot afford to automate the decision.

## 3. `valid: true` does not mean "this person is registered"

Phase 1 is offline and structural. It never contacts NCRA.

A `valid: true` result means **the string is shaped like a NIN**. A well-formed
NIN that was never issued to anyone returns `valid: true`, because structural
validity is all that is being measured. The same holds for a document whose
fields are internally consistent: consistency is not registration.

Do not describe a Sierrafy check to your users, your investors, or a regulator
as confirmation of identity, as a registry check, or as "NIN verified". Live
registry lookup is Phase 2 and depends on an NCRA partnership. Until then, if
you need certainty that a person is registered, you need NCRA directly.

This is covered at length in [Scope](https://docs.sierrafy.dev/scope), and it is
the single most important thing to get right in your own copy.

## 4. Uses this project will not support

Sierrafy is built to help a person prove who they are to an organisation they
have chosen to deal with. These uses invert that, and the maintainer will refuse
help with them, decline the feature request, and say so publicly:

- **Bulk or batch lookup** of NINs that were not presented to you by the person
  they belong to.
- **Enumeration**, meaning generating or iterating candidate NINs to discover
  which ones are valid. The gateway rate-limits per API key specifically to make
  this expensive, and that limit is not there to be tuned away.
- **Surveillance**, tracking, or building a population register. That includes
  retaining verification records to profile people rather than to meet an audit
  obligation.
- **Face search**, meaning matching a face against a gallery of people to
  identify a stranger. Sierrafy does one-to-one comparison of a selfie against
  the portrait on the document the person just handed you. One-to-many
  identification is a different tool for a different purpose and this is not it.
- **Verification without consent**, including checking someone from a document
  image they did not knowingly provide for that purpose.
- **Any denial of a legal right or an essential service on an automated result
  alone.**

## 5. Not an NCRA product

Sierrafy is an independent open-source project. It is not affiliated with,
endorsed by, or operated by NCRA, MoCTI, or any Sierra Leonean government body.
NCRA built the national identity foundation and remains the authority on who is
registered. Sierrafy is the developer layer above it.

Do not imply otherwise in your product, your marketing, or your consent screens,
and do not use NCRA's name or marks to suggest an endorsement that does not
exist.

## 6. No user content is hosted here, and real ID data is removed on sight

The project hosts no user-generated content. There is no upload, no gallery, no
forum, and no media hosting of any kind. Card images and selfies passed to the
SDK are processed in memory and never stored, so there is nothing for anyone to
host, moderate, or leak.

The one place inappropriate content could appear is the GitHub repository
itself, if someone attaches a real identity document to an issue or a pull
request. The commitment on that is specific:

- **Real ID images or personal data posted to issues, pull requests, or
  discussions are removed within 48 hours of the maintainer becoming aware**,
  and purged from git history where they reached a commit, not merely deleted
  from the current tree. This has been done before: two real NINs reached a spec
  document as worked OCR examples and were scrubbed and purged from history on
  27 September 2026.
- **CI enforces it going forward.** `pnpm run check:pii` fails the build on any
  NIN-shaped literal that is not on the synthetic allowlist in
  [`scripts/allowed-id-literals.txt`](scripts/allowed-id-literals.txt), and on
  any tracked file inside a sample directory.
- **The issue templates warn about it** before anyone types, and the specimen
  card on [sierrafy.dev](https://sierrafy.dev) exists so that nobody needs a
  real one to file a bug.
- Content that is illegal, or that is someone else's personal data, is also a
  Code of Conduct matter:
  [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

If you spot real identity data anywhere in this repository, report it privately
through [`SECURITY.md`](SECURITY.md) rather than quoting it in a public issue.
Quoting it to report it spreads it.

## Related documents

- [`PRIVACY.md`](PRIVACY.md), what the SDK processes and what it never stores
- [`SECURITY.md`](SECURITY.md), how to report a vulnerability
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), how contributors treat each other
- [Scope](https://docs.sierrafy.dev/scope), what a result does and does not mean
