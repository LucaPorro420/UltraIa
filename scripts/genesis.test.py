#!/usr/bin/env python3
"""Standalone self-test for scripts/genesis.py (stdlib only).

Run:  py -3.12 scripts/genesis.test.py
Pattern: cloud-cli.test.py - imports the CLI module by path and asserts pure
functions plus one tempdir e2e for project instantiation. No real netsh/npm
calls except read-only root-file validations.
"""

from __future__ import annotations

import importlib.util
import json
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("genesis_cli", ROOT / "scripts" / "genesis.py")
genesis = importlib.util.module_from_spec(SPEC)
sys.modules["genesis_cli"] = genesis
assert SPEC.loader is not None
SPEC.loader.exec_module(genesis)

PASS = 0
FAIL = 0


def check(name: str, cond: bool, detail: str = "") -> None:
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"PASS {name}")
    else:
        FAIL += 1
        print(f"FAIL {name} {detail}")


# ---------------------------------------------------------------------------
# 1) Manifest validator
# ---------------------------------------------------------------------------

ok_root, errs = genesis.validate_manifest(json.loads(
    (ROOT / "genesis.json").read_text(encoding="utf-8")))
check("root genesis.json validates", ok_root, str(errs))

bad = {"project": {"name": "x"}}
ok_bad, errs_bad = genesis.validate_manifest(bad)
check("manifest missing project.id rejected", not ok_bad and any("project.id" in e for e in errs_bad))

bad_lvl = {"project": {"id": "a"}, "autonomy": {"level": 9}}
check("manifest autonomy.level>3 rejected", not genesis.validate_manifest(bad_lvl)[0])

bad_gate = {"project": {"id": "a"}, "quality_gates": {"t": {"required": "yes"}}}
check("manifest gate.required bool enforced", not genesis.validate_manifest(bad_gate)[0])

good_min = {"project": {"id": "a"}, "pipeline": {"steps": ["observe"]},
            "objective": {"primary": "do thing"}}
check("minimal valid manifest accepted", genesis.validate_manifest(good_min)[0])

# ---------------------------------------------------------------------------
# 2) Registry schema + seeded entries all validate
# ---------------------------------------------------------------------------

registry = json.loads((ROOT / "genesis" / "research-registry.json").read_text(encoding="utf-8"))
entries = registry.get("entries", [])
check("registry has >=10 seeded entries", len(entries) >= 10, f"got {len(entries)}")

bad_entries = []
for i, entry in enumerate(entries):
    ok_e, errs_e = genesis.validate_registry_entry(entry)
    if not ok_e:
        bad_entries.append((i, entry.get("repository"), errs_e))
check("all seeded registry entries valid", not bad_entries, str(bad_entries[:2]))

synthetic_ok = {
    "repository": "a/b", "url": "https://github.com/a/b", "license": "MIT",
    "stars": None, "last_activity": None, "architecture": "demo",
    "useful_components": ["x"], "integration_difficulty": "low",
    "security_risk": "low", "decision": "study", "reason": "evaluating fit for repo",
    "evidence": ["learning/sources/demo.md"],
}
check("synthetic entry valid", genesis.validate_registry_entry(synthetic_ok)[0])

for field_patch, label in (
    ({"decision": "maybe"}, "bad decision"),
    ({"evidence": []}, "empty evidence"),
    ({"security_risk": "extreme"}, "bad risk"),
    ({"reason": "short"}, "short reason"),
):
    probe = dict(synthetic_ok)
    probe.update(field_patch)
    check(f"entry {label} rejected", not genesis.validate_registry_entry(probe)[0])

# ---------------------------------------------------------------------------
# 3) WiFi parser (fixture, no subprocess)
# ---------------------------------------------------------------------------

FIXTURE = """There are 15 interfaces on the system.

    Name                   : Wi-Fi
    Description            : Intel(R) Wi-Fi 6 AX201 160MHz
    State                  : connected
    SSID                   : CasaNet_5G
    BSSID                  : aa:bb:cc:dd:ee:ff
    Signal                 : 86%
"""
parsed = genesis.parse_wifi_interfaces(FIXTURE)
iface = (parsed.get("interfaces") or [{}])[0]
check("wifi fixture parsed available", parsed.get("available") is True)
check("wifi ssid extracted", iface.get("ssid") == "CasaNet_5G", str(iface))
check("wifi state extracted", iface.get("state") == "connected")
check("wifi signal extracted", iface.get("signal") == "86%")
check("bssid not confused with ssid",
      iface.get("ssid") == "CasaNet_5G" and "aa:bb" not in iface.get("ssid", ""))

parsed_empty = genesis.parse_wifi_interfaces("")
check("wifi empty output -> unavailable", parsed_empty["available"] is False)

# ---------------------------------------------------------------------------
# 4) Kill switch detector (negation-safe, iter-68 lesson)
# ---------------------------------------------------------------------------

active, where = genesis.kill_switch_active("loop-pause-all\nresto", "")
check("kill switch bare token detected", active and where == "STATE.md")

neg = "- CERRADO - fix kill switch falso positivo: detectaba menciones tipo 'sin `loop-pause-all`'"
active_neg, _ = genesis.kill_switch_active(neg, "prosa: without loop-pause-all nothing happens")
check("kill switch negated mentions ignored", active_neg is False)

check("kill switch empty files inactive",
      genesis.kill_switch_active("", "") == (False, ""))

# iter-112 (26/08/2026): prosa diagnostica tipo L2294 que CUENTA menciones del
# token no es una orden de pausa; y una orden real tras una mencion negada en la
# MISMA linea NO se ensombrece (ventana 24 chars).
diag = "- [P] Sensado: Kill switch: 8 menciones de `loop-pause-all` en STATE.md, TODAS en prosa."
active_diag, _ = genesis.kill_switch_active("", diag)
check("kill switch diagnostic meta-mention ignored", active_diag is False)

mixed = "sin loop-pause-all documentado; loop-pause-all activo por decision."
active_mixed, _ = genesis.kill_switch_active(mixed, "")
check("real switch not shadowed by earlier negation", active_mixed is True)

# ---------------------------------------------------------------------------
# 5) Project instantiation e2e in tempdir
# ---------------------------------------------------------------------------

template = json.loads((ROOT / "genesis" / "projects" / "_TEMPLATE.genesis.json").read_text(encoding="utf-8"))
built = genesis.build_project_manifest(template, "terra-viva", "Terra Viva")
ok_built, errs_built = genesis.validate_manifest(built)
check("template instance valid", ok_built, str(errs_built))
check("instance id/name applied",
      built["project"]["id"] == "terra-viva" and built["project"]["name"] == "Terra Viva")

tmpdir = Path(tempfile.mkdtemp(prefix="genesis-test-"))
try:
    original_projects_dir = genesis.PROJECTS_DIR
    genesis.PROJECTS_DIR = tmpdir
    code_new = genesis.cmd_project_new("demo-proj", "Demo Proj")
    created = tmpdir / "demo-proj" / "genesis.json"
    check("cmd_project_new creates manifest", code_new == 0 and created.exists())
    on_disk = json.loads(created.read_text(encoding="utf-8"))
    check("created manifest id correct", on_disk["project"]["id"] == "demo-proj")

    code_dup = genesis.cmd_project_new("demo-proj", "Demo Proj")
    check("duplicate project refused", code_dup == 1)

    code_bad_slug = genesis.cmd_project_new("Bad_Slug!", None)
    check("invalid slug refused", code_bad_slug == 1)
    genesis.PROJECTS_DIR = original_projects_dir
finally:
    shutil.rmtree(tmpdir, ignore_errors=True)

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
