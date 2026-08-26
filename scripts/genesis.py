#!/usr/bin/env python3
"""Genesis Operator Console - UltraIa Autonomous Engineering.

Thin operator layer over the EXISTING genesis engine (packages/core
tools/genesis.ts + genesis-runner.ts via `npm run genesis`) and the PIVR harness
(scripts/loop_piv.py). This console NEVER reimplements the engine; it wraps,
validates and reports so any agent/human can operate the system:

    py -3.12 scripts/genesis.py manifest                 # validate root contract
    py -3.12 scripts/genesis.py doctor                   # pre-flight report
    py -3.12 scripts/genesis.py inspect                  # repo snapshot counts
    py -3.12 scripts/genesis.py gates                    # CI-order quality gates
    py -3.12 scripts/genesis.py run [--cycles N]         # PIVR cycles (delegates)
    py -3.12 scripts/genesis.py triage                   # daily triage (delegates)
    py -3.12 scripts/genesis.py registry validate        # research-registry schema
    py -3.12 scripts/genesis.py registry add --file E    # validated entry insert
    py -3.12 scripts/genesis.py project new <slug>       # instantiate template
    py -3.12 scripts/genesis.py wifi status              # read-only WLAN report
    py -3.12 scripts/genesis.py wifi ensure --ensure     # connect IF double guard

Fail-soft by design: every command reports and exits 0 on soft conditions;
exit 1 only when a requested action truly failed (gates red, invalid manifest).
ASCII-only output (PowerShell 5.1 console safe).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / "genesis.json"
REGISTRY_PATH = ROOT / "genesis" / "research-registry.json"
TEMPLATE_PATH = ROOT / "genesis" / "projects" / "_TEMPLATE.genesis.json"
PROJECTS_DIR = ROOT / "genesis" / "projects"
STATE_MD = ROOT / "STATE.md"
RUN_LOG = ROOT / "loop-run-log.md"
LOCK_FILE = ROOT / ".ultraia" / "loop" / "session.lock"
GENESIS_STATE = ROOT / ".ultraia" / "genesis" / "state.json"
LOOP_DRIVER = ROOT / "scripts" / "loop_piv.py"

DECISIONS = ("integrate", "adapt", "study", "reject")
DIFFICULTIES = ("low", "medium", "high", "n/a (patron, no codigo)")
RISKS = ("low", "medium", "high")
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,63}$")


# ---------------------------------------------------------------------------
# Pure validators (unit-tested)
# ---------------------------------------------------------------------------

def validate_manifest(obj: Any) -> Tuple[bool, List[str]]:
    """Structural mirror of packages/core tools/genesis.ts zod essentials."""
    errors: List[str] = []
    if not isinstance(obj, dict):
        return False, ["manifest must be a JSON object"]
    project = obj.get("project")
    if not isinstance(project, dict):
        errors.append("project object required")
    else:
        if not isinstance(project.get("id"), str) or not project.get("id"):
            errors.append("project.id string required")
        if "name" in project and not isinstance(project["name"], str):
            errors.append("project.name must be string")
    obj_obj = obj.get("objective")
    if obj_obj is not None:
        if not isinstance(obj_obj, dict):
            errors.append("objective must be object")
        elif "primary" in obj_obj and not isinstance(obj_obj.get("primary"), str):
            errors.append("objective.primary must be string")
    gates = obj.get("quality_gates")
    if gates is not None:
        if not isinstance(gates, dict):
            errors.append("quality_gates must be object")
        else:
            for gname, g in gates.items():
                if not isinstance(g, dict):
                    errors.append(f"quality_gates.{gname} must be object")
                elif "required" in g and not isinstance(g["required"], bool):
                    errors.append(f"quality_gates.{gname}.required must be bool")
    auto = obj.get("autonomy")
    if auto is not None:
        if not isinstance(auto, dict):
            errors.append("autonomy must be object")
        else:
            lvl = auto.get("level")
            if lvl is not None and (not isinstance(lvl, int) or not 0 <= lvl <= 3):
                errors.append("autonomy.level must be int 0..3")
            ra = auto.get("repair_attempts")
            if ra is not None and (not isinstance(ra, int) or ra < 0):
                errors.append("autonomy.repair_attempts must be int >= 0")
    pipeline = obj.get("pipeline")
    if pipeline is not None:
        if not isinstance(pipeline, dict):
            errors.append("pipeline must be object")
        else:
            steps = pipeline.get("steps")
            if steps is not None and not (
                isinstance(steps, list) and all(isinstance(s, str) for s in steps)
            ):
                errors.append("pipeline.steps must be string[]")
    return len(errors) == 0, errors


def validate_registry_entry(entry: Any) -> Tuple[bool, List[str]]:
    """Schema per InfoPeticion.txt section 6 (Research Registry)."""
    errors: List[str] = []
    if not isinstance(entry, dict):
        return False, ["entry must be a JSON object"]
    for field in ("repository", "url"):
        v = entry.get(field)
        if not isinstance(v, str) or not v.strip():
            errors.append(f"{field} non-empty string required")
    decision = entry.get("decision")
    if decision not in DECISIONS:
        errors.append(f"decision must be one of {DECISIONS}")
    diff = entry.get("integration_difficulty")
    diff_ok = isinstance(diff, str) and (
        diff.startswith(("low", "medium", "high")) or diff == "n/a (patron, no codigo)"
    )
    if not diff_ok:
        errors.append("integration_difficulty low|medium|high|n/a required")
    risk = entry.get("security_risk")
    if risk not in RISKS:
        errors.append(f"security_risk must be one of {RISKS}")
    reason = entry.get("reason")
    if not isinstance(reason, str) or len(reason.strip()) < 10:
        errors.append("reason string >=10 chars required")
    evidence = entry.get("evidence")
    if not isinstance(evidence, list) or not evidence or not all(
        isinstance(e, str) and e.strip() for e in evidence
    ):
        errors.append("evidence non-empty string[] required")
    for opt in ("license", "last_activity", "architecture"):
        if opt in entry and entry[opt] is not None and not isinstance(entry[opt], str):
            errors.append(f"{opt} must be string|null")
    stars = entry.get("stars")
    if stars is not None and not isinstance(stars, int):
        errors.append("stars must be number|null")
    comps = entry.get("useful_components")
    if comps is not None and not (
        isinstance(comps, list) and all(isinstance(c, str) for c in comps)
    ):
        errors.append("useful_components must be string[]|null")
    return len(errors) == 0, errors


def parse_wifi_interfaces(netsh_output: str) -> Dict[str, Any]:
    """Parse `netsh wlan show interfaces` into a compact dict (pure)."""
    result: Dict[str, Any] = {"available": False, "interfaces": []}
    if not netsh_output or "WLAN" not in netsh_output.upper():
        # Localized Windows may translate headers; still try key:value pairs.
        pass
    current: Dict[str, str] = {}
    for raw_line in netsh_output.splitlines():
        line = raw_line.strip()
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key_l = key.strip().lower().replace("ñ", "n")
        value = value.strip()
        if "ssid" in key_l and "bssid" not in key_l and value:
            current["ssid"] = value
        elif ("state" in key_l or "estado" in key_l) and value:
            current["state"] = value
        elif "signal" in key_l or "senal" in key_l:
            if value:
                current["signal"] = value
        elif "description" in key_l or "descripcion" in key_l:
            if value:
                current["adapter"] = value
    if current:
        result["available"] = True
        result["interfaces"].append(current)
    return result


KILL_SWITCH_NEGATIONS = (
    "sin ", "sin`", "sin '", 'sin "', "ausente", "no activo", "without ",
    # iter-112 genesis (26/08/2026): prosa diagnostica sobre el token (L2294,
    # "8 menciones de `loop-pause-all`...") NO es una orden de pausa.
    "mencione", "ocurrencia", "falso positivo", "matches",
)


def kill_switch_active(state_md_text: str, run_log_text: str) -> Tuple[bool, str]:
    """Detect an ACTIVE loop-pause-all token (ignores prose mentions).

    Same semantics as scripts/loop_piv.py::kill_switch_active (iter-68 + L2294
    fix): each occurrence is checked against negation / meta-mention markers in
    its ~24-char prefix. The window stays at 24 so a REAL directive later on
    the same line is NOT shadowed by an earlier negated mention (regression
    covered by both suites).
    """
    for name, text in (("STATE.md", state_md_text), ("loop-run-log.md", run_log_text)):
        if not text:
            continue
        for match in re.finditer(re.escape("loop-pause-all"), text):
            prefix = text[max(0, match.start() - 24):match.start()].lower()
            if any(neg in prefix for neg in KILL_SWITCH_NEGATIONS):
                continue  # prose mention (documentation/report), not an order
            return True, name
    return False, ""


def build_project_manifest(template: Dict[str, Any], slug: str, name: str) -> Dict[str, Any]:
    """Instantiate the template deterministically (pure)."""
    import copy

    manifest = copy.deepcopy(template)
    proj = manifest.setdefault("project", {})
    proj["id"] = slug
    proj["name"] = name or slug
    proj["stage"] = "idea"
    return manifest


def atomic_write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2, ensure_ascii=False)
        os.replace(tmp_name, str(path))
    finally:
        if os.path.exists(tmp_name):
            try:
                os.remove(tmp_name)
            except OSError:
                pass


def load_json(path: Path) -> Tuple[Optional[Any], str]:
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle), ""
    except FileNotFoundError:
        return None, f"not found: {path}"
    except json.JSONDecodeError as exc:
        return None, f"invalid JSON in {path}: {exc}"


# ---------------------------------------------------------------------------
# Subprocess helpers (fail-soft)
# ---------------------------------------------------------------------------

def run_cmd(args: List[str], timeout: int = 60) -> Tuple[int, str]:
    try:
        proc = subprocess.run(
            args, capture_output=True, text=True, timeout=timeout,
            shell=False, cwd=str(ROOT),
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        return proc.returncode, out
    except FileNotFoundError:
        return 127, f"command not found: {args[0]}"
    except subprocess.TimeoutExpired:
        return 124, f"timeout after {timeout}s: {' '.join(args)}"


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_manifest(path: str) -> int:
    target = ROOT / path if path else MANIFEST_PATH
    data, err = load_json(target)
    if data is None:
        print(f"[manifest] FAIL: {err}")
        return 1
    ok, errors = validate_manifest(data)
    if ok:
        pid = (data.get("project") or {}).get("id", "?")
        steps = ((data.get("pipeline") or {}).get("steps") or [])
        print(f"[manifest] OK: {target.name} (project.id={pid}, steps={len(steps)})")
        return 0
    for e in errors:
        print(f"[manifest] FAIL: {e}")
    return 1


def cmd_doctor() -> int:
    findings: List[Tuple[str, str]] = []  # (status, detail)

    # Kill switch (token activo, ignorando negaciones)
    sw_state = ""
    sw_log = ""
    try:
        sw_state = STATE_MD.read_text(encoding="utf-8", errors="replace")[:200000]
    except OSError:
        pass
    try:
        sw_log = RUN_LOG.read_text(encoding="utf-8", errors="replace")[-200000:]
    except OSError:
        pass
    active, where = kill_switch_active(sw_state, sw_log)
    findings.append(("FAIL" if active else "PASS",
                     f"kill switch {'ACTIVE in ' + where if active else 'inactive'}"))

    # Concurrency lock (status-aware: CERRADA/CEDIDA = free; heartbeat decides)
    lock_note = "lock free"
    lock_status = "PASS"
    if LOCK_FILE.exists():
        lock_data, _ = load_json(LOCK_FILE)
        status = str((lock_data or {}).get("status", "")).upper() if isinstance(lock_data, dict) else ""
        if status.startswith("CERRADA") or status.startswith("CEDIDA"):
            lock_status, lock_note = "PASS", f"lock closed ({status or 'closed'})"
        else:
            lock_status, lock_note = "WARN", "lock held by another session"
    findings.append((lock_status, lock_note))

    # Git tree
    code, out = run_cmd(["git", "status", "--porcelain"])
    dirty = len([l for l in out.splitlines() if l.strip()]) if code == 0 else -1
    findings.append(("WARN" if dirty > 0 else "PASS", f"git working tree entries={dirty}"))

    # Prereqs versions
    code, out = run_cmd(["node", "--version"])
    node_v = out.strip().splitlines()[0] if code == 0 and out.strip() else "missing"
    try:
        node_ok = code == 0 and int(node_v.lstrip("v").split(".")[0]) >= 20
    except (ValueError, IndexError):
        node_ok = False
    findings.append(("PASS" if node_ok else "FAIL", f"node {node_v} (need >=20)"))

    findings.append(("PASS", f"python {sys.version_info.major}.{sys.version_info.minor}"))

    # Genesis runtime state
    st, _err = load_json(GENESIS_STATE)
    findings.append(("PASS" if st else "INFO",
                     "genesis state.json present" if st else "genesis never run (state absent)"))

    # WiFi (read-only)
    wifi = wifi_status_dict()
    if wifi.get("available"):
        iface = (wifi.get("interfaces") or [{}])[0]
        findings.append(("PASS",
                         f"wlan ssid={iface.get('ssid', '?')} state={iface.get('state', '?')}"))
    else:
        findings.append(("INFO", "wlan unavailable or no wireless interfaces"))

    hard_fail = False
    for status, detail in findings:
        print(f"[doctor] {status}: {detail}")
        if status == "FAIL":
            hard_fail = True
    print("[doctor] summary:",
          "RED (fix FAIL items)" if hard_fail else "GREEN (report-only)")
    return 0  # doctor is report-only


def cmd_inspect() -> int:
    skills = sorted(p.name for p in (ROOT / ".opencode" / "skills").iterdir() if p.is_dir()) \
        if (ROOT / ".opencode" / "skills").exists() else []
    tools_dir = ROOT / "packages" / "core" / "src" / "tools"
    caps = sorted(p.stem for p in tools_dir.glob("*.ts") if not p.name.endswith(".test.ts")) \
        if tools_dir.exists() else []

    pendientes = 0
    done_rows = 0
    try:
        text = STATE_MD.read_text(encoding="utf-8", errors="replace")
        for line in text.splitlines():
            if re.match(r"^\|\s*\d+", line):
                if "DONE" in line.upper():
                    done_rows += 1
                else:
                    pendientes += 1
    except OSError:
        pass

    registry, _err = load_json(REGISTRY_PATH)
    reg_count = len(registry.get("entries", [])) if isinstance(registry, dict) else 0

    print("[inspect] skills:", len(skills))
    print("[inspect] core capability modules:", len(caps))
    print("[inspect] backlog rows: DONE =", done_rows, "| pending =", pendientes)
    print("[inspect] research-registry entries:", reg_count)
    print("[inspect] engine cli:", "npm run genesis")
    print("[inspect] operator console:", "py -3.12 scripts/genesis.py")
    return 0


GATE_ORDER = ["typecheck", "lint", "test", "build"]


def cmd_gates(only: Optional[List[str]]) -> int:
    names = [g for g in GATE_ORDER if not only or g in only]
    t0 = datetime.now(timezone.utc)
    for gate in names:
        print(f"[gates] >> npm run {gate} ...", flush=True)
        code, out = run_cmd(["npm", "run", gate], timeout=900)
        tail = "\n".join(out.strip().splitlines()[-6:])
        if code != 0:
            print(f"[gates] FAIL {gate} (exit {code})\n{tail}")
            return 1
        print(f"[gates] PASS {gate}")
    dt = (datetime.now(timezone.utc) - t0).total_seconds()
    print(f"[gates] ALL GREEN ({dt:.0f}s)")
    return 0


def _delegate_driver(extra_args: List[str]) -> int:
    if not LOOP_DRIVER.exists():
        print("[driver] FAIL: missing scripts/loop_piv.py")
        return 1
    print(f"[driver] >> {sys.executable} scripts/loop_piv.py {' '.join(extra_args)}", flush=True)
    try:
        proc = subprocess.run([sys.executable, str(LOOP_DRIVER)] + extra_args, cwd=str(ROOT))
        return proc.returncode
    except KeyboardInterrupt:
        print("\n[driver] interrupted")
        return 130


def cmd_registry_validate() -> int:
    registry, err = load_json(REGISTRY_PATH)
    if registry is None:
        print(f"[registry] FAIL: {err}")
        return 1
    if not isinstance(registry, dict) or not isinstance(registry.get("entries"), list):
        print("[registry] FAIL: entries[] missing")
        return 1
    bad = 0
    seen_repos = set()
    for i, entry in enumerate(registry["entries"]):
        ok, errors = validate_registry_entry(entry)
        if not ok:
            bad += 1
            repo = entry.get("repository", "?") if isinstance(entry, dict) else "?"
            print(f"[registry] entry[{i}] {repo}:")
            for e in errors:
                print(f"[registry]   - {e}")
        else:
            key = entry.get("repository", "")
            if key in seen_repos:
                bad += 1
                print(f"[registry] entry[{i}] duplicate repository: {key}")
            seen_repos.add(key)
    decisions: Dict[str, int] = {}
    for entry in registry["entries"]:
        d = entry.get("decision", "?") if isinstance(entry, dict) else "?"
        decisions[d] = decisions.get(d, 0) + 1
    print(f"[registry] entries={len(registry['entries'])} invalid={bad} "
          f"decisions={json.dumps(decisions, sort_keys=True)}")
    return 1 if bad else 0


def cmd_registry_add(file_path: str) -> int:
    entry, err = load_json(ROOT / file_path)
    if entry is None:
        print(f"[registry] FAIL: {err}")
        return 1
    ok, errors = validate_registry_entry(entry)
    if not ok:
        for e in errors:
            print(f"[registry] FAIL: {e}")
        return 1
    registry, err2 = load_json(REGISTRY_PATH)
    if registry is None or not isinstance(registry, dict):
        print(f"[registry] FAIL: {err2 or 'bad registry'}")
        return 1
    repos = {e.get("repository") for e in registry.get("entries", [])
             if isinstance(e, dict)}
    if entry.get("repository") in repos:
        print(f"[registry] SKIP duplicate repository: {entry.get('repository')}")
        return 0
    registry.setdefault("entries", []).append(entry)
    atomic_write_json(REGISTRY_PATH, registry)
    print(f"[registry] added: {entry.get('repository')} "
          f"(total={len(registry['entries'])})")
    return 0


def cmd_project_new(slug: str, name: Optional[str]) -> int:
    if not SLUG_RE.match(slug):
        print(f"[project] FAIL: slug '{slug}' must match ^[a-z0-9][a-z0-9-]{{1,63}}$")
        return 1
    target_dir = PROJECTS_DIR / slug
    target = target_dir / "genesis.json"
    if target.exists():
        print(f"[project] FAIL: already exists: {target}")
        return 1
    template, err = load_json(TEMPLATE_PATH)
    if template is None:
        print(f"[project] FAIL: {err}")
        return 1
    manifest = build_project_manifest(template, slug, name or slug)
    ok, errors = validate_manifest(manifest)
    if not ok:
        for e in errors:
            print(f"[project] FAIL template produces invalid manifest: {e}")
        return 1
    atomic_write_json(target, manifest)
    print(f"[project] created: {target}")
    print(f"[project] validate:  py -3.12 scripts/genesis.py manifest "
          f"genesis/projects/{slug}/genesis.json")
    print(f"[project] run:       vite-node scripts/genesis-run.ts "
          f"--manifest genesis/projects/{slug}/genesis.json")
    return 0


def wifi_status_dict() -> Dict[str, Any]:
    code, out = run_cmd(["netsh", "wlan", "show", "interfaces"], timeout=30)
    if code != 0:
        return {"available": False, "reason": f"netsh exit {code}"}
    return parse_wifi_interfaces(out)


def cmd_wifi(ensure: bool) -> int:
    wifi = wifi_status_dict()
    if not wifi.get("available"):
        reason = wifi.get("reason", "no interfaces parsed")
        print(f"[wifi] unavailable: {reason}")
        if not ensure:
            return 0
        print("[wifi] cannot ensure connectivity without a WLAN interface")
        return 0

    iface = (wifi.get("interfaces") or [{}])[0]
    ssid_env = os.environ.get("GENESIS_WIFI_SSID", "").strip()
    state = iface.get("state", "").lower()

    if not ensure:
        print(f"[wifi] adapter={iface.get('adapter', '?')}")
        print(f"[wifi] ssid={iface.get('ssid', '?')} state={iface.get('state', '?')} "
              f"signal={iface.get('signal', '?')}")
        connected = "connect" in state and "disconnect" not in state
        if not connected and ssid_env:
            print(f"[wifi] hint: py -3.12 scripts/genesis.py wifi ensure --ensure "
                  f"(env GENESIS_WIFI_SSID={ssid_env} is set)")
        elif not connected:
            print("[wifi] hint: set GENESIS_WIFI_SSID=<your network> then rerun "
                  "with 'wifi ensure --ensure' to allow auto-reconnect")
        return 0

    # ensure mode: double guard enforced here
    if not ssid_env:
        print("[wifi] ensure REFUSED: env GENESIS_WIFI_SSID not set (double guard)")
        return 0
    if "connect" in state and "disconnect" not in state:
        print(f"[wifi] already connected: ssid={iface.get('ssid', '?')}")
        return 0
    print(f"[wifi] connecting to '{ssid_env}' ...")
    code, out = run_cmd(["netsh", "wlan", "connect", f"name={ssid_env}"], timeout=60)
    if code == 0:
        print("[wifi] connect command issued OK")
        return 0
    print(f"[wifi] connect FAILED (exit {code}): {out.strip().splitlines()[:3]}")
    return 1


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(prog="genesis", description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="cmd")

    p_man = sub.add_parser("manifest", help="validate a genesis manifest (default: root)")
    p_man.add_argument("path", nargs="?", default="", help="manifest path relative to root")

    sub.add_parser("doctor", help="pre-flight report (read-only)")

    sub.add_parser("inspect", help="repo snapshot counts")

    p_gates = sub.add_parser("gates", help="CI-order quality gates")
    p_gates.add_argument("--only", nargs="*", default=None,
                         help=f"subset of {GATE_ORDER}")

    p_run = sub.add_parser("run", help="delegate to PIVR driver cycles")
    p_run.add_argument("--cycles", type=int, default=None)
    p_run.add_argument("--dry-run", action="store_true")

    sub.add_parser("triage", help="delegate to PIVR daily triage")

    p_reg = sub.add_parser("registry", help="research-registry operations")
    p_reg_sub = p_reg.add_subparsers(dest="reg_cmd", required=True)
    p_reg_sub.add_parser("validate", help="validate registry schema")
    p_add = p_reg_sub.add_parser("add", help="add one validated entry")
    p_add.add_argument("--file", required=True, help="JSON file with the entry")

    p_new = sub.add_parser("project", help="multi-project operations")
    p_new_sub = p_new.add_subparsers(dest="proj_cmd", required=True)
    p_create = p_new_sub.add_parser("new", help="instantiate a project manifest")
    p_create.add_argument("slug")
    p_create.add_argument("--name", default=None)

    p_wifi = sub.add_parser("wifi", help="WLAN keepalive (guarded)")
    p_wifi.add_argument("action", nargs="?", default="status",
                        choices=["status", "ensure"])
    p_wifi.add_argument("--ensure", action="store_true",
                        help="REQUIRED second guard for connect action")

    args = parser.parse_args(argv)
    if args.cmd is None:
        parser.print_help()
        return 0
    if args.cmd == "manifest":
        return cmd_manifest(args.path)
    if args.cmd == "doctor":
        return cmd_doctor()
    if args.cmd == "inspect":
        return cmd_inspect()
    if args.cmd == "gates":
        return cmd_gates(args.only)
    if args.cmd == "run":
        extra: List[str] = []
        if args.cycles:
            extra += ["--cycles", str(args.cycles)]
        if args.dry_run:
            extra += ["--dry-run"]
        return _delegate_driver(extra)
    if args.cmd == "triage":
        return _delegate_driver(["--triage"])
    if args.cmd == "registry":
        if args.reg_cmd == "validate":
            return cmd_registry_validate()
        if args.reg_cmd == "add":
            return cmd_registry_add(args.file)
        return 2
    if args.cmd == "project":
        if args.proj_cmd == "new":
            return cmd_project_new(args.slug, args.name)
        return 2
    if args.cmd == "wifi":
        return cmd_wifi(ensure=args.ensure)
    return 2


if __name__ == "__main__":
    sys.exit(main())
