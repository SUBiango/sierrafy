---
slug: checksum-stays-off
title: 'A checksum that would reject real NINs'
authors: [umaru]
tags: [build-log, validator, spec, testing]
date: 2026-09-27
---

**Build log #1 · NIN validator (M1) · Wired, disabled, and pinned by a test**

The NIN validator has a checksum check. It is implemented, tested, documented,
and switched off, and it will stay off until NCRA confirms an algorithm. A
checksum looks like free validation: a few lines of arithmetic that catch typos
with no network call. This one would have rejected one of the two real NIN
shapes I have seen.

<!-- truncate -->

## What the spec said

A check digit is the cheapest validation there is. Type one character of a bank
card wrong and the form tells you before it talks to a bank. Sierrafy wants the
same thing for a NIN: catch the transposed character offline, in the browser,
before anything reaches a gateway.

So the validator was built with four checks, in precedence order: length,
charset, checksum, blocklist. Luhn went in as the algorithm, because Luhn is the
mod-10 formula behind card numbers and IMEIs and it is twenty lines long. The
spec said what every spec says in this situation: flip `checksum.enabled` once
confirmed.

Nobody had confirmed anything. NCRA has not published the NIN format, and the
format Sierrafy validates was read off real eID cards rather than out of
documentation.

## The problem

A NIN is 8 characters drawn from `A-Z` and `0-9`. Luhn is defined over decimal
digits. Those two facts do not fit together, and the implementation papered over
the gap by extracting the digits first and running Luhn on whatever came out.

Here is what that does. The sample cards produced two legible NINs: one all
letters, one mixing letters and digits. Probed against the implementation with
`checksum.enabled: true`:

| Input | Shape | Result |
|---|---|---|
| `QWERTYUI` | all letters, the observed shape | `INVALID_CHECKSUM` |
| `ASDFGHJK` | all letters | `INVALID_CHECKSUM` |
| `9F8E7D6C` | digits present, last character a letter | `INVALID_CHECKSUM` |
| `QWERTYU0` | one trailing digit | passes |

An all-letter NIN extracts to an empty string, and `luhnIsValid('')` is `false`
by design. So the moment anyone followed the spec's own instruction and flipped
the flag, every all-letter NIN became invalid.

The size of that class is easy to work out. The whole space is:

```
36^8 = 2,821,109,907,456     all 8-character NINs
26^8 =   208,827,064,576     the all-letter ones
```

That is 7.4% of the space rejected outright, and of the rest only about one in
ten satisfies a mod-10 sum, so enabling Luhn would have accepted roughly 9% of
structurally valid NINs and rejected the other 91%.

There was a second defect underneath the first. The helper's own comment said it
treated "the trailing digit as the check digit". It does not. It takes the last
digit it *extracted*, so for `9F8E7D6C` the digits are `9876` and the check
position is the sixth character, not the eighth. The comment described an
algorithm nobody had implemented, which is how a placeholder starts looking like
a decision.

Both came out of today's implementation review of the module: two of ten
findings against code small enough to read in a sitting.

## What else I considered

**Delete the Luhn code.** The strongest argument against keeping it is exactly
what happened: dead code that looks live is a trap. But the thing worth keeping
is not Luhn, it is the wiring around it: the schema flag, the position in the
precedence order, the `INVALID_CHECKSUM` error code, the result field. Those are
what a confirmed algorithm will drop into. Removing the only wired algorithm
would leave an empty slot that nothing exercises, and an untested slot is worse
than a tested placeholder.

**Work the algorithm out from the samples.** Two NINs cannot distinguish between
"no check digit", "mod 10 over a weighting I have not guessed", and a few dozen
other candidates. Recovering a check-digit scheme empirically needs a large set
of known-valid identifiers, and the only way to get one is to collect real NINs.
Sierrafy does not keep real ID samples in the repository and is not going to
start gathering NINs to reverse-engineer a formula.

**Default to ISO 7064 mod 37,36 instead.** This is the right *shape* of
algorithm: it is a standard, and unlike Luhn it is defined over alphanumeric
strings, so it would not single out all-letter NINs. It is still a guess. If the
real format carries no check character, imposing a mod-36 check accepts 1 in 36
of all valid NINs and rejects about 97% of them. A plausible wrong algorithm is
more dangerous than an obviously wrong one, because it fails quietly and in a
pattern nobody can see.

**Make `enabled: true` throw while Luhn is the only algorithm.** Tempting, and I
decided against it. The central design promise of this validator is that the
format lives in editable JSON, so anyone who learns the real rules can correct
Sierrafy's behaviour without waiting for a release. Hard-blocking the flag would
make that promise false for the one field most likely to change. The flag stays
usable, and the trap around it is documented and pinned by a test instead.

## What I decided

**Luhn stays wired, stays off, and says so everywhere someone might look.**

- `checksum.enabled` is `false` in the bundled schema, and disabled means
  *skipped*: `checks.checksum` reports `true` and the check never runs.
- The warning sits in five places, because people arrive from different
  directions: the `luhn.ts` module comment, the `NinFormatSchema.checksum` type,
  the `description` field inside `nin-format.json` itself, spec §3 as a
  blockquote, and the package README. Whoever is about to flip the flag reads at
  least one of them.
- A test pins the behaviour: with Luhn enabled, all-letter NINs return
  `INVALID_CHECKSUM`, and with the default schema the same values are valid. It
  carries a comment saying it exists to make anyone flipping the default fail
  loudly, not to bless the behaviour. It is a tripwire, not an assertion that
  this is correct.
- An unrecognised algorithm now fails closed. Before the review, a schema with
  `enabled: true` and a typo in the algorithm name returned `valid: true` with
  `checks.checksum: true` for every input, which is the worst possible outcome
  in a validator: a check reported as passing that was never performed. The list
  of known algorithms is now one constant that both the type and the runtime
  read, the schema validator rejects anything else at load time, and the
  dispatch returns `false` rather than `true` for an unhandled case.
- The comment on the helper now describes the arithmetic it actually performs.

## What it cost

- **Two functions of dead weight in the published package.** `luhnIsValid` and
  `extractDigits` are exported and tested, and nothing in the default path calls
  them. That is the price of keeping the slot warm.
- **An ambiguous field in the result.** `checks.checksum: true` means either
  "passed" or "not run", and a caller cannot tell which without reading the
  schema. The alternative was a tri-state, which complicates the result shape of
  every check for the benefit of one. Documented rather than fixed.
- **The real cost is in the OCR layer, not this one.** Offline OCR extracts the
  NIN exactly on 20% of the sample cards, against a target of 80%, measured on
  ten real samples. The reason is the missing checksum: an 8-character
  alphanumeric with no redundancy gives the recogniser nothing to check itself
  against, so there is no way to resolve `0` against `O`, `1` against `I`, or
  `5` against `S`. A confirmed check character would let OCR score its candidate
  readings and pick the one that validates. Instead the layer ships marked
  experimental.

## What's still open

The algorithm is still unconfirmed, and this entry will be out of date the day
NCRA publishes a format. If the real scheme turns out to be ISO 7064 mod 37,36
or anything like it, wiring it is an afternoon: add it to the algorithm
constant, implement it beside Luhn, flip the flag in the schema. The test that
currently pins the all-letter rejection will fail at that point, which is
exactly what it is for.

Until then the honest position is the one now written into the spec and the
schema file: no checksum is enforced, and one layer of validation that most ID
systems get for free is simply absent here. It belongs in the release notes too,
whenever the first release goes out.

## The takeaway

An unverified validation rule is not a conservative default. It feels like one,
because the failure mode is a rejection rather than an acceptance, and rejecting
sounds like the safe direction. It is not. A false reject is a person told their
own ID number is wrong, usually with no way to argue, and the error will look
like their mistake rather than mine.

If you cannot test a rule against reality, do not enforce it. Wire it, document
why it is off, and leave a test that trips when someone turns it on.

---

- [Spec: NIN format validator, §3 design decisions](https://github.com/SUBiango/sierrafy/blob/main/specs/001-nin-format-validator/nin-format-validator.md)
- [Implementation review, findings 3 and 4](https://github.com/SUBiango/sierrafy/blob/main/specs/001-nin-format-validator/review.md)
- [Docs: Configuring the format](https://docs.sierrafy.dev/configuring-the-format)
- [The format schema itself](https://github.com/SUBiango/sierrafy/blob/main/packages/core/src/schema/nin-format.json)
