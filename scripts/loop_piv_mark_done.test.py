"""Test de regresion para scripts/loop_piv.py::mark_done.

Bug (hasta 2026-08-18): mark_done(task_id) marcaba DONE cualquier fila que
siguiera 'pendiente' en STATE.md, sin filtrar por task_id (el parametro solo
se usaba en el print). Invisible con una sola fila pendiente a la vez; con
dos sesiones concurrentes dejando mas de una fila 'pendiente' simultanea
(patron ya documentado en STATE.md: iteraciones 25/26/41/46) marcaba DONE
tareas que nadie habia terminado.

Standalone, stdlib puro (patron scripts/cloud-cli.test.py).

Uso: py -3.12 scripts/loop_piv_mark_done.test.py
"""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loop_piv  # noqa: E402


TABLE_TWO_PENDING = (
    "# Loop State\n\n"
    "| # | Tarea | Scope | Gates | Estado |\n"
    "|---|-------|-------|-------|--------|\n"
    "| 1 | Tarea uno | repo | FULL | pendiente |\n"
    "| 2 | Tarea dos | repo | FULL | pendiente |\n"
)

TABLE_ONE_PENDING = (
    "| # | Tarea | Scope | Gates | Estado |\n"
    "|---|-------|-------|-------|--------|\n"
    "| 7 | Solo | repo | FULL | pendiente |\n"
)

TABLE_SIGUIENTE = (
    "| # | Tarea | Scope | Gates | Estado |\n"
    "|---|-------|-------|-------|--------|\n"
    "| 3 | Con siguiente | repo | FULL | pendiente — SIGUIENTE |\n"
    "| 4 | Otra pendiente | repo | FULL | pendiente |\n"
)


class MarkDoneTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.state_path = Path(self.tmp.name) / "STATE.md"
        self._orig_state = loop_piv.STATE
        loop_piv.STATE = self.state_path

    def tearDown(self) -> None:
        loop_piv.STATE = self._orig_state
        self.tmp.cleanup()

    def _lines(self) -> list[str]:
        return self.state_path.read_text(encoding="utf-8").splitlines()

    def test_two_pending_rows_marks_only_target_id(self) -> None:
        self.state_path.write_text(TABLE_TWO_PENDING, encoding="utf-8")
        loop_piv.mark_done(1)
        lines = self._lines()
        row1 = next(l for l in lines if l.startswith("| 1 "))
        row2 = next(l for l in lines if l.startswith("| 2 "))
        self.assertIn("DONE", row1)
        # Esta es la asercion que el bug original rompia: la fila #2 (una
        # tarea DISTINTA, todavia sin hacer) no debe tocarse.
        self.assertIn("pendiente", row2)
        self.assertNotIn("DONE", row2)

    def test_single_pending_row_still_works(self) -> None:
        self.state_path.write_text(TABLE_ONE_PENDING, encoding="utf-8")
        loop_piv.mark_done(7)
        text = self.state_path.read_text(encoding="utf-8")
        self.assertIn("DONE", text)
        self.assertNotIn("pendiente", text)

    def test_siguiente_suffix_only_marks_matching_id(self) -> None:
        self.state_path.write_text(TABLE_SIGUIENTE, encoding="utf-8")
        loop_piv.mark_done(3)
        lines = self._lines()
        row3 = next(l for l in lines if l.startswith("| 3 "))
        row4 = next(l for l in lines if l.startswith("| 4 "))
        self.assertIn("DONE", row3)
        self.assertIn("pendiente", row4)

    def test_unknown_id_leaves_file_unchanged(self) -> None:
        self.state_path.write_text(TABLE_ONE_PENDING, encoding="utf-8")
        loop_piv.mark_done(999)
        text = self.state_path.read_text(encoding="utf-8")
        self.assertIn("pendiente", text)
        self.assertNotIn("DONE", text)


if __name__ == "__main__":
    unittest.main()
