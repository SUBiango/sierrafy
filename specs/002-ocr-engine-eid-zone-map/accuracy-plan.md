# M2 OCR accuracy plan

Status as of 2026-11-12. This is the follow-on to
[`plan.md`](plan.md) §4, which set the accuracy target and listed F1 to F4 as
future work. F2 is now done. This document records what it settled, corrects
what the earlier root-cause analysis got wrong, and sets out F1, F3 and F4 as
the actual plan.

Everything below was measured on the same 10 real eID fronts that calibrated the
zone map. The labelled images and their true NINs live in a gitignored directory
and are never committed, so this document reports counts and failure shapes
only, never an extracted value. See
[`scripts/check-sample-pii.mjs`](../../scripts/check-sample-pii.mjs).

## Where M2 stands

Offline Tesseract, the default engine, re-measured on 2026-11-12:

- **Exact NIN extraction: 2 of 10 (20%)**
- **Mean character accuracy: 58%**
- Target: 80% exact, so the gap is 6 samples.

That reproduces the figure recorded when the samples arrived, to the digit.

### What the failures actually are

The harness was extended to classify each miss rather than only count it:

| Shape | Count | Meaning |
| --- | --- | --- |
| Clean | 2 | Exact match |
| Substitution only | 3 | Right length, wrong characters, every one a known confusable pair |
| **Characters dropped** | **4** | Short by one or more, and **no** substitution errors at all |
| Mixed | 1 | Both |

Three of the four dropped-character cases are short by exactly one character.
The fourth returns two characters out of eight and is a badly degraded image.

**This corrects `plan.md` §4.** That section calls letter/digit confusion "the
dominant cause" and says "most misses are off by exactly one or two such
glyphs". By count that is not what is happening. Four of the eight failures
contain no substitution error at all; the recognizer is returning fewer
characters than the field holds. Confusion is real and is the second largest
bucket, but it is not the majority, and the distinction matters because the two
buckets have different fixes: confusion needs redundancy to resolve, dropped
characters need better glyph evidence.

## What F2 settled

**F2 is implemented and lands no accuracy change on this sample set.**

`normalizeCard` in
[`packages/core/src/ocr/normalize-card.ts`](../../packages/core/src/ocr/normalize-card.ts)
finds the card against its background, straightens it and crops to its edges, so
the zone map's relative coordinates land on the right text. It runs by default
and can be turned off with `ocr(image, { normalizeCard: false })`.

On the 10 samples it declines to act on all 10, so exact extraction and mean
character accuracy are unchanged at 2/10 and 58%. Five samples are declined
because the image is already cropped to the card, and five because the border is
not a uniform background.

That is the correct outcome, not a failure to try: **the sample set contains no
margin-padded photographs.** Aspect ratios run 1.531 to 1.637 against ID-1's
1.585, so the worst framing error in the set is about 3%. `plan.md` §4 names
samples 4, 7 and 8 as "phone/CamScanner shots (rotated, margin-padded)". They
are indeed the poorest captures, and they are indeed the ones that drop
characters, but the cause is not framing.

### Three wrong turns, recorded so they are not repeated

Each of these looked right and was measurably wrong. They are the reusable part
of this work.

1. **Detecting the print boundary instead of the card boundary.** The first
   version took the bounding box of gradient energy. Gradient energy starts
   where the *printing* starts, several percent inside the card edge, so on an
   image already cropped to the card it crops into the card and shifts every
   zone. Measured cost: exact extraction fell from **2/10 to 0/10** and mean
   character accuracy from 58% to 38%. Both previously clean samples broke.
   Detecting the background instead means an image with no background has
   nothing to detect, and the honest answer there is to do nothing.
2. **Testing "is this a card" against the axis-aligned bounding box.** A card
   silhouette fills its own box; scattered print does not, which is what
   separates a card on a desk from an already-cropped card whose uniform border
   is its own margin. But a rectangle fills only about 0.85 of its
   *axis-aligned* box at 3 degrees of tilt and 0.58 at 20, so that test rejects
   exactly the tilted cards the feature exists to serve. The test has to use the
   oriented box, which is rotation-invariant.
3. **Otsu's method for the background split.** Otsu is a two-class method and
   these distances are trimodal: background, card, print. On a light card with
   dark print it put the boundary between card and print, scoring 518 at
   threshold 110 against 488 at the correct threshold near 20, and reported 1%
   of the frame as card. The threshold has to come from the background's own
   tail, which is directly measurable from the border frame.

A fourth bug worth noting because it is easy to miss: `sharp.rotate()` fills new
corners with black by default, so deskewing made the second pass estimate black
as the background and invert the whole judgement. Rotation must be filled with
the detected background colour.

### Two null results from the same investigation

Both were cheap, both are worth not repeating.

- **Zone padding does not recover the dropped characters.** Sweeping the NIN
  zone's width from 0 to 0.08 of card width, with and without 0.02 of extra
  height, no configuration beats 2/10, and the short reads persist at every
  padding value. The characters are not being clipped by the box.
- **Page segmentation is already optimal.** `SINGLE_LINE`, which the engine
  uses, scores 2/10. `SPARSE_TEXT` scores 1/10. `SINGLE_BLOCK`, `SINGLE_WORD`
  and `RAW_LINE` all score 0/10.

Upscaling is already 4x, so the NIN zone reaches Tesseract at roughly 1200px
wide for an eight-character field. Taken together with F2 and the padding sweep,
**the offline configuration is at a local optimum.** The remaining failures are
limited by the glyph evidence in the source images and by the model's prior, not
by geometry or by configuration.

### Why F2 is still worth having

It is verified correct on drawn fixtures: a card on a uniform background, light
or dark, centred or offset, with tilt recovered to within 0.02 degrees across
plus or minus 12 degrees, and declining rather than cropping crooked beyond 20.
Those are the photographs a type-free or mobile capture flow will actually
produce, and the sample set does not contain any. On images like the ones we do
have it is a no-op, so it costs nothing to ship.

**One coupling to know before it is relied on.** The zone map was calibrated
against un-normalised images, so its coordinates have absorbed whatever small
margins those captures had. Sample 4 is the evidence: it is the one sample the
print-boundary version cropped, and cropping made its read worse rather than
better. Before normalisation can pay off, the zone map has to be re-measured on
normalised cards. That is a dependency of F3, since re-capturing is when it
would be done.

## The plan

### F1. Measure the Google Vision engine

**What.** Run the existing harness against `OCR_ENGINE=google-vision`. Engine
selection is already environment-driven and the engine is already wired and
unit-tested, so this needs no code change.

**Expected effect.** The architecture names this the accuracy-boost path, and a
commercial model is likely to beat generic `eng.traineddata` on both failure
buckets. Unmeasured, which is the point of F1.

**Preconditions.** A billed `GOOGLE_VISION_KEY`. And a decision that is not
technical: this transmits ten real Sierra Leonean ID cards to a third party.
Consent to calibrate zone coordinates locally is not consent to transmit the
images, and `PRIVACY.md` commits to Google Vision being a single opt-in egress
path. The project exercising that path on other people's documents deserves an
explicit decision rather than an environment variable.

**Exit criteria.** A recorded figure for the opt-in path, carrying the same
10-sample caveat as every other number here.

**Limits.** It raises accuracy only for deployments that opt in. The default
offline path, which is what a self-hosted gateway runs and what the project's
positioning rests on, is unchanged. F1 establishes a ceiling; it does not move
the default.

### F2. Card-boundary normalisation

Done. See above. No change on this set; retained for captures the set does not
contain; needs zone-map re-calibration before it can contribute.

### F3. Higher-resolution, flat captures

**What.** Re-capture the same cards flat, square-on and at higher resolution,
then re-run the harness.

**Expected effect.** The current set is roughly 1000x630, which puts the NIN
field at about 300 pixels for eight characters before upscaling. This is the
only lever that attacks the dropped-character bucket, which is the largest one.

**Preconditions.** Access to the same cardholders, with consent, or a new
consented set. This is also the opportunity to re-measure the zone map on
normalised cards, clearing F2's coupling.

**Exit criteria.** A capture-quality ceiling for offline Tesseract: what the
default engine can do when the input is good.

**Risk, and it is the important one.** A flatbed scan is not what a type-free
flow receives. Optimising against flat captures produces a number that real
phone users never see. F3's output is a diagnostic ceiling and must not become
the headline figure.

### F4. Checksum-assisted correction

**What.** If NCRA confirms a checksum, enumerate candidates across the
confusable positions and keep the one that validates. With one or two confusable
positions that is a handful of candidates.

**Expected effect.** It addresses the substitution bucket almost completely:
3 of the 8 current failures are substitution-only, and the mixed one has one
confusable position.

**Preconditions.** NCRA confirmation, which is not schedulable by this project.
The standing rule stands until then: the Luhn placeholder stays disabled,
because it runs over decimal digits and rejects all-letter NINs, one of the two
observed real shapes.

**Risk.** Treating it as a plan rather than a hope. The format has been
provisional since the first release. Also worth stating plainly: a checksum
narrows candidates, it does not confirm a person exists.

### A fifth option, not in the original list: fine-tune on the card's font

The substitutions come from a generic English model's prior, not from the ink.
The NIN sits in a fixed font at a fixed position on a standardised card, which is
close to the ideal case for a small glyph classifier or a Tesseract fine-tune.
It is the only lever fully within this project's control that attacks the
substitution bucket offline.

The honest caveat is data volume: ten cards is roughly eighty glyphs, which is
thin. It shares F3's precondition, since both need more consented samples, and
it is a larger piece of work than anything else on this list.

## The target is probably the wrong measurement

80% exact offline extraction was set before the verification flow was settled.
In the flow Sierrafy actually implements, the user types the NIN and OCR
confirms it, which makes **cross-check agreement** the number a consumer acts
on, not blind extraction. `plan.md` §4 already says as much in its closing note
without following the thought through.

Recommended: keep exact extraction as a diagnostic, and report cross-check
agreement as the headline metric. `RESPONSIBLE_USE.md` commits to publishing
known error rates, so whichever figure is published has to be the one that
describes the risk a deployment is taking. The harness measures exact extraction
only today, so this is a change to the harness as well as to the target.

## What hands-free verification actually needs

Raising offline accuracy does not make type-free verification safe, and it is
worth being precise about why.

An eight-character alphanumeric with no checksum carries no redundancy. Nothing
in the string can reject a wrong read. Better pixels lower the error rate; they
cannot verify the answer, and a type-free flow has no user to catch the miss. A
60% reader with no validator is not safer than a 20% reader with one; it is
differently wrong.

What unlocks it is a validator with redundancy, and there is one on the roadmap
already: **registry lookup**, the Phase 2 hand-off to NCRA's own service.
Submit the top candidates and the one that resolves is the answer. That is F4's
mechanism without needing the checksum algorithm, and it is strictly more
powerful, because it confirms the NIN is real rather than merely well-formed.
Two secondary signals are already in the zone map for the NFC layer,
`document_number` and `expiry`, with different lengths and formats and so
different failure modes; they can score candidates against a returned record.

**So hands-free belongs in the Phase 2 registry plan, not in this one.** The
accuracy work here is worth doing on its own merits, and it is not the thing
standing between Sierrafy and a type-free flow.

## Reproducing the measurement

```sh
pnpm -C packages/core build
node packages/core/scripts/measure-ocr-accuracy.mjs "eID samples"
```

The directory is gitignored and holds the labelled fronts plus a
`ground-truth.json`. Neither the images nor their NINs are ever committed, and
output that names extracted values should not be pasted into an issue, a commit
message or this repository. Report counts and failure shapes.
