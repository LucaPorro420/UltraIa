"""Test de regresion para scripts/sync_skill_mirrors.py (plan_sync/apply_sync deterministicos).

Verifica que solo se sincronizan los ESPEJOS (skills con contraparte en skills/),
no los skills source-only. Standalone, stdlib puro.

Uso: py -3.12 scripts/sync_skill_mirrors.test.py
"""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sync_skill_mirrors as sm  # noqa: E402


class SyncTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        # alpha: espejo con SKILL.md faltante en skills/ (debe crearse).
        (self.root / ".opencode" / "skills" / "alpha").mkdir(parents=True)
        (self.root / ".opencode" / "skills" / "alpha" / "SKILL.md").write_text("A\n", encoding="utf-8")
        (self.root / "skills" / "alpha").mkdir(parents=True)  # dir espejo existe, sin SKILL.md
        # beta: espejo ya sincronizado.
        (self.root / ".opencode" / "skills" / "beta").mkdir(parents=True)
        (self.root / ".opencode" / "skills" / "beta" / "SKILL.md").write_text("B\n", encoding="utf-8")
        (self.root / "skills" / "beta").mkdir(parents=True)
        (self.root / "skills" / "beta" / "SKILL.md").write_text("B\n", encoding="utf-8")
        # gamma: solo existe en .opencode/skills/ -> source-only (se omite).
        (self.root / ".opencode" / "skills" / "gamma").mkdir(parents=True)
        (self.root / ".opencode" / "skills" / "gamma" / "SKILL.md").write_text("G\n", encoding="utf-8")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_plan_classifies_mirror_vs_source_only(self) -> None:
        items = sm.plan_sync(self.root)
        by_name = {i["name"]: i["status"] for i in items}
        self.assertEqual(by_name["alpha"], "missing")
        self.assertEqual(by_name["beta"], "synced")
        self.assertEqual(by_name["gamma"], "source-only")

    def test_apply_creates_missing_mirror_only(self) -> None:
        items = sm.plan_sync(self.root)
        synced = sm.apply_sync(items)
        self.assertEqual(synced, ["alpha"])  # gamma se omite
        self.assertTrue((self.root / "skills" / "alpha" / "SKILL.md").is_file())
        # gamma NO debe haber creado espejo
        self.assertFalse((self.root / "skills" / "gamma").exists())
        items2 = sm.plan_sync(self.root)
        self.assertTrue(all(i["status"] == "synced" for i in items2 if i["name"] != "gamma"))

    def test_drift_detected_and_fixed(self) -> None:
        (self.root / ".opencode" / "skills" / "beta" / "SKILL.md").write_text("B2\n", encoding="utf-8")
        items = sm.plan_sync(self.root)
        beta = next(i for i in items if i["name"] == "beta")
        alpha = next(i for i in items if i["name"] == "alpha")
        self.assertEqual(beta["status"], "drift")
        self.assertEqual(alpha["status"], "missing")
        sm.apply_sync(items)
        items2 = sm.plan_sync(self.root)
        self.assertTrue(all(i["status"] == "synced" for i in items2 if i["name"] != "gamma"))

    def test_check_returns_nonzero_on_drift(self) -> None:
        rc = sm.main(["--root", str(self.root), "--check"])
        self.assertEqual(rc, 1)  # alpha missing
        sm.apply_sync(sm.plan_sync(self.root))
        rc2 = sm.main(["--root", str(self.root), "--check"])
        self.assertEqual(rc2, 0)  # solo quedan espejos synced (+ gamma source-only)

    def test_apply_is_idempotent(self) -> None:
        first = sm.apply_sync(sm.plan_sync(self.root))
        second = sm.apply_sync(sm.plan_sync(self.root))
        self.assertEqual(first, ["alpha"])
        self.assertEqual(second, [])


if __name__ == "__main__":
    unittest.main()
