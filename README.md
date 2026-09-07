# Sifir Sprint

60s SPM times-tables race — KrackedDevs Sekolah Edition.

**The loop:** soalan → jawab → markah → streak → lagi satu.

A 60-second jadual darab sprint. Questions are generated on the fly (1–12 × 1–12). Correct answers grow a streak; 3+ in a row doubles points. Misses come back in a Belajar / Replay round that shows the right answer.

## Play

Open **https://polah.app/sifir-sprint/**

## Run locally

```bash
npm install
npm run dev
```

Vite `base` is `/sifir-sprint/`, so open `http://localhost:5173/sifir-sprint/`.

```bash
npm run build
npm run preview
```

Preview is at `http://localhost:4173/sifir-sprint/`.

Optional short practice: `http://localhost:5173/sifir-sprint/?masa=15`

## Screens

1. **Play** — big 60s timer, soalan, number pad, live markah + streak
2. **Belajar / Replay** — only the misses; jawapan betul shown on a miss
3. **Markah** — this round, best, last five rounds (`localStorage`)

Mute sits in the top-right. First visit starts with sound on; the first **Mula** tap (or a pad/key) unlocks audio and starts the BGM loop when mute is off. Preference is saved in `localStorage`.

After 60s: **Belajar / Replay** (misses only) → **Markah**. **Mula Semula** / **Lagi Satu** starts a fresh round without a page reload. **Baru** (play, Belajar, or Markah) leaves the round and returns to the title screen — press **Mula** for a fresh race.

## Ship

Public URL is only **https://polah.app/sifir-sprint/** (Cloudflare proxies `/sifir-sprint/`; origin can stay GitHub Pages). Vite `base` stays `/sifir-sprint/`.

Old hosts (`hafiy.my`, `nazirulhafiy.github.io`) client-redirect to polah.app and keep the path/query/hash.

- **GitHub Pages:** the `Deploy GitHub Pages` workflow builds `dist` and publishes `main` via `actions/deploy-pages`. In the repo settings, set Pages → Source to **GitHub Actions**.
- **Vercel:** import the repo (Vite + `vercel.json`). The app is served under `/sifir-sprint/`.
