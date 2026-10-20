# Agents

Sifir Sprint — 60s SPM jadual darab sprint (React + Vite). Live: **https://polah.app/sifir/**

Design or behaviour changes (CSS, templates, app JS, build scripts, config) must update `docs/` (usually `docs/design.md`) in the same PR. Use the `no-docs-needed` label only for changes that truly need no docs.

See [`docs/design.md`](docs/design.md) and [`docs/ci-docs-check.md`](docs/ci-docs-check.md).

## Analytics (internal traffic)

When agents, QA, or screenshot checks open the **live** site ([https://polah.app/sifir/](https://polah.app/sifir/)), append `?internal=1` (for example `https://polah.app/sifir/?internal=1`). That sets the registry cookie from `data/analytics.json` (`sifir_internal`, ~1 year) so GA4 receives `traffic_type: 'internal'` and this page’s loader does not add the Cloudflare beacon.

Use `?internal=0` to clear it. Both trackers load only on `polah.app` / `www.polah.app` — never on localhost or the GitHub Pages origin. Details: [docs/design.md](docs/design.md) (Analytics).

## Commands

```bash
npm install
npm run dev        # http://localhost:5173/sifir/
npm run build
python3 scripts/check_analytics_dist.py   # after build; also runs in CI
python3 -m unittest discover -s tests -v
npm run lint
npm run test:e2e
```

Deploy: GitHub Pages (`Deploy GitHub Pages` on `main`); public URL via Cloudflare at `polah.app/sifir/`. Vite `base` is `/sifir/`. No production Vercel deployment. Do not `workflow_dispatch` the Pages workflow from an agent.
