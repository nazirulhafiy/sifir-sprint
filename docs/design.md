# Design

Cartoon school-edition look: deep **navy** structure, warm **amber** (butter / gold) accents, cream boards, and a sky-to-peach gradient stage behind the playfield.

## Palette and type

| Token | Role |
| --- | --- |
| `navy` (`#16224a`) | Page background, play header bar, **Masa tamat** title band |
| `butter` / `gold` | Landing header, score card body, primary CTAs (`Mula`, `Try Lagi`), pad highlights |
| `cream` | Card surfaces, timer orb (normal), mute control |
| `gold` (accent on navy) | Play header kicker text |
| `ok` / `bad` | Correct / wrong flash; timer orb turns bad red at ≤10s |

Display font: **Fredoka** (with Bricolage Grotesk fallback). Numbers use tabular figures where scores and the timer are shown.

Decorative motion lives in [`src/CartoonBits.tsx`](../src/CartoonBits.tsx) and global stage styles in [`src/index.css`](../src/index.css) (`.sky-stage`, wonky borders, press states).

## Screens

### Play (`main`)

- Top: navy title strip (“Sifir Sprint”) + circular **Masa** timer (cream; urgent styling when low).
- Centre: large multiplication **soalan** and answer input with brief betul/salah flash feedback.
- Bottom: live **Markah** and **Streak** pills (×2 mata hint when streak ≥ 3).
- **Number pad** for digits, Padam, and Jawab; **Baru** returns to title without reloading.
- Mute toggle top-right (with **Baru** during play).

### Masa tamat (`tamat`)

End-of-round **score card** (`data-testid="masa-tamat"`):

1. Navy header: **Masa tamat!**
2. Butter panel: large **Markah**, then `N betul · M salah` (and **Sempurna!** when no misses).
3. Gold **Try Lagi** — starts a fresh round in-place.

Mute sits alone top-right on this screen.

### Title (`mula`)

Cream board with butter header, 60s / 1–12 summary, gold **Mula** CTA. First **Mula** (or pad/key) unlocks Web Audio when not muted.

## Layout check

`npm run layout-check` loads the production build (`vite preview` of `dist/`) in Chromium and WebKit. CI runs it from [`.github/workflows/layout-check.yml`](../.github/workflows/layout-check.yml) on pull requests. It does not deploy.

Viewports: **375×667**, **390×844**, **390×680**, **1280×800**. Each is checked in light and dark, on the title (`mula`), play, and **Masa tamat** screens.

The check fails when:

- the page has horizontal overflow (`scrollWidth` greater than `clientWidth` on the document)
- two `[data-box]` elements overlap (a box that contains another is not an overlap; boxes are border boxes)
- a `[data-box]` element is clipped: `scrollHeight` or `scrollWidth` is greater than its client box (by more than 1px) on an axis whose overflow is not `visible`, or a clipping ancestor cuts through its border box
- a `[data-one-line]` element wraps onto more than one line

`data-box` / `data-one-line` are only on the pieces that broke in the short-Safari fixes (question card clipped, `?` chip over the equation or over Markah/Streak). They do not change layout:

| Piece | Markers |
| --- | --- |
| Question card (`data-testid="soalan"`) | `data-box` |
| Equation / `?` stack (the column inside the card, the equation, and the `?` chip) | `data-box` on all three; `data-one-line` on the equation and the chip |
| Markah and Streak pills | `data-box` on each pill; `data-one-line` on each label |
| Masa timer | `data-box` on the orb; `data-one-line` on the seconds |

Play must render at least one `[data-box]`. Title and Masa tamat have none of these markers; those screens still fail on horizontal overflow.

## Sound

Implemented in [`src/audio.ts`](../src/audio.ts):

- **BGM:** short looping chiptune pattern after the user unlocks audio (first interaction).
- **SFX:** distinct tones for correct, wrong, and round end.
- **Mute:** `localStorage` key `sifir-sprint.bisu`; default unmuted on first visit.

BGM stops when the round ends; **Try Lagi** can start it again if sound is on.

## Scoring (player-visible)

- Correct answers add streak; at **3+** streak, points **double**.
- Wrong answers break streak and count toward salah on the tamat card.

Logic: [`src/game.ts`](../src/game.ts).

## Analytics

IDs, the internal cookie, and the Cloudflare `spa` flag live in [`data/analytics.json`](../data/analytics.json) (kit shape `version: 1`, same fields as the sarawak.news registry). [`scripts/analytics_loader.py`](../scripts/analytics_loader.py) renders **one** inline `<script data-sifir-analytics-loader>`. The Vite plugin in [`vite.config.ts`](../vite.config.ts) injects that script into `<head>` during `npm run build`, which is the Pages `dist/` this repo ships. [`scripts/check_analytics_dist.py`](../scripts/check_analytics_dist.py) fails the build when a page has zero loaders, two loaders, a GA4 id or CF token that is not in the registry, or a cookie name that is not the registry cookie.

| Field | Value |
| --- | --- |
| `version` | `1` |
| `internal_cookie` | `sifir_internal` |
| `spa` | `true` |
| Primary host | `polah.app` |
| `aliases` | `["www.polah.app"]` |
| `ga4_measurement_id` | `G-B3BZXWWDH9` |
| `cf_beacon_token` | `cd795175569a442ca30e7c08a6295f9f` |
| `legacy_internal_cookies` | `[]` |

Kept from this site, not copied from sarawak.news:

- **GA4** `G-B3BZXWWDH9` is the measurement id this repo already shipped in `index.html` (the shared polah.app property). The id did not change; only the loader around it did.
- **CF token** `cd795175569a442ca30e7c08a6295f9f` is the token Cloudflare already injects on `https://polah.app/sifir/` (`data-cf-beacon`). There was no token in the repo. The sarawak hub and bantuan tokens are different sites and were not copied.
- **Cookie** `sifir_internal` is new. This repo had no `?internal=1` cookie (the GA tag was unconditional, and the only query handling is the hafiy.my / github.io redirect, which already keeps `location.search`). `sn_internal` belongs to the sarawak.news kit, not to polah.app, so it was not reused. `legacy_internal_cookies` is empty because there is no older name to honour.

Loader behaviour:

1. **Production host gate** — runs only when `location.hostname` is `polah.app` or `www.polah.app`. It does not load on localhost, `hafiy.my`, `*.github.io`, or preview hosts. The old unconditional gtag tag in `index.html` is gone.
2. **`?internal=1`** — sets `sifir_internal=1` (`path=/`, `max-age=31536000`, `SameSite=Lax`, plus `Secure` on HTTPS). `?internal=0` clears that cookie (and any future `legacy_internal_cookies` name). While the cookie is `=1`, `gtag('config', 'G-B3BZXWWDH9', { traffic_type: 'internal' })` and this loader does not add the Cloudflare beacon. Agents opening the live site use `?internal=1` (see `AGENTS.md`). The hafiy.my redirect still forwards the query string, so `?internal=1` survives the hop to polah.app.
3. **Google Analytics 4** — id from the registry, loaded after the host gate.
4. **Cloudflare Web Analytics** — the loader embeds the same zone token the edge already injects, with `spa: true` (this app is one Vite page; the edge snippet uses `spa: 2`, which is not the kit’s boolean). On polah.app the zone’s auto-install still appends its own beacon at the end of `<body>`. That second beacon is outside this repo (the proxy worker is not here). Until auto-install is turned off for this path, production can load the beacon twice; `?internal=1` skips only the loader’s copy.

CI: `python3 scripts/check_analytics_dist.py` runs in `.github/workflows/analytics-dist.yml` on pull requests (build + check, no deploy) and in the `build` job of `.github/workflows/pages.yml` after `npm run build`, before the Pages artifact upload.

No Content-Security-Policy is set; if one is added, allow `www.googletagmanager.com`, `*.google-analytics.com`, and `static.cloudflareinsights.com`.
