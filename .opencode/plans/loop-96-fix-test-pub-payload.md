# Plan loop-96 — Fix test providers (post-3da0905) + puente procvid→Publication

Fecha: 24/08/2026 · Agente: piv-build · Estado: ACTIVO
Disparador: "Aprobado, continua y realiza los commit y push que puedan."
PUSH YA EJECUTADO: c70aecd..1a18c1b (6 commits, aprobación humana explícita).

## SPEC

1. **FIX llm.test.ts** (roto en HEAD por 3da0905): el refactor local-first fallback
   hace que resolveModel NUNCA lance con primary openai sin key (cae a ollama/lmstudio,
   que construyen sin red). Actualizar el test al CONTRATO NUEVO:
   - 'falls back to a local provider when OPENAI_API_KEY is missing' → toBeDefined().
   - Mantener 'resolves when key present'. Comentario: constructores no hacen ping →
     test independiente de servidores locales vivos/muertos.
2. **procvid.buildPublicationPayload(spec, plan, outputs, opts?)**: builder PURO que
   produce el payload listo para createPublication (cola AutoPub): tema, canal
   ('blog'), caption bilingüe es/ar, hashtags (#procedural #generative + animación),
   media {gifPath?, mp4Path?}, metadata procedural (dims/fps/frames/palette).
   Sin tocar domain/publications.ts ni llm.ts (cero colisión). Tests ~7.
3. Wiring mínimo opcional: export ya cubierto vía export * (nada que tocar en index).

## TEST / VERIFICACIÓN

- llm.test 2/2 PASS (hermético, sin depender de servidores locales).
- procvid payload 7/7 (bilingüe, determinista, campos cola).
- FULL typecheck/lint/test/build + PUSH aprobado al cerrar verde.

## NO-hacer

- NO tocar publications.ts/autopub.ts (dominio compartido estable).
- NO dithering (otro ciclo). NO push de ramas distintas a master.

Esfuerzo: medio ciclo. Prioridad P1 (arregla árbol rojo commiteado).
