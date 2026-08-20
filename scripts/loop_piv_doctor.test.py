"""Test de regresion para scripts/loop_piv.py --doctor (pre-flight state-doctor).

Asegura que:
- `--doctor` solo corre el agente state-doctor (state-integrity-check) y termina;
- `--doctor --triage` corre state-doctor ANTES de loop-triage;
- `--doctor --gate-only` corre state-doctor ANTES de los gates;
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
        self.runlog_path.write_text("## 2026-08-19 — Iteracion\n", encoding="utf-8")
        self.assertTrue(loop_piv.kill_switch_active())

    def test_negation_window_does_not_shadow_real_switch(self) -> None:
        # El mismo archivo con una ocurrencia negada Y una real -> activo.
        self.state_path.write_text(
            "# Estado\n\nsin loop-pause-all documentado; loop-pause-all activo por decision.\n",
            encoding="utf-8",
        )
        self.runlog_path.write_text("x\n", encoding="utf-8")
        self.assertTrue(loop_piv.kill_switch_active())


class DoctorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.calls: list[list[str]] = []

        self._orig_run = loop_piv.run
        self._orig_exec = loop_piv.opencode_exec

        def fake_run(argv: list[str], dry: bool, timeout: int = 3600):
            self.calls.append(list(argv))
            return 0, ""

        loop_piv.run = fake_run  # type: ignore[assignment]
        loop_piv.opencode_exec = lambda: ["opencode"]  # type: ignore[assignment]

    def tearDown(self) -> None:
        loop_piv.run = self._orig_run  # type: ignore[assignment]
        loop_piv.opencode_exec = self._orig_exec  # type: ignore[assignment]

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
        self.assertIn("--agent", argv)
        self.assertEqual(argv[argv.index("--agent") + 1], "state-doctor")

    def test_doctor_before_triage_order(self) -> None:
        rc = loop_piv.run_singletons(self._args(doctor=True, triage=True))
        self.assertEqual(rc, 0)
        self.assertEqual(len(self.calls), 2)
        agents = [
            argv[argv.index("--agent") + 1]
            for argv in self.calls
            if "--agent" in argv
        ]
        self.assertEqual(agents, ["state-doctor", "loop-triage"])

    def test_doctor_before_gate_only(self) -> None:
        # gates() en dry-run tambien pasa por run() -> 4 gates despues del doctor.
        rc = loop_piv.run_singletons(self._args(doctor=True, gate_only=True))
        self.assertEqual(rc, 0)
        self.assertEqual(len(self.calls), 5)
        first = self.calls[0]
        self.assertEqual(first[first.index("--agent") + 1], "state-doctor")

    def test_no_doctor_no_extra_calls(self) -> None:
        rc = loop_piv.run_singletons(self._args(triage=True))
        self.assertEqual(rc, 0)
        self.assertEqual(len(self.calls), 1)
        agents = [
            argv[argv.index("--agent") + 1]
            for argv in self.calls
            if "--agent" in argv
        ]
        self.assertEqual(agents, ["loop-triage"])

    def test_parse_args_accepts_doctor(self) -> None:
        import sys

        original = sys.argv
        sys.argv = ["loop_piv.py", "--doctor", "--dry-run"]
        try:
            args = loop_piv.parse_args()
        finally:
            sys.argv = original
        self.assertTrue(args.doctor)
        self.assertTrue(args.dry_run)

    def test_parse_args_defaults_doctor_false(self) -> None:
        import sys

        original = sys.argv
        sys.argv = ["loop_piv.py"]
        try:
            args = loop_piv.parse_args()
        finally:
            sys.argv = original
        self.assertFalse(args.doctor)


if __name__ == "__main__":
    unittest.main()