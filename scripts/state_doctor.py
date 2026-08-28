"""scripts/state_doctor.py - Check de integridad determinista de STATE.md (13 checks).

Version deterministica y rapida del skill state-integrity-check: no depende de
opencode. Lee STATE.md, loop-run-log.md, la raiz del repo y los espejos de skills,
corre los 13 checks y reporta issues. El driver loop_piv.py llama este script para
--doctor (en vez de lanzar un agente).

Uso:
    python scripts/state_doctor.py [--json] [--strict] [--root DIR] [--no-strict]

Exit: 0 si no hay issues (o solo info); 1 si hay issues (segun --strict).
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path

SCRIPT = Path(__file__).resolve()
DEFAULT_ROOT = SCRIPT.parent.parent

KILL_SWITCH = "loop-pause-all"
KILL_SWITCH_NEGATIONS = ("sin ", "sin`", "sin '", "sin \"", "ausente", "no activo", "without ")
KILL_SWITCH_EXTRA_NEG = ("mencione", "ocurrencia", "falso positivo", "matches")

CRITICAL_ROOT_FILES = [
    "package.json", "package-lock.json", "tsconfig.base.json", "AGENTS.md",
    "AGENT.md", "LOOP.md", "loop-constraints.md", "loop-budget.md",
    "loop-verifier.md", "opencode.json", "README.md", "start.py", "run-all.ps1",
    "STATE.md", "loop-run-log.md", ".gitignore",
]

SKILL_MIRRORS = [
    "loop-piv", "loop-triage", "loop-verifier", "state-integrity-check",
    "loop-budget", "loop-concurrency-guard", "loop-constraints", "ultraia-request",
]

LOCK_PATH = Path(".ultraia") / "loop" / "session.lock"
HEARTBEAT_MAX_S = 30 * 60


def _force_utf8() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconf = getattr(stream, "reconfigure", None)
        if callable(reconf):
            reconf(encoding="utf-8", errors="replace")


_force_utf8()


def run_git(root: Path, args: list[str]) -> tuple[int, str]:
    proc = subprocess.run(
        ["git"] + args, cwd=str(root), capture_output=True,
        text=True, encoding="utf-8", errors="replace", timeout=120, check=False,
    )
    return proc.returncode, (proc.stdout or "") + (proc.stderr or "")


def kill_switch_active(state_text: str, runlog_text: str) -> bool:
    for text in (state_text, runlog_text):
        for m in re.finditer(re.escape(KILL_SWITCH), text):
            prefix = text[max(0, m.start() - 24):m.start()].lower()
            if any(n in prefix for n in KILL_SWITCH_NEGATIONS) or any(
                n in prefix for n in KILL_SWITCH_EXTRA_NEG
            ):
                continue
            return True
    return False


def check_duplicate_ids(text: str) -> list[str]:
    ids = re.findall(r"^\|\s*(\d+)\s*\|", text, flags=re.MULTILINE)
    seen = {}
    dups = []
    for i in ids:
        seen[i] = seen.get(i, 0) + 1
    for i, c in seen.items():
        if c > 1:
            dups.append(f"#{i} ({c} filas)")
    return dups


def _table_spans(text: str) -> list[tuple[int, int]]:
    lines = text.splitlines()
    spans = []
    i = 0
    n = len(lines)
    row_re = re.compile(r"^\|.*\|\s*$")
    sep_re = re.compile(r"^\|[\s\-:|]+\|$")
    while i < n:
        if row_re.match(lines[i]):
            j = i
            has_sep = False
            while j < n and row_re.match(lines[j]):
                if sep_re.match(lines[j]):
                    has_sep = True
                j += 1
            if has_sep:
                spans.append((i, j))
            i = j
        else:
            i += 1
    return spans


def check_orphan_rows(text: str) -> list[str]:
    lines = text.splitlines()
    spans = _table_spans(text)
    in_span = [False] * len(lines)
    for a, b in spans:
        for k in range(a, b):
            in_span[k] = True
    orphans = []
    for idx, line in enumerate(lines):
        if in_span[idx]:
            continue
        m = re.match(r"^\|\s*(\d+)\s*\|", line)
        if m:
            orphans.append(f"#{m.group(1)} (fuera de tabla)")
    return orphans


def check_encoding(text: str) -> list[int]:
    out = []
    for n, line in enumerate(text.splitlines(), 1):
        if "\ufffd" in line:
            out.append(n)
    return out


def check_banner_desync(state_text: str, runlog_text: str) -> str | None:
    """Detect a LIVE pause banner in STATE.md.

    The kill-switch is token-based: a real pause requires the literal token
    `loop-pause-all` present in STATE.md/loop-run-log.md. A mere mention of
    PAUSADA/DETENIDA in historical prose (e.g. "Banner ITERACION 46 PAUSADA
    OBSOLETO eliminado...") must NOT be treated as a live pause, so we ignore
    any line that explicitly marks the banner as obsolete/removed/replaced.
    """
    pause = re.compile(r"PAUSADA|DETENIDA|esperando confirmaci", re.IGNORECASE)
    negation = re.compile(
        r"obsoleto|obsolete|eliminado|eliminada|reemplazado|reemplazada"
        r"|removido|removida|ya no|no vigente|cedi[óo]",
        re.IGNORECASE,
    )
    for line in state_text.splitlines():
        if pause.search(line) and not negation.search(line):
            if not kill_switch_active(state_text, runlog_text):
                return "banner dice pausado/deteniendo pero loop-pause-all esta AUSENTE"
    return None


def check_root_empty(root: Path) -> list[str]:
    out = []
    for name in CRITICAL_ROOT_FILES:
        p = root / name
        if p.exists() and p.stat().st_size == 0:
            out.append(name)
    return out


def check_mass_wipe(root: Path, now: float | None = None) -> list[str]:
    if now is None:
        now = time.time()
    empty = [n for n in CRITICAL_ROOT_FILES if (root / n).exists() and (root / n).stat().st_size == 0]
    if len(empty) < 2:
        return []
    mtimes = {}
    for n in empty:
        mt = root / n
        key = int(mt.stat().st_mtime)
        mtimes.setdefault(key, []).append(n)
    sig = []
    for mt, names in mtimes.items():
        if len(names) >= 2 and (now - mt) < 86400:
            sig.append(f"{len(names)} archivos @ mtime {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mt))}")
    return sig


def check_root_truncated(root: Path, git_fn=run_git) -> list[str]:
    # Una sola llamada: lista todos los blobs con su tamano en HEAD.
    out = []
    code, tree = git_fn(root, ["ls-tree", "-r", "-l", "HEAD"])
    if code != 0:
        return out
    for line in tree.splitlines():
        m = re.match(r"^\d+ blob [0-9a-f]+ (\d+)\t(.+)$", line)
        if not m:
            continue
        head_size = int(m.group(1))
        path = m.group(2).strip()
        cur = root / path
        if not cur.exists() or cur.stat().st_size == 0:
            continue
        if head_size > 0 and cur.stat().st_size < 0.5 * head_size:
            out.append(f"{path} ({cur.stat().st_size}/{head_size} bytes)")
    return out


def check_skill_mirrors(root: Path) -> list[str]:
    import hashlib

    def sha(p: Path) -> str:
        return hashlib.sha1(p.read_bytes()).hexdigest()[:12]

    out = []
    for name in SKILL_MIRRORS:
        a = root / ".opencode" / "skills" / name / "SKILL.md"
        b = root / "skills" / name / "SKILL.md"
        if a.exists() and b.exists():
            ha, hb = sha(a), sha(b)
            if ha != hb:
                out.append(f"{name} (.opencode={ha} root={hb})")
        elif a.exists() and not b.exists():
            out.append(f"{name} (solo .opencode, falta espejo root)")
    return out


def check_lock(root: Path) -> dict:
    p = root / LOCK_PATH
    if not p.exists():
        return {"state": "ausente", "session_id": None, "task_id": None}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {"state": "corrupto", "session_id": None, "task_id": None}
    hb = data.get("heartbeat_at") or data.get("started_at")
    try:
        age = time.time() - time.mktime(time.strptime(hb, "%Y-%m-%dT%H:%M:%S"))
    except Exception:
        age = 0
    state = "activo" if age <= HEARTBEAT_MAX_S else "stale"
    return {"state": state, "session_id": data.get("session_id"), "task_id": data.get("task_id")}


def check_staged(root: Path, git_fn=run_git) -> dict:
    code, out = git_fn(root, ["status", "--porcelain"])
    deletions = 0
    batch = 0
    if code == 0:
        for line in out.splitlines():
            s = line[:2]
            if s.strip():
                batch += 1
            if s.startswith("D"):
                rest = line[3:].strip()
                if rest.endswith(".ts") or rest.endswith(".test.ts"):
                    deletions += 1
    return {"deletions": deletions, "batch": batch}


def check_runlog_drift(runlog_text: str) -> str | None:
    entries = re.findall(r"\[R\][^\n]*", runlog_text)
    last_r = entries[-1] if entries else ""
    has_json = "```json" in runlog_text
    if not last_r:
        return "sin entradas [R] en loop-run-log.md"
    if not re.search(r"\[R\][^\n]*\b[0-9a-f]{6,}\b", last_r) and "commit" not in last_r.lower():
        return "ultima [R] sin hash de commit"
    if not has_json:
        return "loop-run-log.md sin bloque JSON de presupuesto"
    return None


def check_plan_collision(root: Path, git_fn=run_git) -> list[str]:
    files = []
    code, out = git_fn(root, ["ls-files", ".opencode/plans"])
    if code == 0:
        files += [l.strip() for l in out.splitlines() if l.strip()]
    d = root / ".opencode" / "plans"
    if d.exists():
        for p in d.glob("*.md"):
            rel = str(p.relative_to(root)).replace("\\", "/")
            if rel not in files:
                files.append(rel)
    groups = {}
    for f in files:
        m = re.match(r".*loop-(\d+)-", Path(f).name)
        if m:
            groups.setdefault(m.group(1), []).append(Path(f).name)
    return [f"task {tid} tiene {len(v)} plan files ({', '.join(v)})" for tid, v in groups.items() if len(v) >= 2]


def run_all(root: Path) -> dict:
    state = root / "STATE.md"
    runlog = root / "loop-run-log.md"
    state_text = state.read_text(encoding="utf-8", errors="replace") if state.exists() else ""
    runlog_text = runlog.read_text(encoding="utf-8", errors="replace") if runlog.exists() else ""

    issues = []

    def add(check: str, sev: str, detail: str) -> None:
        issues.append({"check": check, "severity": sev, "detail": detail})

    dups = check_duplicate_ids(state_text)
    for d in dups:
        add("duplicate-id", "warn", f"IDs duplicados: {d}")

    orphans = check_orphan_rows(state_text)
    for o in orphans:
        add("orphan-row", "warn", f"fila huerfana: {o}")

    desync = check_banner_desync(state_text, runlog_text)
    if desync:
        add("banner-desync", "red", desync)

    enc = check_encoding(state_text)
    if enc:
        add("encoding", "warn", f"{len(enc)} lineas con U+FFFD (lineas: {enc[:10]})")

    empties = check_root_empty(root)
    if empties:
        add("root-empty", "red", f"{len(empties)} archivos criticos a 0 bytes: {empties}")

    wipe = check_mass_wipe(root)
    if wipe:
        add("mass-wipe", "red", "; ".join(wipe))

    trunc = check_root_truncated(root)
    if trunc:
        add("root-truncated", "red", f"{len(trunc)} archivos <50% HEAD: {trunc}")

    mirrors = check_skill_mirrors(root)
    for m in mirrors:
        add("skill-mirror-desync", "warn", m)

    lock = check_lock(root)
    add("lock", "info", f"{lock['state']}" + (f" (task {lock['task_id']})" if lock["task_id"] else ""))

    staged = check_staged(root)
    if staged["deletions"]:
        add("staged-deletions", "warn", f"{staged['deletions']} .ts/.test.ts borrados en el indice")
    if staged["batch"] > 50:
        add("index-batch", "warn", f"{staged['batch']} archivos staged (>50)")

    drift = check_runlog_drift(runlog_text)
    if drift:
        add("run-log-drift", "warn", drift)

    collisions = check_plan_collision(root)
    for c in collisions:
        add("plan-collision", "warn", c)

    return {"issues": issues, "lock": lock}


def format_report(result: dict) -> str:
    issues = result["issues"]
    if not issues:
        return "STATE.md integrity: 0 issues - OK"
    lines = [f"STATE.md integrity: {len(issues)} issue(s)"]
    for it in issues:
        lines.append(f"- {it['check']}: {it['detail']}")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="Deterministic state integrity check (13 checks)")
    ap.add_argument("--root", default=str(DEFAULT_ROOT), help="repo root")
    ap.add_argument("--json", action="store_true", help="salida JSON")
    ap.add_argument("--strict", dest="strict", action="store_true", default=True, help="exit 1 si hay cualquier issue")
    ap.add_argument("--no-strict", dest="strict", action="store_false", help="exit 1 solo si hay red")
    args = ap.parse_args()
    root = Path(args.root).resolve()
    result = run_all(root)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(format_report(result))
    reds = [i for i in result["issues"] if i["severity"] == "red"]
    if reds:
        return 1
    if args.strict and result["issues"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
