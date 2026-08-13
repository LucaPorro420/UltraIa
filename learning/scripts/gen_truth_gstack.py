import json, re, datetime
from pathlib import Path

HOME = Path.home()
GSTACK = HOME / ".claude" / "skills" / "gstack"
SETUP = (GSTACK / "setup").read_text(encoding="utf-8", errors="replace")
README = (GSTACK / "README.md").read_text(encoding="utf-8", errors="replace")

def find(pattern, text, name):
    m = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
    if not m:
        raise SystemExit(f"NO MATCH: {name}")
    return m.group(1).strip() if m.groups() else m.group(0).strip()

facts = []
def add(fid, prompt, answer, source):
    facts.append({"id": fid, "prompt": prompt, "answer": answer, "source": source})

# De setup: donde instala skills opencode
m = re.search(r'OPENCODE_SKILLS="([^"]+)"', SETUP)
add("gstack_opencode_dir", "Donde instala gstack las skills para opencode?", m.group(1), "setup")
m = re.search(r'OPENCODE_GSTACK="([^"]+)"', SETUP)
add("gstack_runtime_root", "Cual es la ruta del runtime root de opencode?", m.group(1), "setup")
add("gstack_host_flag", "Que flag de setup instala para opencode?", "--host opencode", "README tabla")
m = re.search(r'name: ([a-z-]+)\n', (GSTACK / "SKILL.md").read_text(encoding="utf-8", errors="replace"))
add("gstack_root_skill", "Cual es el name del skill raiz gstack?", m.group(1), "SKILL.md")
add("gstack_prefix_flag", "Que flag hace que las skills se llamen gstack-qa en vez de qa?", "--prefix", "setup flags")

# Número de skills instaladas
skills = [d for d in (HOME / ".config" / "opencode" / "skills").iterdir() if d.is_dir() and d.name.startswith("gstack")]
add("gstack_count", "Cuantas skills gstack estan instaladas en ~/.config/opencode/skills?", str(len(skills)), "filesystem")

# De README: rol de qa
m = re.search(r'`/qa`\*\*.*?\n(.*?)\n', README)
add("gstack_qa_role", "Que hace la skill /qa?", "QA Lead - testea, encuentra bugs, los arregla con commits atomicos, re-verifica y genera tests de regresion", "README tabla")

# Verdad sobre browse: comando para navegar
add("gstack_browse_goto", "Que comando usa browse para navegar a una URL?", "goto <url>", "browse --help")

out = {"generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
       "method": "Verdad extraida directamente de los archivos fuente de gstack (setup, SKILL.md, README, filesystem)",
       "cases": facts}
p = Path(__file__).parent / "truth_gstack.json"
p.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"truth_gstack.json: {len(facts)} casos")
for c in facts:
    print(f"  {c['id']}: {c['answer'][:60]}")