"""Replica programatica del diseno nanoprompts: Pop-Style Sweets Monster Overload.

Fuente: /es/prompt-handbook/trending-prompts/pop-style-sweets-monsters  (copia offline: learning/nanoprompts/prompts/pop-style-sweets-monsters.json)
Categoria: 🔥 Ultimos y en tendencia | Dificultad: ⚡ Intermedio

Replica: envia el prompt original a un generador de imagenes keyless
(pollinations) y guarda el PNG resultante. Requiere solo stdlib.
"""
from __future__ import annotations

import urllib.parse
import urllib.request
from pathlib import Path

PROMPT = "Usa la foto subida.\nNO alteres la apariencia real de la persona — mantén el rostro, cuerpo, ropa, colores y textura completamente fotorrealistas.\nNO cambies la perspectiva del fondo.\nNO conviertas a la persona en un dibujo o ilustración.\n\nAgrega una capa densa y sobrecargada de \"monstruos de dulces\" ilustrados en estilo pop y decoraciones gráficas SOLO alrededor de la persona (y sobre su ropa si es necesario), pero nunca sobre su piel o rostro.\n\nElementos ilustrados:\n- muchos monstruos de caricatura coloridos con contornos negros gruesos, colores planos y expresiones tiernas pero feas\n- monstruos inspirados en dulces: bananas, galletas, fresas, chocolate derretido, paletas, helados, naranjas, cupcakes, donas, trozos de caramelo, botellas de refresco, etc.\n- formas gráficas adicionales: estrellas, corazones, flechas, goteos, salpicaduras, líneas en zigzag, signos de exclamación, líneas de movimiento, destellos, burbujas, formas de texto estilo cómic (pero sin texto real)\n\nHaz que la decoración sea muy densa y \"recargada\":\n- llena el espacio detrás de la persona con monstruos de dulces y formas superpuestas\n- agrega monstruos asomándose por detrás de los hombros, alrededor de la bolsa, a los pies de la persona y cerca de la cabeza\n- permite que algunos monstruos y formas se superpongan sobre la ropa y accesorios (camisa, shorts, bolsa, zapatos), pero mantén la piel del rostro, brazos y piernas fotorrealista y visible\n- usa múltiples capas de ilustraciones frente y detrás de la persona para crear profundidad\n- agrega contornos brillantes, pequeños puntos blancos y líneas de velocidad alrededor de la persona para enfatizar energía\n\nColor y estilo:\n- usa una paleta de colores vívida y neón (rosa intenso, amarillo, cian, lima, naranja, morado, turquesa)\n- mantén todos los elementos ilustrados planos y gráficos con bordes limpios y contornos gruesos\n- asegúrate de que las sombras y superposiciones sugieran interacción con la persona real (p. ej., sombras leves en la ropa donde los monstruos la tocan)\n\nObjetivo general:\nCrea una escena de arte pop maximalista y muy decorada donde la persona real está en el centro, rodeada y envuelta por una multitud caótica de juguetones monstruos de dulces y garabatos gráficos, mientras la persona permanece claramente fotorrealista."
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
