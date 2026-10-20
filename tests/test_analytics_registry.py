#!/usr/bin/env python3
"""Tests for data/analytics.json validation, the loader, and the dist check."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load_module(name: str, relative: str):
    path = ROOT / relative
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    spec.loader.exec_module(module)
    return module


analytics_registry = _load_module("analytics_registry", "scripts/analytics_registry.py")
analytics_loader = _load_module("analytics_loader", "scripts/analytics_loader.py")
check_analytics_dist = _load_module("check_analytics_dist", "scripts/check_analytics_dist.py")
docs_check = _load_module("docs_check_pr", "scripts/docs_check_pr.py")


class AnalyticsRegistryTests(unittest.TestCase):
    def test_load_repo_registry(self):
        reg = analytics_registry.load_analytics()
        self.assertEqual(reg.version, 1)
        self.assertEqual(reg.internal_cookie, "sifir_internal")
        self.assertIs(reg.spa, True)
        self.assertEqual(list(reg.hosts), ["polah.app"])
        entry = reg.hosts["polah.app"]
        self.assertEqual(entry.ga4_measurement_id, "G-B3BZXWWDH9")
        self.assertEqual(entry.cf_beacon_token, "cd795175569a442ca30e7c08a6295f9f")
        self.assertEqual(entry.aliases, ["www.polah.app"])
        self.assertEqual(entry.legacy_internal_cookies, [])
        self.assertEqual(reg.primary_ga4_id(), "G-B3BZXWWDH9")
        self.assertEqual(reg.primary_cf_token(), "cd795175569a442ca30e7c08a6295f9f")
        self.assertEqual(reg.hostnames, ("polah.app", "www.polah.app"))
        self.assertEqual(reg.honour_cookies, ("sifir_internal",))
        self.assertEqual(reg.legacy_internal_cookies, [])

    def test_rejects_bad_ga4(self):
        payload = {
            "version": 1,
            "internal_cookie": "sifir_internal",
            "spa": True,
            "hosts": {
                "polah.app": {
                    "ga4_measurement_id": "not-a-id",
                    "cf_beacon_token": "cd795175569a442ca30e7c08a6295f9f",
                    "aliases": [],
                    "legacy_internal_cookies": [],
                }
            },
        }
        with self.assertRaises(SystemExit):
            analytics_registry.validate_analytics_payload(payload)

    def test_rejects_top_level_legacy_cookies(self):
        payload = {
            "version": 1,
            "internal_cookie": "sifir_internal",
            "spa": True,
            "legacy_cookies": ["sifir_internal"],
            "hosts": {
                "polah.app": {
                    "ga4_measurement_id": "G-B3BZXWWDH9",
                    "cf_beacon_token": "cd795175569a442ca30e7c08a6295f9f",
                    "aliases": ["www.polah.app"],
                    "legacy_internal_cookies": [],
                }
            },
        }
        with self.assertRaises(SystemExit):
            analytics_registry.validate_analytics_payload(payload)


class AnalyticsLoaderTests(unittest.TestCase):
    def test_one_loader_keeps_internal_query(self):
        loader = analytics_loader.render_analytics_loader()
        self.assertEqual(loader.count(analytics_loader.ANALYTICS_LOADER_ATTR), 1)
        self.assertIn("G-B3BZXWWDH9", loader)
        self.assertIn("cd795175569a442ca30e7c08a6295f9f", loader)
        self.assertIn('"polah.app"', loader)
        self.assertIn('"www.polah.app"', loader)
        self.assertIn("sifir_internal", loader)
        self.assertIn("traffic_type", loader)
        self.assertIn("'internal'", loader)
        self.assertIn("max-age=31536000", loader)
        self.assertIn("q.get('internal')==='1'", loader)
        self.assertIn("q.get('internal')==='0'", loader)
        self.assertIn("H.indexOf(h)<0", loader)
        self.assertIn("googletagmanager.com/gtag/js?id=", loader)
        self.assertIn("static.cloudflareinsights.com/beacon.min.js", loader)
        self.assertIn("if(internal)return", loader)
        self.assertIn("spa:true", loader)
        self.assertNotIn(
            '<script async src="https://www.googletagmanager.com/gtag/js',
            loader,
        )


class AnalyticsDistCheckTests(unittest.TestCase):
    def test_rendered_page_passes(self):
        loader = analytics_loader.render_analytics_loader()
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp)
            (dist / "index.html").write_text(
                f"<!doctype html><html><head>{loader}</head><body></body></html>",
                encoding="utf-8",
            )
            self.assertEqual(check_analytics_dist.main(["--dist", str(dist)]), 0)

    def test_zero_loaders_fails_and_names_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp)
            (dist / "index.html").write_text("<html><head></head></html>", encoding="utf-8")
            code = check_analytics_dist.main(["--dist", str(dist)])
            self.assertEqual(code, 1)

    def test_duplicate_loader_and_wrong_id_fail(self):
        reg = analytics_registry.load_analytics()
        loader = analytics_loader.render_analytics_loader(reg)
        bad = loader.replace("G-B3BZXWWDH9", "G-WRONGID00").replace(
            "sifir_internal", "ga_internal"
        )
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp)
            page = dist / "index.html"
            page.write_text(
                f"<!doctype html><html><head>{loader}{bad}</head></html>",
                encoding="utf-8",
            )
            errors = check_analytics_dist.check_page(page, reg)
            self.assertTrue(any("2 analytics loaders" in err for err in errors), errors)
            self.assertTrue(any("G-WRONGID00" in err for err in errors), errors)
            self.assertTrue(any("ga_internal" in err for err in errors), errors)

    def test_spa_false_drift_fails(self):
        reg = analytics_registry.load_analytics()
        loader = analytics_loader.render_analytics_loader(reg).replace("spa:true", "spa:false")
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp)
            page = dist / "index.html"
            page.write_text(f"<html><head>{loader}</head></html>", encoding="utf-8")
            errors = check_analytics_dist.check_page(page, reg)
            self.assertTrue(any("spa:true" in err for err in errors), errors)


class DocsCheckWatchTests(unittest.TestCase):
    def test_analytics_paths_are_watched(self):
        self.assertTrue(docs_check.is_watched("index.html"))
        self.assertTrue(docs_check.is_watched("vite.config.ts"))
        self.assertTrue(docs_check.is_watched("data/analytics.json"))
        self.assertTrue(docs_check.is_watched("scripts/analytics_registry.py"))
        self.assertTrue(docs_check.is_watched("scripts/analytics_loader.py"))
        self.assertTrue(docs_check.is_watched("scripts/check_analytics_dist.py"))
        self.assertTrue(docs_check.is_watched("scripts/docs_check_pr.py"))
        self.assertTrue(docs_check.is_watched(".github/workflows/pages.yml"))
        self.assertTrue(docs_check.is_watched("./.github/workflows/pages.yml"))
        self.assertTrue(docs_check.is_watched(".github/workflows/analytics-dist.yml"))
        self.assertEqual(
            docs_check.normalize_path(".github/workflows/pages.yml"),
            ".github/workflows/pages.yml",
        )


if __name__ == "__main__":
    unittest.main()
