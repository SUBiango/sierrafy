---
slug: a-permission-rule-cant-see-the-branch
title: "A permission rule can't see the branch"
authors: [umaru]
tags: [build-log, release, security]
date: 2026-11-12
---

**Build log #4 · Release process · Gate added, verified on six command shapes**

Merging a pull request into `develop` is bookkeeping. Merging one into `main` deploys two websites. Both are the same command, `gh pr merge <n>`, and a permission rule that allows one allows the other. Here is what that cost and what replaced it.

<!-- truncate -->

## What the publish path is

The runbook is one line:

```
feature branch  ->  PR  ->  develop  ->  release PR  ->  main  ->  tag  ->  npm
```

Two of those steps publish something.

Merging into `main` deploys both sites, because `main` is the production branch for sierrafy.dev and docs.sierrafy.dev. It goes live in about a minute.

Pushing a `v*.*.*` tag runs `release.yml`, which re-runs every gate, checks the tarball, installs it as a consumer would, and stages the package on npm.

The npm step already had a human in it. The tag does not publish; it stages, and a maintainer approves the staged version with a 2FA challenge. That was a deliberate decision, written up in `docs/development/supply-chain.md`: provenance proves where a build came from, not that it was clean, so a person holding a hardware key is the last gate a compromised pipeline cannot pass.

The site deploys had no gate at all.

## How the rule got too wide

I use Claude Code on this repo. It opens pull requests, watches CI and merges them. For a while every `gh pr merge` was refused, including merges into `develop` that only move work already reviewed on the way in. So I added two permission rules:

```
Bash(gh pr merge *)
Bash(git push *)
```

The interruptions stopped. So did the gate on publishing, in the same change, because the rule matches the text of the command, and the text does not contain the fact that matters. `gh pr merge 43` goes to `develop`. `gh pr merge 44` goes to `main` and deploys two websites. Identical shape.

On 9 November three pull requests merged into `main` inside 43 minutes: #40 at 10:06, #42 at 10:44, #44 at 10:49. I merged #40 by hand, before the rules existed. The other two went through on the broad rule. Nothing broke. None of them needed to be fast, either.

One detail I had not thought about: GitHub records all three as merged by me, because the agent uses my token. The audit trail cannot tell the difference between a merge I decided on and one I did not see.

## What else I considered

**Delete both rules.** Back to every merge and every push asking first, feature branches included. That is the state I had just paid to get out of, and most of those prompts guard nothing. Noise that is always ignored is not a gate.

**Branch protection on GitHub.** Required reviews on `main` would stop this at the server, for every client, every machine and every contributor. It is the right answer. It does not solve today: I am the only maintainer, so a required review is one I approve myself, and the two branches turn out not to be protected at all. `RELEASING.md` has said they "should be" for weeks. Writing it down is not configuring it.

**Prompt instead of block.** A hook that asks, so I can approve in the moment and keep publishing in one flow. This was my first attempt. It does not work, and the reason is the useful part of this entry.

## The mistake

The first version of the hook returned `"ask"`. It fired, matched the command, and the command ran anyway.

I found out by running a real `git push origin main --dry-run` and watching it go through. The unit test had passed: I piped a fake payload into the script and it printed the right JSON. The script was correct and the design was inert.

An explicit `allow` rule outranks a hook that says "ask". Only `"deny"` overrides an `allow`. The gentler option was not available, and nothing short of exercising the actual permission system would have shown me that. Testing a component against its own inputs tells you the component works. It does not tell you the system does anything.

## What I decided

A pre-execution hook that reads the command, resolves the pull request's base branch with `gh pr view --json baseRefName`, and blocks when the answer is `main`. It blocks direct pushes to `main` and `v*.*.*` tag pushes too.

| Action | Result |
| --- | --- |
| `gh pr merge <n>`, base `develop` | runs, no prompt |
| `gh pr merge <n>`, base `main` | blocked |
| `gh pr merge <n>`, base unreadable | blocked |
| `git push <feature-branch>` | runs, no prompt |
| `git push origin main` | blocked |
| `git push origin v0.1.2`, `--tags`, `--follow-tags` | blocked |

It fails closed. If `gh` cannot answer, the hook assumes the worst and blocks, so losing the network cannot quietly switch the gate off.

I tested all six rows against the live permission system, not against a piped payload.

## What it cost

- **The publish step is manual again.** One command per release, typed by me. That is the whole point, but it is a real cost: the agent now stops at a green release PR and hands it back.
- **There is no approving it in the moment.** A block is final for that call. "Ask" was the version I wanted and the version that did nothing.
- **Fail-closed has a false-positive case.** A network problem blocks `develop` merges too, which are harmless.
- **It protects one laptop.** The hook lives in my own agent configuration, outside the repository. A second machine has no gate, and neither would a contributor with push access. This is not branch protection and it should not be mistaken for it.

## What is still open

Protecting `main` and `develop` on GitHub, with the `Node (lint + build + test)` and `Python (pytest)` checks required and force-pushes off. That is the control that holds regardless of which client is driving. The hook is a stopgap on the machine that does the work, and it is worth having today, but the entry would be dishonest if it read as a fix.

## The takeaway

An allowlist matches a string. Before trusting one, it is worth asking whether the string contains the thing that makes the action safe or unsafe. For `gh pr merge 44` it does not. The destination is in GitHub's database, not in the command, so no pattern over the command text can ever distinguish a deploy from a no-op.

That is not specific to agents. Any rule that approves commands by shape has this hole, including the ones in a CI config or a sudoers file.

---

- [RELEASING.md](https://github.com/SUBiango/sierrafy/blob/main/RELEASING.md)
- [docs/development/supply-chain.md](https://github.com/SUBiango/sierrafy/blob/main/docs/development/supply-chain.md)
- [.github/workflows/release.yml](https://github.com/SUBiango/sierrafy/blob/main/.github/workflows/release.yml)
