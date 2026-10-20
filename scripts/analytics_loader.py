#!/usr/bin/env python3
"""Render the one production analytics loader from data/analytics.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from analytics_registry import AnalyticsRegistry, load_analytics  # noqa: E402

# ~1 year. Same lifetime as the sarawak.news kit loader.
ANALYTICS_MAX_AGE = 31536000
ANALYTICS_LOADER_ATTR = "data-sifir-analytics-loader"


def render_analytics_loader(registry: AnalyticsRegistry | None = None) -> str:
    """Emit one production analytics loader from ``data/analytics.json``.

    Kit shape v1: top-level ``internal_cookie`` / ``spa``; per-host
    ``ga4_measurement_id``, ``cf_beacon_token``, ``aliases``,
    ``legacy_internal_cookies``.

    - Host gate: primary host plus ``aliases`` (never localhost or the Pages origin).
    - ``?internal=1`` sets the registry ``internal_cookie`` (~1 year);
      ``?internal=0`` clears the primary and every listed
      ``legacy_internal_cookies`` name.
    - ``internal`` is true when the primary **or** any per-host
      ``legacy_internal_cookies`` name is ``=1``. This repo had no internal
      cookie before this loader; the list is empty and the only name is
      ``sifir_internal``.
    - GA4 always loads on production hosts; when ``internal``, config includes
      ``traffic_type: 'internal'``.
    - CF Web Analytics beacon loads only when not ``internal``, with ``spa``
      from the registry.
    """
    reg = registry if registry is not None else load_analytics()
    hosts_js = ",".join(json.dumps(h) for h in reg.hostnames)
    primary = json.dumps(reg.internal_cookie)
    honour = ",".join(json.dumps(c) for c in reg.honour_cookies)
    mid = json.dumps(reg.primary_ga4_id())
    token = json.dumps(reg.primary_cf_token())
    spa_js = "true" if reg.spa else "false"
    max_age = ANALYTICS_MAX_AGE
    # Single inline script marked for dist checks (exactly one per page).
    return (
        f"<script {ANALYTICS_LOADER_ATTR}>(function(){{"
        f"var H=[{hosts_js}],h=location.hostname;"
        "if(H.indexOf(h)<0)return;"
        f"var C={primary},L=[{honour}],q=new URLSearchParams(location.search),"
        "sec=location.protocol==='https:'?';Secure':'';"
        "if(q.get('internal')==='1')"
        f"document.cookie=C+'=1;path=/;max-age={max_age};SameSite=Lax'+sec;"
        "else if(q.get('internal')==='0')"
        "L.forEach(function(n){document.cookie=n+'=;path=/;max-age=0;SameSite=Lax'+sec;});"
        "var internal=L.some(function(n){return document.cookie.split(';').some(function(p){"
        "return p.trim()===n+'=1';});});"
        "window.dataLayer=window.dataLayer||[];"
        "function gtag(){dataLayer.push(arguments);}"
        "window.gtag=gtag;"
        "gtag('js',new Date());"
        f"var id={mid},cfg={{}};"
        "if(internal)cfg.traffic_type='internal';"
        "gtag('config',id,cfg);"
        "var gs=document.createElement('script');gs.async=true;"
        "gs.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);"
        "document.head.appendChild(gs);"
        "if(internal)return;"
        "var s=document.createElement('script');s.defer=true;"
        "s.src='https://static.cloudflareinsights.com/beacon.min.js';"
        f"s.setAttribute('data-cf-beacon',JSON.stringify({{token:{token},spa:{spa_js}}}));"
        "document.head.appendChild(s);"
        "})();</script>"
    )


def main() -> int:
    sys.stdout.write(render_analytics_loader())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
