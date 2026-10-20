#!/usr/bin/env python3
"""Fail pull requests that change design/behavior without updating docs/."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

# Watched paths (keep in sync with docs/ci-docs-check.md and docs-check.yml).
WATCH_SUFFIXES_IN_SRC = (".css", ".tsx", ".ts")
WATCH_EXACT = (
    "vite.config.ts",
    "index.html",
    "public/favicon.svg",
    "public/apple-touch-icon.svg",
    "data/analytics.json",
    "scripts/analytics_registry.py",
    "scripts/analytics_loader.py",
    "scripts/check_analytics_dist.py",
    "scripts/docs_check_pr.py",
    ".github/workflows/pages.yml",
    ".github/workflows/analytics-dist.yml",
)

DOCS_PREFIX = "docs/"
LABEL_NAME = "no-docs-needed"
FAILURE_MESSAGE = (
    "This PR changes how the app looks or behaves but doesn't update docs/. "
    "Update docs/design.md, or add the no-docs-needed label if no doc change is needed."
)


def normalize_path(path: str) -> str:
    """Normalize a git path. Strip a leading ./ only; keep `.github/`."""
    normalized = path.replace("\\", "/").lstrip("/")
    if normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def is_watched(path: str) -> bool:
    normalized = normalize_path(path)
    if normalized in WATCH_EXACT:
        return True
    if normalized.startswith("src/"):
        return normalized.endswith(WATCH_SUFFIXES_IN_SRC)
    return False


def is_docs_change(path: str) -> bool:
    return normalize_path(path).startswith(DOCS_PREFIX)


def git_changed_files(base: str, head: str) -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...{head}"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line for line in result.stdout.splitlines() if line.strip()]


def pr_has_no_docs_label(event_path: str | None) -> bool:
    if not event_path:
        return False
    payload = json.loads(Path(event_path).read_text(encoding="utf-8"))
    labels = payload.get("pull_request", {}).get("labels", [])
    return any(label.get("name") == LABEL_NAME for label in labels)


def main(argv: list[str] | None = None) -> int:
    argv = argv or sys.argv[1:]
    base = os.environ.get("DOCS_CHECK_BASE")
    head = os.environ.get("DOCS_CHECK_HEAD")
    event_path = os.environ.get("GITHUB_EVENT_PATH")

    if len(argv) >= 2:
        base, head = argv[0], argv[1]
    if not base or not head:
        print("DOCS_CHECK_BASE and DOCS_CHECK_HEAD are required.", file=sys.stderr)
        return 2

    if pr_has_no_docs_label(event_path):
        print(f"Label {LABEL_NAME!r} present; docs check skipped.")
        return 0

    changed = git_changed_files(base, head)
    watched = [path for path in changed if is_watched(path)]
    docs = [path for path in changed if is_docs_change(path)]

    if watched and not docs:
        print(FAILURE_MESSAGE, file=sys.stderr)
        print("Watched files changed:", file=sys.stderr)
        for path in watched:
            print(f"  - {path}", file=sys.stderr)
        return 1

    if watched:
        print("Design/behavior files changed with matching docs/ updates.")
    else:
        print("No watched design/behavior files changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
