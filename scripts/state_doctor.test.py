import importlib.util
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(r'C:\Users\UTEC-5695\Desktop\UltraIa\scripts')
spec = importlib.util.spec_from_file_location("state_doctor", SCRIPTS / "state_doctor.py")
sd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sd)


def fake_git(reply_status="", reply_ls="", reply_tree=""):
    def git_fn(root, args):
        if args and args[0] == "status":
            return (0, reply_status)
        if args and args[0] == "ls-files" and any("plans" in a for a in args):
            return (0, reply_ls)
        if args and args[0] == "ls-tree":
            return (0, reply_tree)
        return (0, "")
    return git_fn


class KillSwitchTests(unittest.TestCase):
    def test_active(self):
        self.assertTrue(sd.kill_switch_active("foo loop-pause-all bar", ""))

    def test_negation_sin(self):
        self.assertFalse(sd.kill_switch_active("sin loop-pause-all aqui", ""))

    def test_negation_backtick(self):
        self.assertFalse(sd.kill_switch_active("sin `loop-pause-all` activo", ""))

    def test_negation_no_activo(self):
        self.assertFalse(sd.kill_switch_active("no activo loop-pause-all", ""))

    def test_negation_false_positive(self):
        self.assertFalse(sd.kill_switch_active("mencione loop-pause-all en prosa", ""))


class DuplicateTests(unittest.TestCase):
    def test_duplicates(self):
        text = "| # | Tarea |\n|---|---|\n| 5 | a |\n| 5 | b |\n| 6 | c |\n"
        self.assertEqual(sd.check_duplicate_ids(text), ["#5 (2 filas)"])


class OrphanTests(unittest.TestCase):
    def test_broken_table_blank_line(self):
        text = ("| # | Tarea |\n|---|---|\n| 1 | a |\n| 2 | b |\n\n| 3 | c |\n| 4 | d |\n")
        orphans = sd.check_orphan_rows(text)
        self.assertIn("#3 (fuera de tabla)", orphans)
        self.assertIn("#4 (fuera de tabla)", orphans)
        self.assertNotIn("#1 (fuera de tabla)", orphans)

    def test_clean_table_no_orphans(self):
        text = "| # | Tarea |\n|---|---|\n| 1 | a |\n| 2 | b |\n"
        self.assertEqual(sd.check_orphan_rows(text), [])


class EncodingTests(unittest.TestCase):
    def test_replacement_char(self):
        text = "linea ok\nbad\ufffdline\notra\ufffd mas"
        self.assertEqual(sd.check_encoding(text), [2, 3])


class RootEmptyTests(unittest.TestCase):
    def test_empty_critical(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "STATE.md"
            p.write_text("", encoding="utf-8")
            (Path(d) / "package.json").write_text("{}", encoding="utf-8")
            out = sd.check_root_empty(Path(d))
            self.assertIn("STATE.md", out)
            self.assertNotIn("package.json", out)


class MassWipeTests(unittest.TestCase):
    def test_two_empty_recent(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "STATE.md").write_bytes(b"")
            (root / "package.json").write_bytes(b"")
            out = sd.check_mass_wipe(root)
            self.assertEqual(len(out), 1)

    def test_single_no_wipe(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "STATE.md").write_bytes(b"")
            self.assertEqual(sd.check_mass_wipe(Path(d)), [])


class SkillMirrorTests(unittest.TestCase):
    def test_desync(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            a = root / ".opencode" / "skills" / "loop-piv" / "SKILL.md"
            b = root / "skills" / "loop-piv" / "SKILL.md"
            a.parent.mkdir(parents=True)
            b.parent.mkdir(parents=True)
            a.write_text("AAA", encoding="utf-8")
            b.write_text("BBB", encoding="utf-8")
            out = sd.check_skill_mirrors(root)
            self.assertTrue(any("loop-piv" in x for x in out))

    def test_sync_ok(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            a = root / ".opencode" / "skills" / "loop-piv" / "SKILL.md"
            b = root / "skills" / "loop-piv" / "SKILL.md"
            a.parent.mkdir(parents=True)
            b.parent.mkdir(parents=True)
            a.write_text("SAME", encoding="utf-8")
            b.write_text("SAME", encoding="utf-8")
            self.assertEqual(sd.check_skill_mirrors(root), [])


class LockTests(unittest.TestCase):
    def test_ausente(self):
        with tempfile.TemporaryDirectory() as d:
            res = sd.check_lock(Path(d))
            self.assertEqual(res["state"], "ausente")

    def test_activo(self):
        import json, time
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / ".ultraia" / "loop").mkdir(parents=True)
            now = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime())
            (root / ".ultraia" / "loop" / "session.lock").write_text(
                json.dumps({"session_id": "x", "task_id": "5", "heartbeat_at": now}),
                encoding="utf-8",
            )
            res = sd.check_lock(root)
            self.assertEqual(res["state"], "activo")
            self.assertEqual(res["task_id"], "5")

    def test_stale(self):
        import json, time
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / ".ultraia" / "loop").mkdir(parents=True)
            old = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(time.time() - 3600))
            (root / ".ultraia" / "loop" / "session.lock").write_text(
                json.dumps({"session_id": "x", "heartbeat_at": old}), encoding="utf-8"
            )
            self.assertEqual(sd.check_lock(root)["state"], "stale")


class RunlogDriftTests(unittest.TestCase):
    def test_empty(self):
        self.assertIsNotNone(sd.check_runlog_drift(""))

    def test_ok(self):
        text = "### [R] ciclo 1 commit abc1234\n```json\n{}\n```\n"
        self.assertIsNone(sd.check_runlog_drift(text))

    def test_no_json(self):
        text = "### [R] ciclo 1 commit abc1234\n"
        self.assertIsNotNone(sd.check_runlog_drift(text))


class PlanCollisionTests(unittest.TestCase):
    def test_collision(self):
        git_fn = fake_git(reply_ls=".opencode/plans/loop-12-a.md\n.opencode/plans/loop-12-b.md\n")
        out = sd.check_plan_collision(Path("/tmp"), git_fn)
        self.assertEqual(len(out), 1)
        self.assertIn("task 12", out[0])

    def test_no_collision(self):
        git_fn = fake_git(reply_ls=".opencode/plans/loop-12-a.md\n.opencode/plans/loop-13-b.md\n")
        self.assertEqual(sd.check_plan_collision(Path("/tmp"), git_fn), [])


class TruncatedTests(unittest.TestCase):
    def test_truncated(self):
        # HEAD blob 100 bytes, current file 10 bytes -> <50%
        git_fn = fake_git(reply_tree="100644 blob abc 100\tpackage.json\n")
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "package.json").write_text("x" * 10, encoding="utf-8")
            out = sd.check_root_truncated(root, git_fn)
            self.assertTrue(any("package.json" in x for x in out))

    def test_not_truncated(self):
        git_fn = fake_git(reply_tree="100644 blob abc 100\tpackage.json\n")
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "package.json").write_text("x" * 90, encoding="utf-8")
            self.assertEqual(sd.check_root_truncated(root, git_fn), [])


class StagedTests(unittest.TestCase):
    def test_deletions(self):
        git_fn = fake_git(reply_status="D  packages/core/src/x.ts\nD  packages/core/src/y.test.ts\n M other.md\n")
        res = sd.check_staged(Path("/tmp"), git_fn)
        self.assertEqual(res["deletions"], 2)
        self.assertEqual(res["batch"], 3)


class ReportTests(unittest.TestCase):
    def test_format_ok(self):
        self.assertEqual(sd.format_report({"issues": []}), "STATE.md integrity: 0 issues - OK")

    def test_format_issues(self):
        r = {"issues": [{"check": "x", "severity": "warn", "detail": "d"}]}
        self.assertIn("- x: d", sd.format_report(r))


class BannerDesyncTests(unittest.TestCase):
    def test_live_banner_without_kill_switch_flags(self):
        state = "# Loop State\n- ITERACION 99 PAUSADA (28/08/2026) - esperando confirmacion\n"
        self.assertIsNotNone(sd.check_banner_desync(state, ""))

    def test_historical_prose_is_ignored(self):
        state = ('> Banner "ITERACION 46 PAUSADA" OBSOLETO eliminado por state-doctor.\n'
                 '> banner "ITERACION 46 PAUSADA" reemplazado por estado real.\n')
        self.assertIsNone(sd.check_banner_desync(state, ""))

    def test_kill_switch_suppresses(self):
        state = "loop-pause-all\n- ITERACION 99 PAUSADA\n"
        self.assertIsNone(sd.check_banner_desync(state, "loop-pause-all"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
