# Sifir Sprint

60s SPM times-tables race — KrackedDevs Sekolah Edition.

**The loop:** soalan → jawab → markah → streak → Try Lagi.

A 60-second jadual darab sprint. Questions are generated on the fly (1–12 × 1–12). Correct answers grow a streak; 3+ in a row doubles points. Misses show as betul · salah on Masa tamat.

## Play

Open **https://polah.app/sifir/**

## Run locally

```bash
npm install
npm run dev
```

Vite `base` is `/sifir/`, so open `http://localhost:5173/sifir/`.

```bash
npm run build
npm run preview
```

Preview is at `http://localhost:4173/sifir/`.

Optional short practice: `http://localhost:5173/sifir/?masa=15`

## Screens

1. **Play** — big 60s timer, soalan, number pad, live markah + streak
2. **Masa tamat** — terminal end screen: this-round markah, betul · salah; **Try Lagi** to replay

Mute sits in the top-right (alone on Masa tamat; with **Baru** during play). First visit starts with sound on; the first **Mula** tap (or a pad/key) unlocks audio and starts the BGM loop when mute is off. Preference is saved in `localStorage`.

After 60s: **Masa tamat!** **Try Lagi** starts a fresh round without a page reload. **Baru** (play only) leaves the round and returns to the title screen — press **Mula** for a fresh race.

## Ship

**Play URL:** **https://polah.app/sifir/** only. There is no production Vercel deployment for this repo.

| Layer | What happens |
| --- | --- |
| **Build & origin** | Push to `main` runs the `Deploy GitHub Pages` workflow (`.github/workflows/pages.yml`): `npm ci` → `npm run build` → `actions/deploy-pages` publishes `dist`. In repo settings, set Pages → Source to **GitHub Actions**. |
| **Vite `base`** | `/sifir/` in `vite.config.ts` — assets and router-less paths must stay aligned with the public path. |
| **Cloudflare (polah.app)** | Proxies `polah.app/sifir*` and rewrites to the GitHub Pages origin (`hafiy.my/sifir-sprint*`). Legacy `/sifir-sprint` redirects to `/sifir`. |

Old hosts (`hafiy.my`, `nazirulhafiy.github.io`) client-redirect to polah.app and keep path/query/hash.

Docs: [`AGENTS.md`](AGENTS.md), [`docs/design.md`](docs/design.md), [`docs/ci-docs-check.md`](docs/ci-docs-check.md) (PR **docs check** workflow).
