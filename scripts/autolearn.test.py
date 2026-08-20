"""E2E tests para scripts/autolearn.py (runner del autoprogramador).

Patron: cloud-cli.test.py - fixtures inline en tempdir aislado, sin red,
determinista. Ejecutar con el Python que tenga el proyecto:
    py -3.12 scripts/autolearn.test.py
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ROOT, "scripts", "autolearn.py")

LEARNINGS_FIXTURE = """# Aprendizaje

## Lecciones aprendidas

- **API directa > web search** (20/08/2026, ciclo 73): para valores medibles usar la API cruda.
- **PowerShell 5.1 rompe JSON en argv** (ciclo 41): escribir archivos con Write.
- Leccion sin metadatos.
"""

STATE_FIXTURE = """# Loop State

| # | Tarea | Estado |
|---|-------|--------|
| 99 | Algo pendiente de decidir | pendiente |
| 98 | Cosa hecha | DONE |
"""

TRUTH_FIXTURE = '{"fuente": "truth_math", "tipo": "exact", "cases": [{"id": "m1"}]}'


def run_cli(args: list[str], cwd: str) -> subprocess.CompletedProcess[str]:
    env = dict(os.environ)
    env["AUTOLEARN_ROOT"] = cwd  # el runner sensa ROOT (apuntable por env para tests)
    return subprocess.run([sys.executable, SCRIPT, *args], capture_output=True, text=True, cwd=cwd, env=env, timeout=60)


class AutolearnCliTest(unittest.TestCase):
    """E2E del runner: gaps, plan escrito, validate, determinismo."""

    def setUp(self) -> None:
        self.tmp = tempfile.mkdtemp(prefix="autolearn-test-")
        self.plans = os.path.join(self.tmp, "plans")
        os.makedirs(self.plans, exist_ok=True)

    def tearDown(self) -> None:
        import shutil

        shutil.rmtree(self.tmp, ignore_errors=True)

    # -- helpers ------------------------------------------------------------

    def make_repo(self, with_state: bool = True, with_truth: bool = True, sources: list[str] | None = None) -> None:
        """Crea un mini-repo UltraIa (learning/, STATE.md, docs/)."""
        os.makedirs(os.path.join(self.tmp, "learning", "sources"), exist_ok=True)
        os.makedirs(os.path.join(self.tmp, "learning", "truth"), exist_ok=True)
        os.makedirs(os.path.join(self.tmp, "docs"), exist_ok=True)
        os.makedirs(os.path.join(self.tmp, ".opencode"), exist_ok=True)
        with open(os.path.join(self.tmp, "learning", "LEARNINGS.md"), "w", encoding="utf-8") as fh:
            fh.write(LEARNINGS_FIXTURE)
        if with_state:
            with open(os.path.join(self.tmp, "STATE.md"), "w", encoding="utf-8") as fh:
                fh.write(STATE_FIXTURE)
        if with_truth:
            with open(os.path.join(self.tmp, "learning", "truth", "truth_math.json"), "w", encoding="utf-8") as fh:
                fh.write(TRUTH_FIXTURE)
        for s in sources or []:
            with open(os.path.join(self.tmp, "learning", "sources", s), "w", encoding="utf-8") as fh:
                fh.write("# fuente\n")

    # -- tests ---------------------------------------------------------------

    def test_dry_run_detecta_gaps_y_prioriza(self) -> None:
        self.make_repo(sources=["sacd-nasa.md", "autolearn.md"])
        # Analisis RAZONAMIENTO-SACD.md existe -> solo autolearn.md queda sin analizar.
        with open(os.path.join(self.tmp, "docs", "RAZONAMIENTO-SACD.md"), "w", encoding="utf-8") as fh:
            fh.write("# analisis\n")
        r = run_cli(["--dry-run", "--verbose"], self.tmp)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("source_sin_analizar", r.stdout)
        self.assertIn("autolearn.md", r.stdout)
        self.assertIn("backlog_pendiente", r.stdout)
        self.assertIn("tema_sin_truth", r.stdout)
        self.assertIn("[A]", r.stdout)  # backlog pendiente -> impacto 4 -> nivel alto

    def test_escribe_plan_en_out(self) -> None:
        self.make_repo(sources=["fuente-nueva.md"])
        r = run_cli(["--out", self.plans, "--length", "5"], self.tmp)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("Plan escrito", r.stdout)
        out = os.path.join(self.plans, f"autolearn-{__import__('datetime').datetime.now().strftime('%Y-%m-%d')}.md")
        self.assertTrue(os.path.exists(out), out)
        with open(out, "r", encoding="utf-8") as fh:
            content = fh.read()
        self.assertIn("PLAN AUTOGENERADO", content)
        self.assertIn("Objetivo", content)
        self.assertIn("Criterios de verificacion", content)
        self.assertIn("Motor META-IA", content)
        self.assertIn("Regla estrategica", content)
        # Sin BOM y valid utf-8.
        self.assertFalse(content.startswith("\ufeff"))

    def test_validate_ok_y_con_fallos(self) -> None:
        self.make_repo(sources=["x.md"], with_truth=False)
        # Falta learning/truth -> validate debe fallar.
        import shutil

        shutil.rmtree(os.path.join(self.tmp, "learning", "truth"))
        r = run_cli(["--validate"], self.tmp)
        self.assertEqual(r.returncode, 1)
        self.assertIn("Falta: learning/truth", r.stdout)
        # Repo completo -> validate 0.
        self.make_repo(sources=["x.md"])
        r2 = run_cli(["--validate"], self.tmp)
        self.assertEqual(r2.returncode, 0, r2.stdout + r2.stderr)

    def test_determinismo_mismo_plan(self) -> None:
        self.make_repo(sources=["a.md", "b.md"])
        r1 = run_cli(["--dry-run"], self.tmp)
        r2 = run_cli(["--dry-run"], self.tmp)
        self.assertEqual(r1.stdout, r2.stdout)

    def test_repo_vacio_no_crashea(self) -> None:
        r = run_cli(["--dry-run"], self.tmp)  # sin learning/ ni STATE.md
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("0 gaps", r.stdout)

    def test_pasos_motor_meta_ia(self) -> None:
        self.make_repo(sources=["m.md"])
        r = run_cli(["--out", self.plans], self.tmp)
        self.assertEqual(r.returncode, 0, r.stderr)
        files = [f for f in os.listdir(self.plans) if f.endswith(".md")]
        self.assertEqual(len(files), 1, files)
        with open(os.path.join(self.plans, files[0]), "r", encoding="utf-8") as fh:
            content = fh.read()
        for step in ["Analizar reglas nuevas.", "Ejecutar los mejores.", "Actualizar biblioteca."]:
            self.assertIn(step, content)


if __name__ == "__main__":
    unittest.main(verbosity=2)