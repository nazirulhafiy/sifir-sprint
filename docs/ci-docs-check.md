# CI: Docs check

Pull requests run the **docs check** workflow (`.github/workflows/docs-check.yml`) on
`opened`, `synchronize`, `reopened`, `labeled`, and `unlabeled` events.

## What it enforces

If a PR changes files that affect how the app **looks or behaves**, it must also
change at least one file under `docs/` in the same PR (three-dot diff:
`base.sha...head.sha`).

Watched paths (also in [`scripts/docs_check_pr.py`](../scripts/docs_check_pr.py)):

| Area | Paths |
| --- | --- |
| Styles & UI | `src/**/*.css`, `src/**/*.tsx`, `src/**/*.ts` |
| App shell & config | `index.html`, `vite.config.ts` |
| Brand icons | `public/favicon.svg`, `public/apple-touch-icon.svg` |
| Analytics registry & loader | `data/analytics.json`, `scripts/analytics_registry.py`, `scripts/analytics_loader.py`, `scripts/check_analytics_dist.py` |
| Docs check script | `scripts/docs_check_pr.py` |
| Analytics CI | `.github/workflows/pages.yml`, `.github/workflows/analytics-dist.yml` |

Paths are matched after stripping a leading `./`. A `.github/` prefix is kept
(it is not treated as a dot-slash).

**Not watched:** `e2e/`, `tools/layout-check.mjs`, `package.json` / lockfile-only churn, docs-only PRs, and
workflow edits other than the two analytics workflows listed above.

The **Layout check** workflow (`.github/workflows/layout-check.yml`) is separate.
It loads the built game in Chromium and WebKit and is described in
[design.md](design.md) (Layout check). It does not deploy.

## Escape hatch

Add the GitHub label **`no-docs-needed`** when watched files change but no
`docs/` update is required. The workflow creates the label if missing.

## Failure message

> This PR changes how the app looks or behaves but doesn't update docs/. Update docs/design.md, or add the no-docs-needed label if no doc change is needed.

## Local check

```bash
git fetch origin main
DOCS_CHECK_BASE=origin/main DOCS_CHECK_HEAD=HEAD python3 scripts/docs_check_pr.py
```

Or pass SHAs: `python3 scripts/docs_check_pr.py <base> <head>`.
