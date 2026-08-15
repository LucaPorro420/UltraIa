"""Replica programatica del diseno nanoprompts: 🎯 ¡A Cazar el BP 5! Desafío de Nivel de Poder del Escáner IA.

Fuente: /es/prompt-handbook/trending-prompts/scouter-power-level-challenge  (copia offline: learning/nanoprompts/prompts/scouter-power-level-challenge.json)
Categoria: 🔥 Viral Challenge | Dificultad: 

Replica: envia el prompt original a un generador de imagenes keyless
(pollinations) y guarda el PNG resultante. Requiere solo stdlib.
"""
from __future__ import annotations

import urllib.parse
import urllib.request
from pathlib import Path

PROMPT = "task: \"edit-image: add full-screen analysis HUD overlay only\"\n\nbase_image: |\n  Use the provided reference image as the base.\n  Do not change the character's appearance, pose, facial expression, anatomy, clothing, colors,\n  background, lighting, composition, or camera angle.\n  Keep the original art style exactly as it is with no new characters added.\n\nhud_color: |\n  Use a single monochrome HUD color for all HUD elements (lines, text, glow, tint).\n  The HUD color must be one of: green, blue, or red.\n  Follow any explicit color instruction given by the user or calling system.\n  If no specific color is provided, choose the HUD color based on the character's perceived power level:\n  - If the character looks very powerful or intense, use red.\n  - If the character looks moderately strong, use blue.\n  - If the character looks less powerful or more neutral, use green.\n\noverlay_hud: |\n  Superpone un HUD de análisis semitransparente pero claramente visible en el color HUD elegido\n  sobre todo el encuadre, como si el espectador estuviera mirando al personaje\n  a través de una visera de escáner de batalla futurista.\n  Tiñe toda la imagen con un filtro uniforme del color HUD mientras permites\n  que los colores y detalles originales sean visibles por debajo.\n\n  Dibuja una línea de contorno HUD precisa y brillante alrededor de toda la silueta del personaje.\n  El contorno debe seguir de cerca el borde exterior del cuerpo, cabello y ropa del personaje,\n  como un resaltado de detección de bordes.\n  Coloca este contorno ligeramente fuera del personaje para que no cubra rasgos faciales\n  ni detalles interiores importantes.\n  Haz que la línea de contorno sea continua, limpia y ligeramente más gruesa que las otras líneas HUD,\n  con un brillo intenso para que la forma del personaje quede claramente enfatizada.\n\n  Alrededor de la cabeza y la parte superior del cuerpo del personaje, agrega corchetes de objetivo y marcas de encuadre\n  que se ajusten a este contorno, reforzando la sensación de que el sistema está bloqueando al personaje.\n  Llena la pantalla con detalles HUD: líneas de cuadrícula horizontales y verticales, pequeñas lecturas numéricas,\n  miras sutiles, marcadores de esquina y paneles de interfaz compactos alrededor (pero no directamente encima)\n  de los rasgos clave del personaje.\n\nbp_display: |\n  Coloca el texto \"BP\" (Poder de Batalla) seguido de un valor numérico de varios dígitos\n  en la esquina superior derecha del encuadre.\n  Este texto BP debe aparecer siempre en el área superior derecha de la imagen, no en ninguna otra posición.\n\n  Haz que la etiqueta \"BP\" y el número sean grandes, brillantes y fáciles de leer,\n  usando un estilo digital de ciencia ficción en negrita.\n  Dibújalos solo como texto del color HUD brillante, sin ningún marco rectangular ni panel de fondo.\n  NO copies ni reutilices ningún número específico de este prompt.\n  Deja que el modelo infiera y elija un número de poder de batalla plausible de varios dígitos\n  basado en la apariencia, pose e intensidad general del personaje en la imagen de referencia.\n  El valor debe parecer una lectura de estado de ciencia ficción apropiada para cuán fuerte\n  aparece este personaje en el contexto dado.\n\nstyle: |\n  Haz que el HUD se sienta como una interfaz clásica de escáner de anime:\n  monocromático en el color HUD elegido con niveles de brillo variables, resplandor intenso,\n  y una impresión de pantalla holográfica sobre toda la imagen.\n  Usa líneas de interfaz angulares y nítidas y fuentes digitales.\n  El contorno alrededor del personaje y el texto BP brillante en la esquina superior derecha\n  deben ser los elementos más visualmente legibles, para que el espectador entienda de inmediato\n  qué persona está siendo analizada y cuál es su poder de batalla.\n\nconstraints: |\n  No modifiques ni ocultes el rostro, cuerpo ni elementos de diseño clave del personaje con bloques de interfaz opacos.\n  No cambies el diseño del fondo ni agregues objetos extra grandes más allá del propio HUD.\n  La única edición debe ser la superposición del HUD de análisis de pantalla completa en el color elegido,\n  el contorno preciso y el texto de visualización BP en la esquina superior derecha.\n  Preserva la composición original, la perspectiva y la escena general mientras la haces parecer\n  como si estuviera siendo vista completamente a través de una interfaz de análisis tipo escáner."
OUT = Path(__file__).with_suffix(".jpg")

URL = "https://image.pollinations.ai/prompt/{prompt}?width=1024&height=1024&model=flux&nologo=true".format(
    prompt=urllib.parse.quote(PROMPT)
)

req = urllib.request.Request(URL, headers={"User-Agent": "UltraIa nanoprompts-replicator"})
with urllib.request.urlopen(req, timeout=120) as resp:
    data = resp.read()
    ctype = resp.headers.get("Content-Type", "")
    if "jpeg" in ctype:
        OUT = OUT.with_suffix(".jpg")
    else:
        OUT = OUT.with_suffix(".png")
OUT.write_bytes(data)
print(f"Diseno replicado en {OUT}")
