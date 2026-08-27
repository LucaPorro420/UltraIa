"""Test de regresion para scripts/loop_piv.py --doctor (pre-flight state-doctor).

Asegura que:
- `--doctor` solo corre scripts/state_doctor.py (13 checks deterministas) y termina;
- `--doctor --triage` corre state_doctor ANTES de loop_triage.py;
- `--doctor --gate-only` corre state_doctor ANTES de los 4 gates npm;
- parse_args acepta el flag.

Standalone, stdlib puro (patron scripts/loop_piv_mark_done.test.py).

Uso: py -3.12 scripts/loop_piv_doctor.test.py
"""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loop_piv


class KillSwitchTests(unittest.TestCase):
    """Regresion del fix 19/08/2026: menciones en prosa negadas NO activan el kill switch."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.state_path = Path(self.tmp.name) / "STATE.md"
        self.runlog_path = Path(self.tmp.name) / "loop-run-log.md"
        self._orig_state = loop_piv.STATE
        self._orig_runlog = loop_piv.RUN_LOG
        loop_piv.STATE = self.state_path
        loop_piv.RUN_LOG = self.runlog_path

    def tearDown(self) -> None:
        loop_piv.STATE = self._orig_state
        loop_piv.RUN_LOG = self._orig_runlog
        self.tmp.cleanup()

    def test_negated_prose_does_not_activate(self) -> None:
        # Falso positivo real: loop-run-log.md L1959 "sin `loop-pause-all`"
        self.state_path.write_text(
            "# Estado\n\nBanner normal.\n", encoding="utf-8"
        )
        self.runlog_path.write_text(
            "- **STATE.md desync**: banner obsoleto (sin `loop-pause-all`); 4 IDs duplicados.\n"
            "- Sin loop-pause-all; kill switch ausente; no activo.\n",
            encoding="utf-8",
        )
        self.assertFalse(loop_piv.kill_switch_active())

    def test_real_kill_switch_activates(self) -> None:
        self.state_path.write_text(
            "# Estado\n\nloop-pause-all\n", encoding="utf-8"
        )
        self.runlog_path.write_text("## 2026-08-19 - Iteracion\n", encoding="utf-8")
        self.assertTrue(loop_piv.kill_switch_active())

    def test_negation_window_does_not_shadow_real_switch(self) -> None:
        # El mismo archivo con una ocurrencia negada Y una real -> activo.
        self.state_path.write_text(
            "# Estado\n\nsin loop-pause-all documentado; loop-pause-all activo por decision.\n",
            encoding="utf-8",
        )
        self.runlog_path.write_text("x\n", encoding="utf-8")
        self.assertTrue(loop_piv.kill_switch_active())

    def test_diagnostic_meta_mention_ignored(self) -> None:
        # Falso positivo real L2294 (26/08/2026): reporte diagnostico que CUENTA
        # menciones del token ("8 menciones de `loop-pause-all`...") no es una orden.
        self.state_path.write_text("# Estado\n\nBanner normal.\n", encoding="utf-8")
        self.runlog_path.write_text(
            "- **[P] Sensado**: Kill switch: 8 menciones de `loop-pause-all` en STATE.md,"
            " TODAS en prosa negada. Proceder.\n",
            encoding="utf-8",
        )
        self.assertFalse(loop_piv.kill_switch_active())

    def test_english_without_negation_ignored(self) -> None:
        # "without loop-pause-all" en prosa inglesa tampoco activa.
        self.state_path.write_text("ok\n", encoding="utf-8")
        self.runlog_path.write_text(
            "prosa: without loop-pause-all nothing happens\n", encoding="utf-8"
        )
        self.assertFalse(loop_piv.kill_switch_active())


class DoctorTests(unittest.TestCase):
    """Regresion: --doctor invoca scripts/state_doctor.py (no opencode --agent)."""

    def setUp(self) -> None:
        self.calls: list[list[str]] = []
        self._orig_run = loop_piv.run
        self._orig_state = loop_piv.STATE
        self._orig_runlog = loop_piv.RUN_LOG
        # Aislar del STATE.md real para que el kill switch no cortocircuite.
        self.tmp = tempfile.TemporaryDirectory()
        loop_piv.STATE = Path(self.tmp.name) / "STATE.md"
        loop_piv.RUN_LOG = Path(self.tmp.name) / "loop-run-log.md"
        loop_piv.STATE.write_text("# Estado\n\nBanner normal.\n", encoding="utf-8")
        loop_piv.RUN_LOG.write_text("x\n", encoding="utf-8")

        def fake_run(argv, dry=False, timeout=3600):
            self.calls.append(list(argv))
            return 0, ""
        loop_piv.run = fake_run  # type: ignore[assignment]

    def tearDown(self) -> None:
        loop_piv.run = self._orig_run  # type: ignore[assignment]
        loop_piv.STATE = self._orig_state
        loop_piv.RUN_LOG = self._orig_runlog
        self.tmp.cleanup()

    def _args(self, **kwargs):  # -> argparse.Namespace
        import argparse

        ns = argparse.Namespace(
            doctor=False,
            triage=False,
            gate_only=False,
            plan_only=False,
            dry_run=True,
            timeout=60,
        )
        for key, value in kwargs.items():
            setattr(ns, key, value)
        return ns

    def test_doctor_only_runs_state_doctor(self) -> None:
        rc = loop_piv.run_singletons(self._args(doctor=True))
        self.assertEqual(rc, 0)
        self.assertEqual(len(self.calls), 1)
        argv = self.calls[0]
        self.assertIn(str(loop_piv.SCRIPTS / "state_doctor.py"), argv)
        self.assertNotIn("--agent", argv)
        self.assertNotIn("opencode", argv)

    def test_doctor_before_triage_order(self) -> None:
        rc = loop_piv.run_singletons(self._args(doctor=True, triage=True))
        self.assertEqual(rc, 0)
        self.assertEqual(len(self.calls), 2)
        self.assertIn(str(loop_piv.SCRIPTS / "state_doctor.py"), self.calls[0])
        self.assertIn(str(loop_piv.SCRIPTS / "loop_triage.py"), self.calls[1])
        for argv in self.calls:
            self.assertNotIn("--agent", argv)

    def test_doctor_before_gate_only(self) -> None:
        # doctor (1) + 4 gates npm en dry-run (run() se registra) = 5 llamadas.
        rc = loop_piv.run_singletons(self._args(doctor=True, gate_only=True))
        self.assertEqual(rc, 0)
        self.assertEqual(len(self.calls), 5)
        first = self.calls[0]
        self.assertIn(str(loop_piv.SCRIPTS / "state_doctor.py"), first)
        # Los 4 gates siguen al doctor (npm_cmd() es "npm" o "npm.cmd" en win).
        self.assertTrue(all("run" in c for c in self.calls[1:]))

    def test_no_doctor_no_extra_calls(self) -> None:
        rc = loop_piv.run_singletons(self._args(triage=True))
        self.assertEqual(rc, 0)
        self.assertEqual(len(self.calls), 1)
        self.assertIn(str(loop_piv.SCRIPTS / "loop_triage.py"), self.calls[0])
        self.assertNotIn("--agent", self.calls[0])

    def test_parse_args_accepts_doctor(self) -> None:
        original = sys.argv
        sys.argv = ["loop_piv.py", "--doctor", "--dry-run"]
        try:
            args = loop_piv.parse_args()
        finally:
            sys.argv = original
        self.assertTrue(args.doctor)
        self.assertTrue(args.dry_run)

    def test_parse_args_defaults_doctor_false(self) -> None:
        original = sys.argv
        sys.argv = ["loop_piv.py"]
        try:
            args = loop_piv.parse_args()
        finally:
            sys.argv = original
        self.assertFalse(args.doctor)


if __name__ == "__main__":
    unittest.main()
