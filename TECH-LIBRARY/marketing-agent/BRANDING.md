# BRANDING — TECH-LIBRARY (kit fijo del agente)

> Todo lo que genera el agente respeta este kit. Si pides un cambio visual, se edita aquí y el siguiente ciclo ya sale con el cambio.

## Marca

- **Nombre**: TECH-LIBRARY — Biblioteca Tecnológica Offline (UltraIa).
- **Promesa**: aprende cualquier stack sin internet, con ejemplos reales del repo.
- **Tono (es)**: directo, motivador dev, cero humo. Frases cortas. Emojis: máximo 2 por post (solo en IG/TikTok; LinkedIn: 0).
- **Idioma**: español (código y términos técnicos en inglés cuando son canónicos: `hook`, `migration`, `prompt`).

## Colores (Dark Obsidian + violeta)

| Rol | Hex | Uso |
|---|---|---|
| canvas | `#08080a` | fondo posts oscuros |
| panel | `#101014` | tarjetas |
| borde | `#232330` | marcos sutiles |
| texto | `#f4f4f5` | titular |
| muted | `#a1a1aa` | cuerpo secundario |
| primario | `#8b5cf6` | acento único (1-2 focos por pieza) |
| éxito | `#22c55e` | badges "nuevo" / "tip" |

Regla anti-slop: fondo oscuro + 1 acento violeta + hairlines 1px + radius máx 10px. Nada de gradientes arcoíris.

## Tipografías

- Titular/display: Plus Jakarta Sans (o sistema: `Arial Black` en imagen generada por prompt).
- Funcional/código: Inter + JetBrains Mono para snippets.
- En prompts de imagen se describe como: "bold sans-serif headline, monospace code chip".

## Logo / firma

- Firma de texto fija al final de cada caption web/LinkedIn: `— TECH-LIBRARY · aprende offline`.
- En imagen: prompt incluye `small badge "TECH-LIBRARY"` esquina inferior derecha, fondo `#101014`, texto `#f4f4f5`.

## Prompts base de imagen (por pilar)

- tip: `dark obsidian coding card, violet #8b5cf6 accent, {tema} headline, minimal, 1 focal icon`.
- snippet: `dark code editor close-up, {lenguaje} snippet highlight, violet caret`.
- paradigma: `abstract geometric diagram, nodes and arrows, dark background violet accents`.
- recurso: `stack of books + laptop glow, dark library, violet rim light`.
- novedad: `megaphone badge "NUEVO" green #22c55e dot, dark background`.
- motivacion: `developer desk at night, monitor glow, motivational headline space`.
- behind: `screenshot-style workspace, markers and notes, authentic work in progress`.

Todos terminan con: `no watermark, no extra text beyond headline and badge`.
