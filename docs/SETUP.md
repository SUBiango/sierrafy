# Setup & Deployment Guide

How to turn this folder into a proper open-source repository and deploy the
landing page to Netlify — before you start building the SDK.

This guide assumes you're on macOS (the project's current environment) and
comfortable in the terminal. Commands that need an interactive login are
marked **(interactive)**; run those yourself.

---

## 0. What's already here

These files have been scaffolded for you, so the steps below mostly wire them up:

| File | Purpose |
|---|---|
| `README.md` | Project front page |
| `LICENSE` | MIT license |
| `CONTRIBUTING.md` | Contributor guide |
| `.gitignore` | Ignores OS files, secrets, future build artifacts |
| `netlify.toml` | Netlify config (publish root, security headers) |
| `CLAUDE.md` | Guidance for Claude Code |

You provide: a GitHub account and a Netlify account (both have free tiers).

---

## 1. Prerequisites

- **Git** — check with `git --version`. macOS prompts to install if missing.
- **GitHub CLI** (optional but easiest) — `brew install gh`, then `gh auth login` **(interactive)**.
- **Netlify CLI** (optional, for command-line deploys) — `npm i -g netlify-cli`, then `netlify login` **(interactive)**.

You can do everything through the GitHub and Netlify web UIs instead of the CLIs if you prefer.

---

## 2. Initialize the git repository

From the project root (`/Users/umarubiango/Apps/sierrafy`):

```bash
git init -b main
git add .
git commit -m "Initial commit: landing page, architecture spec, OSS scaffolding"
```

Verify `.DS_Store` was *not* committed (it's in `.gitignore`):

```bash
git status --ignored
```

---

## 3. Create the GitHub repository and push

**Option A — GitHub CLI (recommended):**

```bash
gh repo create sierrafy --public --source=. --remote=origin --push \
  --description "Open-source NIN verification SDK for Sierra Leone"
```

**Option B — Web UI:**

1. Create a new **public** repo named `sierrafy` at <https://github.com/new>. Do **not** initialize it with a README/license (you already have them).
2. Connect and push:

```bash
git remote add origin https://github.com/<your-username>/sierrafy.git
git push -u origin main
```

After pushing, update the placeholder GitHub link in `index.html` (the "Watch on GitHub" anchor, currently `https://github.com`) to point at your repo, then commit and push that change.

---

## 4. Deploy to Netlify

### Option A — Git-connected continuous deploy (recommended)

This redeploys automatically on every push to `main`.

1. Go to <https://app.netlify.com> → **Add new site** → **Import an existing project**.
2. Authorize GitHub and pick the `sierrafy` repo.
3. Netlify reads `netlify.toml`, so the build settings are already correct:
   - **Build command:** *(empty)*
   - **Publish directory:** `.`
4. Click **Deploy**. Your site goes live at a random `*.netlify.app` URL.

### Option B — Netlify CLI

```bash
netlify login        # (interactive)
netlify init         # link this repo to a new/existing Netlify site
netlify deploy --prod   # publishes the current directory
```

### Option C — Drag and drop (quickest one-off, no Git)

Drag the project folder onto <https://app.netlify.com/drop>. Fine for a quick
preview, but you lose continuous deploys — prefer Option A for the real site.

---

## 5. Rename the site and (optionally) add your domain

1. In Netlify: **Site configuration → Change site name** to get `sierrafy.netlify.app` (if available).
2. To use `sierrafy.dev`: **Domain management → Add a custom domain**, enter `sierrafy.dev`, and follow Netlify's DNS instructions — either point your registrar's nameservers at Netlify DNS, or add the `A`/`CNAME` records Netlify shows you. HTTPS is provisioned automatically via Let's Encrypt once DNS resolves.
3. Update the wordmark/links in `index.html` and the `Authorization`/contact details as needed once the domain is live.

---

## 6. Optional: capture launch emails with Netlify Forms

The "Notify me at launch" form currently only shows a toast — it doesn't store
anything. Netlify Forms can collect submissions for free with no backend:

1. In `index.html`, give the form a real `<form>` element with `name="notify"` and the `netlify` attribute, e.g.:

   ```html
   <form name="notify" method="POST" data-netlify="true" class="input-wrap">
     <input type="email" name="email" placeholder="your@email.com" required>
     <button type="submit">Notify me at launch</button>
   </form>
   ```

2. Add a hidden `<input type="hidden" name="form-name" value="notify">` inside the form (Netlify needs this).
3. Submissions appear under **Forms** in the Netlify dashboard; set up email notifications there.

(Keep the current JS toast as progressive enhancement if you like, or remove the `onclick` handler since the form now posts natively.)

---

## 7. Recommended repo hygiene (after first deploy)

- **Branch protection:** GitHub → Settings → Branches → protect `main` (require PRs once you have collaborators).
- **Topics:** add repo topics like `sierra-leone`, `identity-verification`, `kyc`, `nin`, `open-source` for discoverability.
- **Deploy badge:** add the Netlify status badge (Site configuration → Status badges) to the top of `README.md`.
- **Issue templates / CODE_OF_CONDUCT:** add a Contributor Covenant `CODE_OF_CONDUCT.md` and `.github/ISSUE_TEMPLATE/` when you open the project to contributors.

---

## Quick reference

```bash
# One-time setup
git init -b main && git add . && git commit -m "Initial commit"
gh repo create sierrafy --public --source=. --remote=origin --push

# Everyday workflow (auto-deploys via Netlify after step 4A)
git add -A
git commit -m "Describe your change"
git push
```
