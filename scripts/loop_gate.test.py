"""Test de regresion para scripts/loop_gate.py (gate runner determinista).

Verifica orden CI, short-circuit en fallo, kill antes de build (opt-in),
no-kill por defecto y continue-on-failure. Standalone, stdlib puro.

Uso: py -3.12 scripts/loop_gate.test.py
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loop_gate as lg  # noqa: E402


class GateRunnerTests(unittest.TestCase):
    def test_gate_order_is_ci_order(self) -> None:
        calls: list[str] = []

        def fake_run(argv, timeout):
            calls.append(argv[2])
            return 0, "ok"

        report = lg.run_gates(run=fake_run)
        self.assertEqual(calls, ["typecheck", "lint", "test", "build"])
        self.assertTrue(report["passed"])
        self.assertEqual(len(report["results"]), 4)

    def test_short_circuit_on_failure(self) -> None:
        calls: list[str] = []

        def fake_run(argv, timeout):
            calls.append(argv[2])
            return (0, "ok") if argv[2] != "lint" else (1, "lint failed")

        report = lg.run_gates(run=fake_run)
        # Se detiene en el primer fallo: build no corre.
        self.assertEqual(calls, ["typecheck", "lint"])
        self.assertFalse(report["passed"])
        self.assertEqual(len(report["results"]), 2)

    def test_kill_runs_before_any_gate_when_requested(self) -> None:
        order: list[str] = []

        def fake_kill() -> None:
            order.append("kill")

        with patch.object(lg, "kill_dev_servers", side_effect=fake_kill):

            def fake_run(argv, timeout):
                order.append("gate:" + argv[2])
                return 0, ""

            report = lg.run_gates(kill_dev=True, run=fake_run)
        self.assertTrue(order[0] == "kill")
        self.assertTrue(all(g.startswith("gate:") for g in order[1:]))
        self.assertTrue(report["killed"])

    def test_no_kill_by_default(self) -> None:
        with patch.object(lg, "kill_dev_servers") as mock_kill:

            def fake_run(argv, timeout):
                return 0, ""

            report = lg.run_gates(run=fake_run)
        mock_kill.assert_not_called()
        self.assertFalse(report["killed"])

    def test_continue_on_failure_runs_all_gates(self) -> None:
        calls: list[str] = []

        def fake_run(argv, timeout):
            calls.append(argv[2])
            return (0, "ok") if argv[2] != "lint" else (1, "lint failed")

        report = lg.run_gates(continue_on_failure=True, run=fake_run)
        self.assertEqual(calls, ["typecheck", "lint", "test", "build"])
        self.assertFalse(report["passed"])

    def test_report_shape_on_success(self) -> None:
        def fake_run(argv, timeout):
            return 0, ""

        report = lg.run_gates(run=fake_run)
        self.assertIn("passed", report)
        self.assertIn("results", report)
        self.assertIn("killed", report)
        self.assertTrue(report["passed"])
        for r in report["results"]:
            self.assertEqual(r["returncode"], 0)
            self.assertIn("duration_s", r)


if __name__ == "__main__":
    unittest.main(verbosity=2)
