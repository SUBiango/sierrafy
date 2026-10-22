---
id: scope
title: Scope
---

# What Sierrafy does and does not do

Read this before building on Sierrafy. It is the difference between a check that
means something and one that does not.

## It does not contact NCRA

Phase 1 is entirely offline. Nothing in this SDK queries the national registry,
so **it cannot tell you that a NIN is registered, active, or belongs to anyone**.

A `valid: true` result means the string is shaped like a NIN. A well-formed NIN
that was never issued still returns `valid: true`, because structural validity is
all that is being measured.

Live registry lookup is Phase 2, and it depends on a partnership with NCRA. When
it arrives it will be a hand-off to NCRA's own service, not a copy of their data.

**NCRA remains the authority. Sierrafy is the developer layer that sits above
it.**

## What that means for your product

Use the format check to reject typos before they cost you anything, such as
before an upload, a manual review, or a paid lookup. Do not use it as proof of
identity on its own.

If you need certainty that a person is who they claim to be, Phase 1 gets you
part of the way: the document is well formed, the data on it is internally
consistent, and in later milestones the face matches and the chip is
cryptographically sound. Registry confirmation is a separate question, and today
it needs NCRA directly.

## The format is an inference

The NIN format was derived from real eID cards, not from NCRA documentation. The
exact character set and whether a checksum exists are unconfirmed. See
[Configuring the format](./configuring-the-format.md) for how to correct it
yourself if you have better information, and please
[open an issue](https://github.com/SUBiango/sierrafy/issues) if you do.

## Privacy

No biometric data is persisted anywhere, by design rather than by configuration.
Face images and embeddings are processed in memory and discarded once a score is
produced. There is no telemetry, and the default OCR engine makes no outbound
network call.

The one exception is opt-in and explicit: setting `OCR_ENGINE=google-vision`
sends card images to Google Cloud Vision. That is the only egress path in the
system.

## Not an NCRA product

Sierrafy is an independent open-source project. It is not affiliated with,
endorsed by, or operated by NCRA.
