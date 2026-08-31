#!/usr/bin/env python3
"""
auto_improve.py — Motor de mejora automática para UltraIa.

Analiza las sesiones capturadas, el run-log, STATE.md y los planes
para generar mejoras a los loops, doctor, y configuración del proyecto.

Uso:
    python scripts/auto_improve.py analyze              # Analiza y sugiere mejoras
    python scripts/auto_improve.py apply                 # Aplica mejoras aprobadas
    python scripts/auto_improve.py sessions-report       # Reporte de sesiones
    python scripts/auto_improve.py loop-health           # Salud del loop PIVR
    python scripts/auto_improve.py generate-plan         # Genera plan de mejoras

Flujo:
    1. Lee sesiones de sessions/
    2. Extrae patrones (errores repetidos, gates que fallan, tiempo promedio)
    3. Genera sugerencias de mejora para loops/doctor/plans
    4. Si hay decision humana → aplica; si no → crea plan para proximo ciclo
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from collections import Counter, defaultdict

# ─── Config ──────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SESSIONS_DIR = PROJECT_ROOT / "sessions"
RUN_LOG = PROJECT_ROOT / "loop-run-log.md"
STATE_FILE = PROJECT_ROOT / "STATE.md"
PLANS_DIR = PROJECT_ROOT / ".opencode" / "plans"
IMPROVE_LOG = SESSIONS_DIR / "improvements.jsonl"


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


# ─── Analysis Functions ──────────────────────────────────────────────────

def analyze_sessions() -> dict:
    """Analiza todas las sesiones y extrae patrones."""
    patterns = {
        "total_sessions": 0,
        "total_interactions": 0,
        "common_errors": Counter(),
        "common_requests": Counter(),
        "shell_commands": Counter(),
        "files_modified": Counter(),
        "build_failures": 0,
        "build_successes": 0,
        "gate_results": Counter(),
        "session_durations": [],
        "topics": Counter(),
    }

    if not SESSIONS_DIR.exists():
        return patterns

    for md_file in SESSIONS_DIR.rglob("*.md"):
        if md_file.name == "INDEX.md":
            continue
        if md_file.suffix != ".md":
            continue

        patterns["total_sessions"] += 1
        content = md_file.read_text(encoding="utf-8", errors="ignore")

        # Count interactions
        interactions = re.findall(r"### \[.*?\] `(user|assistant|tool)`", content)
        patterns["total_interactions"] += len(interactions)

        # Extract errors
        errors = re.findall(r"(?:ERROR|FAIL|error|failed)[^\n]{0,200}", content)
        for err in errors:
            # Normalize error key
            key = err[:80].strip()
            patterns["common_errors"][key] += 1

        # Extract shell commands
        cmds = re.findall(r"```(?:bash|powershell|sh)\n(.*?)```", content, re.DOTALL)
        for cmd in cmds:
            first_line = cmd.strip().split("\n")[0][:100]
            patterns["shell_commands"][first_line] += 1

        # Extract modified files
        files = re.findall(r"(?:packages|apps|scripts)/[^\s\"'`]+\.(?:ts|tsx|py|js|jsx)", content)
        for f in files:
            patterns["files_modified"][f] += 1

        # Build results
        if "BUILD EXITOSO" in content or "build: ✅" in content.lower():
            patterns["build_successes"] += 1
        elif "BUILD FAILED" in content or "build: ❌" in content.lower():
            patterns["build_failures"] += 1

        # Gate results
        gates = re.findall(r"(typecheck|lint|test|build)[\s:]*(PASS|FAIL|✅|❌|0|EXIT)", content, re.IGNORECASE)
        for gate, result in gates:
            patterns["gate_results"][f"{gate.lower()}:{result.lower()}"] += 1

    return patterns


def analyze_loop_health() -> dict:
    """Analiza la salud del loop PIVR."""
    health = {
        "total_iterations": 0,
        "completed": 0,
        "failed": 0,
        "pending": 0,
        "avg_time_per_iteration": "unknown",
        "bottlenecks": [],
        "recommendations": [],
    }

    if not RUN_LOG.exists():
        return health

    content = RUN_LOG.read_text(encoding="utf-8", errors="ignore")

    # Count iterations
    iterations = re.findall(r"## Iteración (\d+)", content)
    health["total_iterations"] = len(iterations)

    # Count results
    verdicts = re.findall(r"\[R\].*?(?:DONE|PASS|GREEN|FAIL|RED|REJECT)", content, re.IGNORECASE)
    for v in verdicts:
        if any(w in v.upper() for w in ["DONE", "PASS", "GREEN"]):
            health["completed"] += 1
        elif any(w in v.upper() for w in ["FAIL", "RED", "REJECT"]):
            health["failed"] += 1

    # Pending tasks from STATE.md
    if STATE_FILE.exists():
        state = STATE_FILE.read_text(encoding="utf-8", errors="ignore")
        health["pending"] = state.count("| PENDIENTE |")
        health["blocked"] = state.count("| BLOQUEADO |")

    # Bottleneck detection
    if health["failed"] > health["completed"] * 0.3:
        health["bottlenecks"].append("High failure rate (>30%)")
    if health["pending"] > 5:
        health["bottlenecks"].append(f"Many pending tasks ({health['pending']})")

    # Recommendations
    if health["bottlenecks"]:
        health["recommendations"].append("Review failed iterations for patterns")
    if health["pending"] > 10:
        health["recommendations"].append("Prioritize or remove stale pending tasks")

    return health


def generate_improvements(patterns: dict, health: dict) -> list:
    """Genera sugerencias de mejora basadas en análisis."""
    improvements = []

    # Pattern: repeated errors → suggest fix
    for error, count in patterns["common_errors"].most_common(5):
        if count >= 3:
            improvements.append({
                "type": "error_pattern",
                "severity": "high",
                "description": f"Error repeated {count} times: {error[:100]}",
                "action": "investigate_and_fix",
                "auto_apply": False,
            })

    # Pattern: build failures
    if patterns["build_failures"] > 2:
        improvements.append({
            "type": "build_stability",
            "severity": "high",
            "description": f"Build failed {patterns['build_failures']} times across sessions",
            "action": "add_pre_commit_build_check",
            "auto_apply": True,
        })

    # Pattern: gate failures
    for gate, count in patterns["gate_results"].items():
        if "fail" in gate and count >= 3:
            gate_name = gate.split(":")[0]
            improvements.append({
                "type": "gate_failure",
                "severity": "medium",
                "description": f"Gate '{gate_name}' failed {count} times",
                "action": f"investigate_{gate_name}_failures",
                "auto_apply": False,
            })

    # Pattern: frequently modified files → suggest refactor
    for f, count in patterns["files_modified"].most_common(3):
        if count >= 5:
            improvements.append({
                "type": "hot_file",
                "severity": "medium",
                "description": f"File modified {count} times: {f}",
                "action": "consider_refactor_or_split",
                "auto_apply": False,
            })

    # Loop health issues
    for bottleneck in health.get("bottlenecks", []):
        improvements.append({
            "type": "loop_health",
            "severity": "medium",
            "description": bottleneck,
            "action": "review_loop_configuration",
            "auto_apply": False,
        })

    # Auto-apply: add build check to session start
    if patterns["build_failures"] >= 1:
        improvements.append({
            "type": "process",
            "severity": "low",
            "description": "Add mandatory build check at session start",
            "action": "update_session_protocol",
            "auto_apply": True,
        })

    return improvements


# ─── Commands ────────────────────────────────────────────────────────────

def cmd_analyze():
    """Analiza sesiones y genera sugerencias."""
    print("Analyzing sessions...")
    patterns = analyze_sessions()
    health = analyze_loop_health()
    improvements = generate_improvements(patterns, health)

    print(f"\n{'='*60}")
    print(f"SESSION ANALYSIS — {_now()}")
    print(f"{'='*60}")
    print(f"Total sessions: {patterns['total_sessions']}")
    print(f"Total interactions: {patterns['total_interactions']}")
    print(f"Build: {patterns['build_successes']} pass / {patterns['build_failures']} fail")
    print(f"\nTop shell commands:")
    for cmd, count in patterns["shell_commands"].most_common(10):
        print(f"  {count:3d}x  {cmd[:70]}")
    print(f"\nTop modified files:")
    for f, count in patterns["files_modified"].most_common(10):
        print(f"  {count:3d}x  {f}")
    print(f"\nTop errors:")
    for err, count in patterns["common_errors"].most_common(5):
        print(f"  {count:3d}x  {err[:80]}")

    print(f"\n{'='*60}")
    print("LOOP HEALTH")
    print(f"{'='*60}")
    print(f"Iterations: {health['total_iterations']}")
    print(f"Completed: {health['completed']}")
    print(f"Failed: {health['failed']}")
    print(f"Pending: {health.get('pending', '?')}")
    print(f"Blocked: {health.get('blocked', '?')}")
    if health["bottlenecks"]:
        print(f"\nBottlenecks:")
        for b in health["bottlenecks"]:
            print(f"  [!] {b}")

    print(f"\n{'='*60}")
    print(f"SUGGESTED IMPROVEMENTS ({len(improvements)})")
    print(f"{'='*60}")
    for i, imp in enumerate(improvements, 1):
        auto = " [AUTO-APPLY]" if imp["auto_apply"] else " [NEEDS DECISION]"
        print(f"\n{i}. [{imp['severity'].upper()}] {imp['description']}{auto}")
        print(f"   Action: {imp['action']}")

    # Save improvements log
    IMPROVE_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(IMPROVE_LOG, "a", encoding="utf-8") as f:
        entry = {
            "timestamp": _now(),
            "patterns": {
                "sessions": patterns["total_sessions"],
                "interactions": patterns["total_interactions"],
                "build_pass": patterns["build_successes"],
                "build_fail": patterns["build_failures"],
            },
            "health": {
                "iterations": health["total_iterations"],
                "completed": health["completed"],
                "failed": health["failed"],
            },
            "improvements_count": len(improvements),
        }
        f.write(json.dumps(entry) + "\n")

    return improvements


def cmd_apply():
    """Aplica mejoras auto-aprobadas (las que no requieren decision humana)."""
    improvements = generate_improvements(analyze_sessions(), analyze_loop_health())
    auto_apply = [i for i in improvements if i.get("auto_apply")]

    if not auto_apply:
        print("No auto-apply improvements found.")
        return

    print(f"Applying {len(auto_apply)} improvements...")
    for imp in auto_apply:
        print(f"  → {imp['description']}")
        # Here you would actually apply the improvement
        # For now, just log it
        IMPROVE_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(IMPROVE_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps({"applied": _now(), "improvement": imp}) + "\n")

    print("Done. Manual improvements require decision via chat.")


def cmd_sessions_report():
    """Reporte detallado de sesiones."""
    if not SESSIONS_DIR.exists():
        print("No sessions directory found.")
        return

    print(f"{'='*60}")
    print("SESSIONS REPORT")
    print(f"{'='*60}")

    for date_dir in sorted(SESSIONS_DIR.iterdir()):
        if not date_dir.is_dir():
            continue
        sessions = list(date_dir.glob("*.md"))
        if not sessions:
            continue
        print(f"\n[DATE] {date_dir.name} ({len(sessions)} sessions)")
        for s in sessions:
            content = s.read_text(encoding="utf-8", errors="ignore")
            lines = len(content.split("\n"))
            interactions = len(re.findall(r"### \[.*?\]", content))
            print(f"  [FILE] {s.stem} -- {lines} lines, {interactions} interactions")


def cmd_loop_health():
    """Solo muestra la salud del loop."""
    health = analyze_loop_health()
    print(json.dumps(health, indent=2))


def cmd_generate_plan():
    """Genera un plan de mejoras como archivo markdown."""
    patterns = analyze_sessions()
    health = analyze_loop_health()
    improvements = generate_improvements(patterns, health)

    plan_file = SESSIONS_DIR / f"improvement-plan-{datetime.now().strftime('%Y%m%d')}.md"
    plan_file.parent.mkdir(parents=True, exist_ok=True)

    content = f"""# Improvement Plan — {_now()}

Generated by `auto_improve.py` from session analysis.

## Current State

- Sessions analyzed: {patterns['total_sessions']}
- Total interactions: {patterns['total_interactions']}
- Build pass/fail: {patterns['build_successes']}/{patterns['build_failures']}
- Loop iterations: {health['total_iterations']}
- Loop completed: {health['completed']}
- Loop failed: {health['failed']}
- Pending tasks: {health.get('pending', '?')}

## Suggested Improvements

"""
    for i, imp in enumerate(improvements, 1):
        auto = " [AUTO-APPLY]" if imp["auto_apply"] else " [NEEDS DECISION]"
        content += f"""### {i}. [{imp['severity'].upper()}] {imp['description']}

- **Action:** {imp['action']}
- **Status:** {auto}

"""

    content += """## Next Steps

1. Review each improvement above
2. For auto-apply items: they will be applied on next run
3. For items needing decision: discuss in chat, then run `python scripts/auto_improve.py apply`
4. New plans will be generated in `.opencode/plans/` based on approved improvements
"""

    plan_file.write_text(content, encoding="utf-8")
    print(f"Plan written to: {plan_file}")
    print(f"Improvements: {len(improvements)} ({sum(1 for i in improvements if i.get('auto_apply'))} auto-apply)")


# ─── Main ────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]

    if cmd == "analyze":
        cmd_analyze()
    elif cmd == "apply":
        cmd_apply()
    elif cmd == "sessions-report":
        cmd_sessions_report()
    elif cmd == "loop-health":
        cmd_loop_health()
    elif cmd == "generate-plan":
        cmd_generate_plan()
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
