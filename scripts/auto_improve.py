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
import io
from datetime import datetime, timezone
from pathlib import Path
from collections import Counter, defaultdict

# Windows UTF-8 fix
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

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


def analyze_loop_run_log() -> dict:
    """Parse loop-run-log.md for real iteration data."""
    data = {
        "iterations": [],  # [{num, phases, result, hash, date}]
        "phase_failures": Counter(),  # which phase fails most
        "recent_hashes": [],  # last N commit hashes
        "total": 0,
        "done": 0,
        "failed": 0,
        "pending": 0,
        "unknown": 0,
    }

    if not RUN_LOG.exists():
        return data

    content = RUN_LOG.read_text(encoding="utf-8", errors="ignore")

    # Parse iteration blocks: ## Iteración N or ## Iteracion N
    iter_blocks = re.split(r"## Iteraci[oó]n (\d+)", content)
    # iter_blocks[0] is before first iteration, then alternating num/content

    for i in range(1, len(iter_blocks), 2):
        num = int(iter_blocks[i])
        body = iter_blocks[i + 1] if i + 1 < len(iter_blocks) else ""

        # Extract phases present [P], [I], [V], [R]
        phases = []
        for phase in ["[P]", "[I]", "[V]", "[R]"]:
            if phase in body:
                phases.append(phase.strip("[]"))

        # Find [R] verdict: look for **[R] Veredicto** then the next non-empty line
        result = "unknown"
        commit_hash = ""
        r_idx = body.find("**[R]")
        if r_idx >= 0:
            # Get the lines after **[R]**
            after_r = body[r_idx:]
            lines_after = [l.strip() for l in after_r.split("\n") if l.strip() and l.strip() != "**[R] Veredicto**"]
            if lines_after:
                verdict_line = lines_after[0]
                if re.search(r"GREEN|DONE|PASS|APPROVE|commit hecho", verdict_line, re.IGNORECASE):
                    result = "done"
                elif re.search(r"RED|FAIL|REJECT|SKIP|CEDIDO|pausado", verdict_line, re.IGNORECASE):
                    result = "failed"
                elif re.search(r"PENDIENTE|BLOCKED|WIP", verdict_line, re.IGNORECASE):
                    result = "pending"

                # Extract commit hash from verdict line
                hash_match = re.search(r"`([0-9a-f]{7,40})`", verdict_line)
                if hash_match:
                    commit_hash = hash_match.group(1)
                else:
                    hash_match = re.search(r"([0-9a-f]{7,40})", verdict_line)
                    if hash_match:
                        commit_hash = hash_match.group(1)

        # If no [R] found, check if it looks like a pendiente
        if result == "unknown":
            # Check for "(pendiente" in [R] section
            r_section = body[body.find("**[R]"):body.find("---", body.find("**[R]") + 5)] if "**[R]" in body else ""
            if "(pendiente" in r_section.lower():
                result = "pending"

        # Extract date
        date_match = re.search(r"\((\d{2}/\d{2}/\d{4})\)", body[:300])
        if date_match:
            raw = date_match.group(1)
            # Convert dd/mm/yyyy to yyyy-mm-dd
            parts = raw.split("/")
            if len(parts) == 3:
                data["iterations"].append({
                    "num": num,
                    "phases": phases,
                    "result": result,
                    "hash": commit_hash,
                    "date": f"{parts[2]}-{parts[1]}-{parts[0]}",
                })
            else:
                data["iterations"].append({
                    "num": num, "phases": phases, "result": result,
                    "hash": commit_hash, "date": raw,
                })
        else:
            data["iterations"].append({
                "num": num, "phases": phases, "result": result,
                "hash": commit_hash, "date": "",
            })

        data["total"] += 1
        if result == "done":
            data["done"] += 1
        elif result == "failed":
            data["failed"] += 1
        elif result == "pending":
            data["pending"] += 1
        else:
            data["unknown"] += 1

        # Track which phase fails (for failed iterations, detect last completed phase)
        if result == "failed":
            if "R" in phases:
                data["phase_failures"]["R (restart/verdict REJECT)"] += 1
            elif "V" in phases:
                data["phase_failures"]["V (verify gate fail)"] += 1
            elif "I" in phases:
                data["phase_failures"]["I (implement incomplete)"] += 1
            else:
                data["phase_failures"]["P (plan only)"] += 1

    # Last 10 commit hashes
    data["recent_hashes"] = [
        it["hash"] for it in data["iterations"][-10:] if it["hash"]
    ]

    return data


def analyze_git_recent() -> dict:
    """Analyze recent git history for patterns."""
    import subprocess
    data = {
        "recent_commits": 0,
        "files_changed_freq": Counter(),
        "commit_types": Counter(),
        "days_active": 0,
        "first_date": "",
        "last_date": "",
    }

    try:
        # Last 50 commits
        r = subprocess.run(
            ["git", "log", "--oneline", "--format=%h %s (%ci)", "-50"],
            capture_output=True, text=True, timeout=10, cwd=str(PROJECT_ROOT)
        )
        if r.returncode != 0:
            return data

        lines = r.stdout.strip().split("\n")
        data["recent_commits"] = len(lines)

        dates = set()
        for line in lines:
            # Extract commit type from conventional commit
            type_match = re.match(r"[0-9a-f]+ (feat|fix|chore|docs|refactor|test|perf|style|ci|build)\(", line)
            if type_match:
                data["commit_types"][type_match.group(1)] += 1

            # Extract date
            date_match = re.search(r"\((\d{4}-\d{2}-\d{2})", line)
            if date_match:
                dates.add(date_match.group(1))

        if dates:
            data["first_date"] = min(dates)
            data["last_date"] = max(dates)
            data["days_active"] = len(dates)

        # Files changed in last 10 commits
        r2 = subprocess.run(
            ["git", "diff", "--name-only", "HEAD~10", "HEAD"],
            capture_output=True, text=True, timeout=10, cwd=str(PROJECT_ROOT)
        )
        if r2.returncode == 0:
            for f in r2.stdout.strip().split("\n"):
                if f.strip():
                    data["files_changed_freq"][f.strip()] += 1

    except Exception:
        pass

    return data


def analyze_state_backlog() -> dict:
    """Parse STATE.md for backlog status."""
    data = {
        "total_tasks": 0,
        "done": 0,
        "in_progress": 0,
        "pending": 0,
        "stale_tasks": [],  # tasks with old dates
        "high_priority": 0,
    }

    if not STATE_FILE.exists():
        return data

    content = STATE_FILE.read_text(encoding="utf-8", errors="ignore")

    # Count task rows in backlog table
    task_rows = re.findall(r"\|\s*\d+\s*\|.*?\|\s*(DONE|PENDIENTE|EN CURSO|BLOQUEADO)\s*\|", content, re.IGNORECASE)
    data["total_tasks"] = len(task_rows)
    for status in task_rows:
        s = status.upper()
        if "DONE" in s:
            data["done"] += 1
        elif "PENDIENTE" in s:
            data["pending"] += 1
        elif "EN CURSO" in s:
            data["in_progress"] += 1
        elif "BLOQUEADO" in s:
            data["pending"] += 1  # count blocked as pending

    # High Priority items
    hp_section = re.search(r"## High Priority.*?(?=##|\Z)", content, re.DOTALL)
    if hp_section:
        data["high_priority"] = len(re.findall(r"- \*\*", hp_section.group()))

    return data


def analyze_loop_health() -> dict:
    """Analiza la salud del loop PIVR usando datos reales."""
    health = {
        "total_iterations": 0,
        "completed": 0,
        "failed": 0,
        "pending": 0,
        "blocked": 0,
        "phase_failures": {},
        "success_rate": 0,
        "bottlenecks": [],
        "recommendations": [],
    }

    loop_data = analyze_loop_run_log()
    backlog = analyze_state_backlog()

    health["total_iterations"] = loop_data["total"]
    health["completed"] = loop_data["done"]
    health["failed"] = loop_data["failed"]
    health["pending_iterations"] = loop_data["pending"]
    health["unknown_iterations"] = loop_data["unknown"]
    health["pending"] = backlog["pending"]
    health["blocked"] = backlog.get("blocked", 0)
    health["phase_failures"] = dict(loop_data["phase_failures"])

    if health["total_iterations"] > 0:
        health["success_rate"] = round(
            health["completed"] / health["total_iterations"] * 100, 1
        )
        health["resolve_rate"] = round(
            (health["completed"] + health["failed"]) / health["total_iterations"] * 100, 1
        )

    # Bottleneck detection (real data)
    if health["success_rate"] < 70 and health["total_iterations"] > 10:
        health["bottlenecks"].append(
            f"Low success rate ({health['success_rate']}%) over {health['total_iterations']} iterations"
        )

    # Phase-specific failures
    for phase, count in loop_data["phase_failures"].items():
        if count >= 3:
            health["bottlenecks"].append(f"Phase '{phase}' failed {count} times")

    if backlog["pending"] > 10:
        health["bottlenecks"].append(f"Large backlog ({backlog['pending']} pending tasks)")

    if backlog["high_priority"] > 5:
        health["bottlenecks"].append(f"Many high-priority items ({backlog['high_priority']})")

    # Recommendations
    if health["bottlenecks"]:
        health["recommendations"].append("Review phase failures for systematic issues")
    if health["success_rate"] < 50:
        health["recommendations"].append("Consider simplifying task scope or improving gates")
    if backlog["pending"] > 15:
        health["recommendations"].append("Backlog grooming: close stale or deprioritize")

    return health


def generate_improvements(patterns: dict, health: dict) -> list:
    """Genera sugerencias de mejora basadas en análisis real."""
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

    # Loop health issues from real data
    if health.get("success_rate", 100) < 70:
        improvements.append({
            "type": "loop_health",
            "severity": "high",
            "description": f"Loop success rate is {health['success_rate']}% ({health['completed']}/{health['total_iterations']} resolved)",
            "action": "review_loop_configuration",
            "auto_apply": False,
        })

    # Many unresolved iterations
    unknown = health.get("unknown_iterations", 0)
    if unknown > 10:
        improvements.append({
            "type": "unresolved_iterations",
            "severity": "medium",
            "description": f"{unknown} iterations with no clear verdict — need review or archival",
            "action": "review_unresolved_iterations",
            "auto_apply": False,
        })

    # Phase-specific failures
    for phase, count in health.get("phase_failures", {}).items():
        if count >= 3:
            improvements.append({
                "type": "phase_failure",
                "severity": "high",
                "description": f"Phase '{phase}' failed {count} times — systematic issue",
                "action": f"investigate_phase_{phase.split('(')[0].strip().lower().replace('/', '_')}",
                "auto_apply": False,
            })

    # Backlog health
    if health.get("pending", 0) > 15:
        improvements.append({
            "type": "backlog_bloat",
            "severity": "medium",
            "description": f"Backlog has {health['pending']} pending tasks — consider grooming",
            "action": "backlog_grooming",
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
    print("Analyzing sessions + loop history + git...")
    patterns = analyze_sessions()
    health = analyze_loop_health()
    git_data = analyze_git_recent()
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
    print("GIT HEALTH (last 50 commits)")
    print(f"{'='*60}")
    print(f"Commits: {git_data['recent_commits']}")
    print(f"Days active: {git_data['days_active']}")
    print(f"Period: {git_data['first_date']} to {git_data['last_date']}")
    if git_data["commit_types"]:
        print(f"Commit types: {dict(git_data['commit_types'])}")
    if git_data["files_changed_freq"]:
        print(f"\nMost changed files (last 10 commits):")
        for f, count in git_data["files_changed_freq"].most_common(5):
            print(f"  {count:3d}x  {f}")

    print(f"\n{'='*60}")
    print("LOOP HEALTH (from loop-run-log.md)")
    print(f"{'='*60}")
    print(f"Iterations: {health['total_iterations']}")
    print(f"Completed: {health['completed']}")
    print(f"Failed: {health['failed']}")
    print(f"Pending: {health.get('pending_iterations', 0)}")
    print(f"Unknown: {health.get('unknown_iterations', 0)}")
    print(f"Success rate: {health.get('success_rate', '?')}%")
    print(f"Resolve rate: {health.get('resolve_rate', '?')}% (done+failed/total)")
    print(f"Pending tasks: {health.get('pending', '?')}")
    if health.get("phase_failures"):
        print(f"\nPhase failures:")
        for phase, count in health["phase_failures"].items():
            print(f"  {count:3d}x  {phase}")
    if health["bottlenecks"]:
        print(f"\nBottlenecks:")
        for b in health["bottlenecks"]:
            print(f"  [!] {b}")
    if health.get("recommendations"):
        print(f"\nRecommendations:")
        for rec in health["recommendations"]:
            print(f"  >> {rec}")

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
                "success_rate": health.get("success_rate", 0),
            },
            "git": {
                "commits": git_data["recent_commits"],
                "days_active": git_data["days_active"],
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
    """Solo muestra la salud del loop con datos reales."""
    health = analyze_loop_health()
    print(json.dumps(health, indent=2, ensure_ascii=False))


def cmd_generate_plan():
    """Genera un plan de mejoras como archivo markdown."""
    patterns = analyze_sessions()
    health = analyze_loop_health()
    git_data = analyze_git_recent()
    improvements = generate_improvements(patterns, health)

    plan_file = SESSIONS_DIR / f"improvement-plan-{datetime.now().strftime('%Y%m%d')}.md"
    plan_file.parent.mkdir(parents=True, exist_ok=True)

    content = f"""# Improvement Plan — {_now()}

Generated by `auto_improve.py` from session + loop + git analysis.

## Current State

- Sessions analyzed: {patterns['total_sessions']}
- Total interactions: {patterns['total_interactions']}
- Build pass/fail: {patterns['build_successes']}/{patterns['build_failures']}
- Loop iterations: {health['total_iterations']}
- Loop completed: {health['completed']}
- Loop failed: {health['failed']}
- Success rate: {health.get('success_rate', '?')}%
- Pending tasks: {health.get('pending', '?')}
- Git commits (last 50): {git_data['recent_commits']}
- Days active: {git_data['days_active']}

## Phase Failures

"""
    for phase, count in health.get("phase_failures", {}).items():
        content += f"- {phase}: {count} failures\n"

    content += f"""
## Bottlenecks

"""
    for b in health.get("bottlenecks", []):
        content += f"- {b}\n"

    content += f"""
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
