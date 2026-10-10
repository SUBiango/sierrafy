# sierrafy.dev landing page: developer handoff

**Deliverable:** `index.html`, a single self-contained file of plain HTML, CSS and JS with no build step and no dependencies apart from Google Fonts.
**Design source:** the "Sierrafy Landing Page" design canvas (desktop artboard, 1440 px).
**Status:** ready to deploy once the TODO links are filled in (see §8).

---

## 1. Page structure

| # | Section | Anchor | Purpose |
|---|---|---|---|
| 1 | Nav | n/a | Brand, phase badge, How it works / Docs / Spec, theme toggle, GitHub button |
| 2 | Hero | n/a | Headline, sub-copy, install command, 2 CTAs, animated sample card and JSON response |
| 3 | Five checks | `#checks` | One row per verification layer, plus a greyed-out Phase 2 row and a CSCA note |
| 4 | Quickstart | `#quickstart` | Short copy, 3 ticks, tabbed code sample (JS / Python / PHP) |
| 5 | Footer | n/a | Licence, contribution line, links, independence disclaimer |

The page deliberately has no roadmap, contribute or "does / doesn't" sections. Don't add them back without checking with Umaru.

---

## 2. Design tokens

All tokens are CSS custom properties on `:root`.

### Colour

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0C110E` | Page background |
| `--surface` | `#0F1612` | Cards, check rows, code card, response panel |
| `--surface-2` | `#121A16` | Install box |
| `--surface-3` | `#17211C` | Inline code chips |
| `--border` / `-2` / `-3` | `#1E2A24` / `#24322B` / `#2E4037` | Dividers, card borders, ghost buttons |
| `--text` | `#E8EFEA` | Primary text |
| `--text-2` | `#B9C8BF` | Body copy |
| `--text-3` | `#9DB0A5` | Secondary copy |
| `--text-4` | `#7E9488` | Captions, meta (≥ 4.5:1 on `--bg`) |
| `--accent` | `#3DD68C` | Primary CTA, PASS, eyebrows, meters, scan line |
| `--accent-ink` | `#06140C` | Text on accent |
| `--blue` | `#6CB4F0` | JSON keys, links |
| `--amber` | `#E8B04B` | Numbers, in-progress state, "note" tag |
| `--red` | `#F07C6C` | FAIL, "NOT A REAL DOCUMENT" |
| `--card` / `--card-ink` / `--card-label` | `#EEF3EF` / `#13201A` / `#5B6E64` | Sample ID card face |

### Themes (dark default, light toggle)

The page loads in dark mode by default, matching the holding page. A sun/moon button in the nav switches theme. The choice is saved in `localStorage` (`sfy-theme`) and applied by a small inline script in `<head>` before first paint, so there's no flash on load. `<meta name="theme-color">` updates with the theme.

The light theme is the same set of tokens redefined under `[data-theme="light"]`. Every text colour is ≥ 4.5:1 on its background:

| Token | Light value |
|---|---|
| `--bg` / `--surface` / `--surface-3` | `#F5F8F6` / `#FFFFFF` / `#E5ECE7` |
| `--border` / `-2` / `-3` | `#DDE6E0` / `#D2DDD6` / `#BFCDC4` |
| `--text` / `-2` / `-3` / `-4` | `#0F1A14` / `#2E3D35` / `#45574D` / `#5A6D63` |
| `--accent` / `--accent-ink` | `#0F7743` / `#FFFFFF` |
| `--blue` / `--amber` / `--red` | `#1D6AAE` / `#9A6200` / `#B93A28` |

Two kinds of elements don't change with the theme:

- **Code surfaces:** the JSON response panel and the code card carry the class `.dark-island`, which re-declares the dark tokens locally, so code always renders on dark.
- **The sample ID card** uses fixed colours (`--card-*`, `--card-accent`), so it looks identical in both themes.

When adding new UI, use the tokens rather than hex values, or it won't follow the theme.

### Typography

| Role | Family | Weight | Size / line-height / tracking |
|---|---|---|---|
| H1 | Bricolage Grotesque | 700 | `clamp(40px, 5vw, 68px)` / 1.02 / -0.035em |
| H2 | Bricolage Grotesque | 700 | `clamp(32px, 3.4vw, 48px)` / 1.05 / -0.03em |
| Card / row titles | Bricolage Grotesque | 700 | 22px |
| Hero sub | IBM Plex Sans | 400 | 20px / 1.55 |
| Body | IBM Plex Sans | 400 | 16–17px / 1.55–1.6 |
| Eyebrows, code, endpoints, JSON | JetBrains Mono | 400–500 | 12–16px |

Fonts load from Google Fonts with `display=swap`. If you'd rather self-host, the three families are all OFL-licensed.

### Spacing and shape

- Content max-width 1440 px. Side gutter is `--gutter`: 80 px on desktop, 48 px at ≤ 1180 px, 20 px at ≤ 760 px.
- Section spacing is `--section-gap`: 128 px on desktop, 88 px on mobile.
- Radii: 16 px for cards and the check list, 14 px for the response panel, 10 px for the install box, 8 px for buttons, 18 px for the ID card.
- Buttons are 48 px tall (the GitHub nav button is 40 px). All interactive targets are at least 36–44 px.

---

## 3. Responsive behaviour

| Breakpoint | Changes |
|---|---|
| > 1180 px | Hero is two columns. Check rows use a 4-column grid: `80px · 320px · 1fr · 260px`. Quickstart uses `400px · 1fr`. |
| ≤ 1180 px | Hero stacks (visual below the copy). Check rows become 2 columns (number, then content stacked). Quickstart stacks. Section headers stack. |
| ≤ 760 px | Nav shows only the logo, theme toggle and GitHub. The sample card scales down to fit the column (JS `fitCard()`), and the scan status and response panel flow below it instead of overlapping. Check rows go to 1 column. The code filename is hidden and the code font drops to 13 px. The footer stacks. |

Tested at 1440 px and 390 px with no horizontal scroll.

---

## 4. Hero animation spec

The sample card is 540 × 340 px, rotated −1.5°. Zones are absolutely positioned (coordinates are in the CSS: `.f-surname`, `.photo` and so on).

**Loop:** 11 steps × 900 ms, about 9.9 s per cycle, repeating indefinitely.

| Step | Active zone | Scan-line `top` | Status text | JSON lines revealed |
|---|---|---|---|---|
| 0 | none | 60 px, hidden | `card detected` | `status: "SCANNING"` only |
| 1 | surname | 95 px | `reading surname…` | n/a |
| 2 | given names | 141 px | `reading given_names…` | n/a |
| 3 | NIN | 187 px | `reading nin…` | `name` |
| 4 | DOB | 233 px | `reading date_of_birth…` | `nin` |
| 5 | expiry | 233 px | `reading expiry…` | `dob` |
| 6 | photo | 160 px | `reading portrait → face match…` | n/a |
| 7 | chip | 97 px | `reading nfc chip · DG1 DG2 SOD…` | `face_match_score` |
| 8–10 | none (all done) | hidden | `verified in 980 ms` | `confidence_score`, `nfc_chip_read`, `fraud_signals`; status turns to `"PASS"` in green, header shows `200 · 980ms` |

**Zone states (CSS classes):**

- Idle: 1.5 px dashed border at `rgba(19,32,26,.18)`.
- `.is-active`: 2 px solid accent border, 22% accent fill, 4 px accent ring.
- `.is-done`: 1.5 px solid accent border at 90%.

**Transitions:** scan line `top` 0.55 s ease, opacity 0.3 s; zone styles 0.3 s; JSON lines fade from 0.25 to 1 opacity over 0.35 s.

**Performance and accessibility:**

- The loop runs only while the hero is in view (`IntersectionObserver`) and the tab is visible (`visibilitychange`).
- With `prefers-reduced-motion: reduce`, there's no loop. The page renders the finished PASS state statically.
- The card has `role="img"` and an `aria-label` describing it as a fictional sample. The scan status is `aria-hidden`. The JSON panel is real text.

---

## 5. Interactions

- **Copy button:** copies `pnpm add @sierrafy/sdk` via `navigator.clipboard`. For 1.6 s afterwards it shows accent colour and `aria-label="Copied"`.
- **Code tabs:** follow the WAI-ARIA tabs pattern (`role="tablist"`, `tab` and `tabpanel`, left and right arrow keys, roving `tabindex`). The filename label updates per tab. The JS tab is the default.
- **Skip link:** "Skip to content" appears on keyboard focus.
- **Smooth scroll:** used for in-page anchors, and disabled under reduced motion.

---

## 6. Content rules (please keep)

- **Sample data only:** the NIN is `K7M2QX4P` and the person is the fictional "Aminata Kamara". Never swap in a real card, real photo or real NIN.
- **The card is Sierrafy-branded on purpose.** It has no coat of arms, no "Republic of Sierra Leone" wording, no NCRA marks and no real card layout, and its MRZ uses `SFY` rather than a real country code. Keep the SPECIMEN watermark and the "NOT A REAL DOCUMENT" label.
- **NIN format:** 8 uppercase alphanumeric characters. The older `SL2019…` value is the card's Personal ID Number, not the NIN.
- **Honesty:** Phase 2 (live registry lookup) stays visibly "not in phase 1", and the CSCA note stays.
- **Framing:** Sierrafy complements NCRA. Don't add pricing comparisons or wording that sets it up as an alternative to NCRA.
- Keep the footer disclaimer ("independent open-source project, not an NCRA product").

---

## 7. SEO and meta

`<title>`, a description, basic Open Graph tags and `theme-color` are already in `<head>`. Still to add:

- [ ] `og:image` (1200 × 630). A static frame of the hero card in its PASS state works well.
- [ ] Favicon. The card-and-chip glyph from the logo works as an SVG favicon.
- [ ] `canonical` pointing at `https://sierrafy.dev/`.

---

## 8. TODOs before launch

Each of these is marked `<!-- TODO -->` in the HTML:

- [ ] GitHub repository URL (nav button and footer)
- [ ] Architecture spec URL (nav, hero CTA, footer)
- [ ] CONTRIBUTING.md URL (footer, twice)
- [ ] "Read the docs" currently scrolls to `#quickstart`. Point it at the docs site once it exists.
- [ ] Confirm package names (`@sierrafy/sdk`, `sierrafy` on PyPI, `sierrafy/sdk` on Composer) match what's actually published.

---

## 9. Deploy

It's a static file, so it works on any host (Netlify, Vercel, Cloudflare Pages or GitHub Pages). Put `index.html` at the site root of sierrafy.dev. Nothing needs building.
