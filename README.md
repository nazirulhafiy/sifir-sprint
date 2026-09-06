# Sifir Sprint

60s SPM times-tables race — KrackedDevs Sekolah Edition.

**The loop:** soalan → jawab → markah → streak → lagi satu.

A 60-second jadual darab sprint. Questions are generated on the fly (1–12 × 1–12). Correct answers grow a streak; 3+ in a row doubles points. Misses come back in a Belajar / Replay round that shows the right answer.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build
npm run preview
```

Optional short practice: `http://localhost:5173/?masa=15`

## Screens

1. **Play** — big 60s timer, soalan, number pad, live markah + streak
2. **Belajar / Replay** — only the misses; jawapan betul shown on a miss
3. **Markah** — this round, best, last five rounds (`localStorage`)

## Ship

- **Vercel:** import the repo (Vite + `vercel.json` already set).
- **GitHub Pages:** the `Deploy GitHub Pages` workflow publishes `main` to Pages. Enable Pages → GitHub Actions in the repo settings.
