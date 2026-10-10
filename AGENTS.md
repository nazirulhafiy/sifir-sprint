# Agents

Sifir Sprint — 60s SPM jadual darab sprint (React + Vite). Live: **https://polah.app/sifir/**

Design or behaviour changes (CSS, templates, app JS, build scripts, config) must update `docs/` (usually `docs/design.md`) in the same PR. Use the `no-docs-needed` label only for changes that truly need no docs.

See [`docs/design.md`](docs/design.md) and [`docs/ci-docs-check.md`](docs/ci-docs-check.md).

## Commands

```bash
npm install
npm run dev        # http://localhost:5173/sifir/
npm run build
npm run lint
npm run test:e2e
```

Deploy: GitHub Pages (`Deploy GitHub Pages` on `main`); public URL via Cloudflare at `polah.app/sifir/`. Vite `base` is `/sifir/`. No production Vercel deployment.
