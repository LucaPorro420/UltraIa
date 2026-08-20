"""autolearn.py — Runner del agente de autoaprendizaje (autoprogramado real).

Lee el estado real del proyecto (STATE.md, LEARNINGS.md, learning/sources/,
docs/RAZONAMIENTO-*.md, enlaces.txt), detecta gaps de aprendizaje (misma lógica
que la tool TS `autolearn` en packages/core/src/tools/autolearn.ts), prioriza
(RICE simplificado) y ESCRIBE el plan de mejora en
`.opencode/plans/autolearn-<fecha>.md` — listo para que un ciclo piv-build lo
ejecute. El agente se autoprograma.

Solo stdlib (sin deps). Keyless, determinista, degradación elegante.

Uso:
    python scripts/autolearn.py --dry-run          # plan a stdout (default)
    python scripts/autolearn.py --write            # escribe el plan file (.opencode/plans/)
    python scripts/autolearn.py --json             # gaps + KPIs en JSON (stdout)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
STATE_MD = ROOT / "STATE.md"
LEARNINGS_MD = ROOT / "learning" / "LEARNINGS.md"
SOURCES_DIR = ROOT / "learning" / "sources"
RAZONAMIENTOS_DIR = ROOT / "docs"
ENLACES_TXT = ROOT / "enlaces.txt"
PLANS_DIR = ROOT / ".opencode" / "plans"

# Topics conocidos para cruzar lecciones con capabilities (misma lista que TS).
KNOWN_TOPICS = ["api", "web", "search", "memory", "sql", "video", "audio", "image", "code", "docker"]

CICLO_RE = re.compile(r"ciclo\s*(\d+)", re.IGNORECASE)
FECHA_ISO_RE = re.compile(r"(\d{4})-(\d{2})-(\d{2})")
FECHA_DMY_RE = re.compile(r"(\d{2})/(\d{2})/(\d{4})")


def leer(path: Path) -> str:
    if not path.exists():
        return ""
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except (OSError, UnicodeError):
        return ""


# ── 1. Sensar ────────────────────────────────────────────────────────────────

def parse_fecha(body: str) -> str:
    iso = FECHA_ISO_RE.search(body)
    if iso:
        return f"{iso.group(1)}-{iso.group(2)}-{iso.group(3)}"
    dmy = FECHA_DMY_RE.search(body)
    if dmy:
        return f"{dmy.group(3)}-{dmy.group(2)}-{dmy.group(1)}"
    return ""


def parse_learnings(texto: str) -> list[dict[str, str]]:
    """Mismo contrato que autolearn.parseLearnings (TS): bullet -> {fecha, ciclo, texto}."""
    entradas: list[dict[str, str]] = []
    for raw in texto.splitlines():
        line = raw.strip()
        if not line.startswith(("-", "*")):
            continue
        body = re.sub(r"^[-*]\s+", "", line).strip()
        if not body:
            continue
        fecha = parse_fecha(body)
        ciclo = CICLO_RE.search(body)
        texto = (
            body.replace("**", "")
            .replace(FECHA_ISO_RE.pattern, "")
            .replace(FECHA_DMY_RE.pattern, "")
        )
        texto = re.sub(CICLO_RE.pattern, "", texto, flags=re.IGNORECASE)
        texto = re.sub(r"[()]", "", texto)
        texto = re.sub(r"\s+", " ", texto).strip()
        entradas.append({"fecha": fecha, "ciclo": ciclo.group(1) if ciclo else "", "texto": texto or body})
    return entradas


def scan_truth(truth_paths: list[Path]) -> dict[str, Any]:
    """Stats de la verdad verificada: total, fuentes, tipos (lenient)."""
    fuentes: set[str] = set()
    tipos: dict[str, int] = {}
    total = 0
    for p in truth_paths:
        try:
            data = json.loads(p.read_text(encoding="utf-8", errors="replace"))
        except (OSError, ValueError):
            continue
        fuente = str(data.get("source") or data.get("id") or p.stem)
        fuentes.add(fuente)
        for case in data.get("cases", []) or []:
            total += 1
            t = str(case.get("type") or "sin_tipo")
            tipos[t] = tipos.get(t, 0) + 1
    return {"total": total, "fuentes": sorted(fuentes), "tipos": tipos}


# ── 2. Razonamiento ──────────────────────────────────────────────────────────

# Stopwords de los slugs: tokens sin poder discriminante (idioma, marcadores).
_STOPWORDS = {"ai", "ia", "md", "the", "de", "la", "el", "en", "y", "a", "para"}

# Cobertura conocida fuente -> razonamiento(s) que la analizan bajo otro nombre
# (analisis nombrado por la capability, no por la fuente).
COVERAGE: dict[str, list[str]] = {
    "claude-fable-5-system-prompt": ["fable5"],
    "instagram-elemental-sandbox": ["codevfx"],
    "kage-threejs": ["testtaskskills"],
}


def _tokens(slug: str) -> set[str]:
    """Tokens del slug: separa por [-_\\s], descarta stopwords y tokens <= 1 char."""
    parts = re.split(r"[-_\s]+", slug)
    return {p for p in parts if p and len(p) > 1 and p not in _STOPWORDS}


def _cobertura(fuente_slug: str, razon_slug: str) -> bool:
    """True si el razonamiento cubre la fuente (tokens compartidos, substring o mapa)."""
    tokens_fuente = _tokens(fuente_slug)
    tokens_razon = _tokens(razon_slug)
    if tokens_fuente & tokens_razon:
        return True
    # Substring: "fable5" contiene "fable".
    for tf in tokens_fuente:
        for tr in tokens_razon:
            if tf in tr or tr in tf:
                return True
    return razon_slug in COVERAGE.get(fuente_slug, [])


def detect_gaps(
    learnings: list[dict[str, str]],
    truth: dict[str, Any],
    backlog_text: str,
    sources: list[str],
    razonamientos: list[str],
    implemented: list[str],
) -> list[dict[str, str]]:
    """Mismo contrato que autolearn.detectGaps (TS): 4 kinds + dedupe por descripcion.

    El match fuente<->RAZONAMIENTO usa TOKENS COMPARTIDOS (>=1, excluyendo
    stopwords ai/ia/md), no slug exacto: `abacus-ai.md` tiene analisis en
    `RAZONAMIENTO-VIDRUSH-ABACUS.md` (token 'abacus'), `sacd-nasa.md` en
    `RAZONAMIENTO-SACD.md` (token 'sacd'). Leccion del harness: los detectores
    mecanicos deben validar TOKEN ACTIVO, no literal bruto.

    `implemented` = capabilities/tools registradas (nombres de archivos
    packages/core/src/tools/*.ts + tools.*_run de ai/llm.ts). Topics genericos
    'api'/'web' se consideran siempre cubiertos (el repo es API+web).
    """
    gaps: list[dict[str, str]] = []
    razon_tokens = [
        re.sub(r"^RAZONAMIENTO[-_]", "", r).replace(".md", "").lower()
        for r in razonamientos
    ]

    for src in sources:
        fuente_slug = src.replace(".md", "").lower()
        matched = any(_cobertura(fuente_slug, rs) for rs in razon_tokens)
        if not matched:
            gaps.append({
                "kind": "source_sin_analizar",
                "descripcion": f'Fuente "{src}" descargada sin analisis RAZONAMIENTO',
                "evidencia": f"learning/sources/{src}",
            })

    impl_lower = [s.lower() for s in implemented]
    truth_text = " ".join(truth.get("fuentes", [])).lower()
    for e in learnings:
        lower = e["texto"].lower()
        topic = next((t for t in KNOWN_TOPICS if t in lower and t not in ("api", "web")), None)
        if topic:
            if not any(topic in i for i in impl_lower):
                gaps.append({
                    "kind": "leccion_sin_implementar",
                    "descripcion": f'Leccion sobre "{topic}" sin capability/tool que la aplique',
                    "evidencia": e["texto"][:120],
                })
            if topic not in truth_text:
                gaps.append({
                    "kind": "tema_sin_truth",
                    "descripcion": f'Tema "{topic}" aparece en lecciones pero sin caso de verdad verificada',
                    "evidencia": f'truth: {truth.get("total", 0)} docs; topic="{topic}" ausente',
                })

    # Backlog: solo un gap (dedupe por descripcion igual) -> evidencia STATE.md.
    for line in backlog_text.splitlines():
        l = line.lower()
        if ("pendiente" in l or "pending" in l) and "|" in l:
            gaps.append({
                "kind": "backlog_pendiente",
                "descripcion": "Tarea del backlog en estado pendiente",
                "evidencia": "STATE.md",
            })
            break

    # Dedupe por descripcion.
    vistos: set[str] = set()
    unicos: list[dict[str, str]] = []
    for g in gaps:
        if g["descripcion"] in vistos:
            continue
        vistos.add(g["descripcion"])
        unicos.append(g)
    return unicos


def prioritize(gaps: list[dict[str, str]]) -> list[dict[str, Any]]:
    """RICE simplificado: (impact * confidence) / effort. Empates por descripcion asc."""
    items = []
    for i, g in enumerate(gaps):
        impact = 4 if g["kind"] == "backlog_pendiente" else 3
        effort = 2 if g["kind"] == "source_sin_analizar" else 3
        confidence = 0.8
        score = round((impact * confidence) / max(1, effort), 3)
        items.append({
            "id": f"gap_{i}",
            "descripcion": g["descripcion"],
            "score": score,
            "impact": impact,
            "effort": effort,
            "confidence": confidence,
        })
    items.sort(key=lambda x: (-x["score"], x["descripcion"]))
    return items


def build_plan(gaps: list[dict[str, str]], priorities: list[dict[str, Any]], fecha: str) -> dict[str, Any]:
    top = priorities[:5]
    pasos = [f"{i+1}. {p['descripcion']} (score {p['score']})" for i, p in enumerate(top)] or [
        "1. Sin gaps priorizados: ejecutar el siguiente ciclo del backlog."
    ]
    archivos: list[str] = []
    for g in gaps:
        f = g["evidencia"].split("/")[-1]
        if len(f) > 4 and f not in archivos:
            archivos.append(f)
    return {
        "objetivo": f"Cerrar {len(top)} gaps de aprendizaje priorizados ({', '.join(p['id'] for p in top)})",
        "fecha": fecha,
        "pasos": pasos,
        "archivos": archivos[:8],
        "criterios": [
            "Scoped: tests de la capability tocada PASS.",
            "FULL: typecheck -> lint -> test -> build, todos verdes.",
            "Commit unico con pathspec (nunca `git add .`).",
        ],
        "prioridad": f"P{max(0, 5 - (top[0]['impact'] if top else 0))}",
        "gaps": gaps[:10],
    }


def metrics(
    learnings: list[dict[str, str]],
    truth_total: int,
    gaps: list[dict[str, str]],
    sources_count: int,
    fecha_hoy: str,
) -> dict[str, Any]:
    """KPIs del ciclo: lecciones totales/recientes (7d), truth, gaps, tasa de mejora."""
    try:
        hoy = date.fromisoformat(fecha_hoy)
        desde = hoy.toordinal() - 7
    except ValueError:
        desde = None
    recientes = 0
    for e in learnings:
        if e["fecha"] and desde is not None:
            try:
                if date.fromisoformat(e["fecha"]).toordinal() >= desde:
                    recientes += 1
            except ValueError:
                pass
    total = len(learnings)
    denom = total + truth_total
    tasa = round((recientes + truth_total) / max(1, denom), 3) if denom else 0
    return {
        "leccionesTotales": total,
        "leccionesUltimoPeriodo": recientes,
        "truthVerificada": truth_total,
        "gapsAbiertos": len(gaps),
        "fuentesAnalizadas": sources_count,
        "tasaMejora": tasa,
    }


# ── 3. Acción: escribir el plan ──────────────────────────────────────────────

def formato_plan(plan: dict[str, Any]) -> str:
    lines = [
        "# Plan autolearn (auto-generado por scripts/autolearn.py)",
        "",
        f"**Fecha**: {plan['fecha']} · **Prioridad**: {plan['prioridad']}",
        "",
        "## Objetivo",
        plan["objetivo"],
        "",
        "## Pasos",
    ]
    lines.extend(plan["pasos"])
    lines += ["", "## Archivos a tocar (inferidos de la evidencia)"]
    if plan["archivos"]:
        lines.extend(f"- {f}" for f in plan["archivos"])
    else:
        lines.append("- (ninguno inferido: revisar gaps)")
    lines += ["", "## Criterios (scoped/FULL)"]
    lines.extend(f"- {c}" for c in plan["criterios"])
    lines += ["", "## Gaps detectados (top 10)"]
    for g in plan["gaps"]:
        lines.append(f"- `{g['kind']}` — {g['descripcion']} ({g['evidencia']})")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    # Windows: stdout cp1252 rompe con emojis de LEARNINGS.md -> forzar UTF-8.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="Agente de autoaprendizaje (autoprogramado)")
    parser.add_argument("--dry-run", action="store_true", help="Plan a stdout (default)")
    parser.add_argument("--write", action="store_true", help="Escribe el plan en .opencode/plans/autolearn-<fecha>.md")
    parser.add_argument("--json", action="store_true", help="Gaps + KPIs en JSON a stdout")
    args = parser.parse_args()

    fecha_hoy = datetime.now(timezone.utc).date().isoformat()

    # Sensar.
    learnings = parse_learnings(leer(LEARNINGS_MD))
    truth_paths = sorted((ROOT / "learning" / "truth").glob("*.json")) if (ROOT / "learning" / "truth").exists() else []
    truth = scan_truth(truth_paths)
    sources = sorted(p.name for p in SOURCES_DIR.glob("*.md")) if SOURCES_DIR.exists() else []
    razonamientos = sorted(p.name for p in RAZONAMIENTOS_DIR.glob("RAZONAMIENTO-*.md")) if RAZONAMIENTOS_DIR.exists() else []
    backlog_text = leer(STATE_MD)
    enlaces = [l.strip() for l in leer(ENLACES_TXT).splitlines() if l.strip().startswith("http")]

    # Razonamiento.
    tools_dir = ROOT / "packages" / "core" / "src" / "tools"
    implemented = [p.stem for p in tools_dir.glob("*.ts")] if tools_dir.exists() else []
    llm_text = leer(ROOT / "packages" / "core" / "src" / "ai" / "llm.ts")
    implemented += re.findall(r"tools\.(\w+_run)\s*=\s*tool", llm_text)
    implemented += re.findall(r"includes\('(\w+)'\)", llm_text)
    implemented = sorted(set(implemented))

    gaps = detect_gaps(learnings, truth, backlog_text, sources, razonamientos, implemented)
    priorities = prioritize(gaps)
    plan = build_plan(gaps, priorities, fecha_hoy)
    kpis = metrics(learnings, truth["total"], gaps, len(sources), fecha_hoy)

    if args.json:
        print(json.dumps({"gaps": gaps, "priorities": priorities, "plan": plan, "kpis": kpis, "enlaces": enlaces}, ensure_ascii=False, indent=2))
        return 0

    print(formato_plan(plan))
    print("---")
    print(f"KPIs: lecciones={kpis['leccionesTotales']} (recientes {kpis['leccionesUltimoPeriodo']}) "
          f"truth={kpis['truthVerificada']} gaps={kpis['gapsAbiertos']} fuentes={kpis['fuentesAnalizadas']} "
          f"tasaMejora={kpis['tasaMejora']}")
    print(f"enlaces.txt: {len(enlaces)} URLs pendientes de procesar")

    if args.write:
        PLANS_DIR.mkdir(parents=True, exist_ok=True)
        out = PLANS_DIR / f"autolearn-{fecha_hoy}.md"
        out.write_text(formato_plan(plan) + "\n", encoding="utf-8")
        print(f"Plan escrito: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())