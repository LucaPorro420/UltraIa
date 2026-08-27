import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(r'C:\Users\UTEC-5695\Desktop\UltraIa\scripts')
spec = importlib.util.spec_from_file_location("loop_triage", SCRIPTS / "loop_triage.py")
lt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lt)


def make_report(red=0, lock_state="ausente", divergence=0, deletions=0):
    import tempfile
    root = Path(tempfile.mkdtemp())
    issues = [{"check": "x", "severity": "red", "detail": "d"} for _ in range(red)]
    lt.state_doctor.run_all = lambda root: {
        "issues": issues,
        "lock": {"state": lock_state, "session_id": None, "task_id": "7" if lock_state == "activo" else None},
    }
    lt.state_doctor.check_staged = lambda root: {"deletions": deletions, "batch": deletions}
    lt.git_recent_commits = lambda root, hours=48: 10
    lt.git_divergence = lambda root: divergence
    lt.enlaces_age_hours = lambda root: 2.0
    return lt.triage_run(root)


class TriageRunTests(unittest.TestCase):
    def test_red_escalation(self):
        with tempfile.TemporaryDirectory() as d:
            r = make_report(red=1)
            self.assertTrue(any("RED" in e for e in r["escalations"]))
            self.assertIn("state_doctor", r["recommended_action"])

    def test_lock_activo_escalation(self):
        with tempfile.TemporaryDirectory() as d:
            r = make_report(red=0, lock_state="activo")
            self.assertTrue(any("ACTIVO" in e for e in r["escalations"]))
            self.assertIn("ceder", r["recommended_action"])

    def test_divergence_escalation(self):
        with tempfile.TemporaryDirectory() as d:
            r = make_report(red=0, divergence=5)
            self.assertTrue(any("5 commits" in e for e in r["escalations"]))

    def test_clean_no_escalations(self):
        with tempfile.TemporaryDirectory() as d:
            r = make_report(red=0, lock_state="ausente", divergence=0, deletions=0)
            self.assertEqual(r["escalations"], [])
            self.assertIn("Sin bloqueos", r["recommended_action"])


class ApplyWriteTests(unittest.TestCase):
    def _setup(self, with_sentinel=False):
        d = tempfile.mkdtemp()
        root = Path(d)
        state = root / "STATE.md"
        if with_sentinel:
            state.write_text("# STATE\n\n<!-- TRIAGE:AUTO:START -->\nOLD\n<!-- TRIAGE:AUTO:END -->\n", encoding="utf-8")
        else:
            state.write_text("# STATE\n\nbacklog here\n", encoding="utf-8")
        runlog = root / "loop-run-log.md"
        runlog.write_text("initial\n", encoding="utf-8")
        return root, state, runlog

    def test_new_sentinel(self):
        root, state, runlog = self._setup(False)
        report = {"ts": "2026-01-01T00:00:00", "items_found": {}, "escalations": ["e1"], "recommended_action": "haz X"}
        written = lt.apply_write(root, report)
        txt = state.read_text(encoding="utf-8")
        self.assertIn(lt.SENTINEL_START, txt)
        self.assertIn("haz X", txt)
        self.assertIn("e1", txt)
        # loop-run-log appendado
        self.assertIn("### Triage 2026-01-01T00:00:00", runlog.read_text(encoding="utf-8"))

    def test_existing_sentinel_replaced(self):
        root, state, runlog = self._setup(True)
        report = {"ts": "2026-02-02T00:00:00", "items_found": {}, "escalations": [], "recommended_action": "nuevo"}
        lt.apply_write(root, report)
        txt = state.read_text(encoding="utf-8")
        self.assertNotIn("OLD", txt)
        self.assertIn("nuevo", txt)
        # un solo bloque sentinel
        self.assertEqual(txt.count(lt.SENTINEL_START), 1)

    def test_idempotent_runs(self):
        root, state, runlog = self._setup(False)
        report = {"ts": "2026-03-03T00:00:00", "items_found": {}, "escalations": [], "recommended_action": "a"}
        lt.apply_write(root, report)
        lt.apply_write(root, report)
        self.assertEqual(state.read_text(encoding="utf-8").count(lt.SENTINEL_START), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
