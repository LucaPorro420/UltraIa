"""Test de regresion para scripts/loop_verifier.py (verifier determinista del loop PIVR).

Verifica secciones obligatorias, archivos inexistentes, caso ok y check-diff sin solape.
Standalone, stdlib puro.

Uso: py -3.12 scripts/loop_verifier.test.py
"""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loop_verifier as lv  # noqa: E402


def _plan(sections: list[str], files: list[str]) -> str:
    body = ""
    for s in sections:
        body += f"## {s}\n\n"
        if s.lower() == "archivos a tocar":
            body += "\n".join(f"- `{f}`" for f in files) + "\n\n"
        else:
            body += f"contenido de {s}\n\n"
    return body


class VerifierTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        # Archivos que existen en el repo simulado.
        (self.root / "scripts").mkdir(parents=True)
        (self.root / "scripts" / "x.py").write_text("print(1)\n", encoding="utf-8")
        (self.root / "docs").mkdir()
        (self.root / "docs" / "y.md").write_text("doc\n", encoding="utf-8")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_missing_sections_rejected(self) -> None:
        plan = self.root / "plan.md"
        plan.write_text(
            _plan(["Contexto", "Objetivo"], ["scripts/x.py"]), encoding="utf-8"
        )
        rep = lv.verify(plan, self.root)
        self.assertFalse(rep["approved"])
        self.assertTrue(rep["missing_sections"])

    def test_all_present_approved(self) -> None:
        plan = self.root / "plan.md"
        plan.write_text(
            _plan(
                ["Contexto", "Objetivo", "Pasos", "ARCHIVOS A TOCAR", "Criterios"],
                ["scripts/x.py", "docs/y.md"],
            ),
            encoding="utf-8",
        )
        rep = lv.verify(plan, self.root)
        self.assertTrue(rep["approved"])
        self.assertEqual(rep["missing_files"], [])

    def test_missing_planned_file_rejected(self) -> None:
        plan = self.root / "plan.md"
        plan.write_text(
            _plan(
                ["Contexto", "Objetivo", "Pasos", "ARCHIVOS A TOCAR", "Criterios"],
                ["scripts/x.py", "docs/noexiste.md"],
            ),
            encoding="utf-8",
        )
        rep = lv.verify(plan, self.root)
        self.assertFalse(rep["approved"])
        self.assertIn("docs/noexiste.md", rep["missing_files"])

    def test_check_diff_no_overlap_rejected(self) -> None:
        plan = self.root / "plan.md"
        plan.write_text(
            _plan(
                ["Contexto", "Objetivo", "Pasos", "ARCHIVOS A TOCAR", "Criterios"],
                ["scripts/x.py"],
            ),
            encoding="utf-8",
        )
        with patch.object(lv, "run_git_diff", return_value=["otro/archivo.ts"]):
            rep = lv.verify(plan, self.root, check_diff=True)
        self.assertFalse(rep["approved"])

    def test_check_diff_overlap_approved(self) -> None:
        plan = self.root / "plan.md"
        plan.write_text(
            _plan(
                ["Contexto", "Objetivo", "Pasos", "ARCHIVOS A TOCAR", "Criterios"],
                ["scripts/x.py"],
            ),
            encoding="utf-8",
        )
        with patch.object(lv, "run_git_diff", return_value=["scripts/x.py"]):
            rep = lv.verify(plan, self.root, check_diff=True)
        self.assertTrue(rep["approved"])

    def test_inexistent_plan_rejected(self) -> None:
        rep = lv.verify(self.root / "nope.md", self.root)
        self.assertFalse(rep["approved"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
