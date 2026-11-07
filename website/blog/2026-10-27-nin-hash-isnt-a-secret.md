---
slug: nin-hash-isnt-a-secret
title: "An 8-character NIN isn't a secret"
authors: [umaru]
tags: [build-log, security, privacy, spec]
date: 2026-10-27T00:30
---

**Build log #2 · Spec §4.4.1 · Fixed in the spec before any code shipped**

The architecture spec said the gateway would keep a SHA-256 hash of each NIN for 24 hours to catch duplicate submissions. "Hashed" sounds like "protected". For an 8-character NIN, it isn't. Here's the arithmetic, and what replaced it.

<!-- truncate -->

## What the spec said

One of Sierrafy's fraud signals is a duplicate-NIN check. If the same NIN shows up again and again in a short window, something is off: someone trying one stolen card against several accounts, or a script working through a list. To spot repeats, the gateway has to remember which NINs it has seen recently.

Storing NINs in plain text was obviously wrong. So spec v1.1 said: store `SHA-256(NIN)` instead, and purge it after 24 hours.

The problem was caught while reviewing the spec for the DPG Registry application, before any of the fraud-check code (milestone M5) existed.

## The number

A NIN is 8 characters, and each one is A–Z or 0–9. That's 36 options per position:

```
36^8 = 2,821,109,907,456
```

About 2.8 trillion possible NINs. That sounds like a lot. For a computer, it isn't.

SHA-256 is built to be fast. Take a deliberately conservative speed of 10 billion guesses per second, which is below what public benchmarks show for a single current gaming graphics card:

```
2.8 trillion guesses ÷ 10 billion per second ≈ 282 seconds
```

That's under five minutes to try every possible NIN. After that, every hash in the table maps straight back to the NIN it came from. Anyone who got hold of the table, from a leaked backup or a misconfigured server, would effectively have the NINs.

And 2.8 trillion is the upper limit. If the real format has extra rules (I'm still waiting on confirmation of the exact format), the space is smaller and the attack is faster.

An unkeyed hash of a small input isn't anonymisation. It's just a different encoding of the same data.

## What else I considered

**A random salt for each record.** This is the standard approach for passwords, and it breaks this feature. Duplicate detection needs the same NIN to produce the same value every time so the gateway can look it up. A different salt per record makes every value unique, so nothing ever matches.

**A slow hash (bcrypt or Argon2) with one fixed salt.** This makes brute force expensive, but every verification request pays that cost too. And a fixed salt usually sits next to the data it protects. If both leak, the attacker is slowed down, not stopped.

**Storing nothing and dropping the check.** This is an honest option. But the duplicate signal is cheap and genuinely useful to anyone onboarding people at volume, so I kept the check and made it safe instead.

## What I decided

**HMAC-SHA-256 with a secret key for each deployment.**

- The same NIN with the same key always gives the same value, so duplicate lookup still works.
- The key lives in the deployment's environment, not in the database. Someone with a leaked database but no key can't compute the value for a guessed NIN, so there's nothing to brute-force.
- Every self-hosted gateway has its own key, so values from one deployment can't be matched against another's.
- The check refuses to run without a key. There's no quiet fallback to a plain hash.
- The rolling 24-hour purge stays.

I also changed how the spec describes this data. A keyed NIN digest is **pseudonymised personal data**, not anonymous data. It stays covered by the privacy statement and is still deleted on schedule.

## What it cost

- **One more secret to manage.** Integrators set one extra environment
  variable, `DUPLICATE_HASH_KEY` (spec §7.2), and the gateway refuses to run
  the duplicate check without it.
- **Rotating the key resets the duplicate window,** because new values won't match old ones. Since the window is only 24 hours, rotating costs at most a day of missed duplicates. That's cheap enough to rotate whenever there's any doubt.
- **Losing the key has the same cost.** You lose up to 24 hours of duplicate history and nothing else.
- **No code changed,** because none had been written yet. This is the cheapest kind of mistake to fix, and the reason to put the spec in front of reviewers early.

## The takeaway

"Hashed" isn't a privacy guarantee on its own. What matters is how many possible inputs there are. National ID numbers, phone numbers and dates of birth are all small, structured spaces, and hashing them without a key protects almost nothing.

If you're building something in Sierra Leone that stores NINs, phone numbers or similar identifiers "hashed", check whether the hash is keyed.

---

- [Architecture spec §4.4.1: Fraud signal detection](https://github.com/SUBiango/sierrafy/blob/main/docs/architecture/Sierrafy_Architecture_v1.1.md)
- [PRIVACY.md](https://github.com/SUBiango/sierrafy/blob/main/PRIVACY.md)
