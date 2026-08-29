# RAZONAMIENTO-ZERNIO — Zernio como capa social unificada de UltraIa

**Fuente:** `https://mcp.zernio.com/mcp` (MCP) + `https://zernio.com/api/v1` (REST, llms.txt).
**Fecha:** 2026-08-27. **Decision:** conectar Zernio al agente (MCP en opencode.json, commit `0fb517e`)
+ añadir adapter de código unificado en AutoPub (loop-zernio-001).

## 1. Qué es Zernio y por qué importa al proyecto

UltraIa es una "fábrica de contenido autónoma" (AutoPub F1–F5 + Cerebro): idea → brief →
contenido → paquete → cola → publicación → métricas → mejora. El cuello de botella de alcance
siempre fue la integración N×M de plataformas (cada red = OAuth/token distinto, app review,
límites). Zernio colapsa eso: **una API key publica en 16 plataformas** con un único
`POST /v1/posts`. Es exactamente la pieza que faltaba para que el cerebro autónomo tenga
"alcance masivo con esfuerzo mínimo".

Mapa de cobertura Zernio (16) vs adapters bespoke UltraIa (13):
- **Común (13):** instagram, tiktok, youtube, x, linkedin, threads, pinterest, reddit, telegram,
  discord, slack, facebook, whatsapp.
- **Únicas de Zernio (gap cubierto):** bluesky, google_business, snapchat (+ otras vía su catálogo).
- **Conclusión:** Zernio aporta alcance nuevo (Bluesky/Snapchat/Google Business) y simplifica el
  onboarding (1 key vs N tokens). No reemplaza el control fino de los adapters bespoke (p.ej.
  YouTube resumable, TikTok Direct Post, LinkedIn UGC con recipe específica).

## 2. Modelo de integración elegido

- **Agente (MCP):** ya conectado. El agente `bp-*` puede usar `accounts_*`, `profiles_*`,
  `posts_*`, `media_*`, `docs_*` directamente — útil para casos conversacionales/flexibles.
- **Código (adapter `createZernioAdapter`):** para el pipeline determinista AutoPub. Implementa
  `PublisherAdapter` (mismo contrato que youtube/tiktok/...): `validate()` + `publish()`
  fail-soft, fetch inyectable, media vía URL pública o presign-upload.
- **Canal de cola:** registrado en `Publication` como `DRAFT` siempre (aprobación humana), porque
  el fan-out es amplio y potencialmente caro/irreversible. Esto respeta la regla de aprobación
  híbrida del proyecto (video/imagen → humano).
- **Catálogo y canales:** aparece en `connections-catalog`, `topics` (`TopicChannel`),
  `present` (`PresentChannel`), `cerebro`, `autopub`.

## 3. Arquitectura de la llamada

```
publish_submit / publishDue
  └─ createDefaultPublishers({ includeZernio:true })
       └─ createZernioAdapter()  →  POST https://zernio.com/api/v1/posts
            body: { platforms:[{platform,accountId}], content, mediaItems:[{type,url}],
                    publishNow | scheduledFor, profileId? }
            media: videoUrl directo  O  uploadBuffer → /media/presign → PUT → publicUrl
       fail-soft: validate() sin key → {ok:false,reason}; red/HTTP → {ok:false}
```

Si no se pasan `zernioPlatforms`, el adapter hace `GET /v1/accounts` y publica a las cuentas
activas (descubrimiento automático, clave para el Cerebro sin configurar cada red).

## 4. Aporte al proyecto general y a dónde apunta

- **Autonomía del Cerebro:** el disparador programado (schtasks/cloud workflow) ahora puede
  apuntar a `zernio` y explayar contenido a 16 redes sin N integraciones. Cierra el bucle
  "generar → publicar a gran escala" con un solo secreto.
- **Coste $0 de integración:** Zernio es un servicio externo (puede tener costo propio), pero
  desde UltraIa es keyless-first: si no hay `ZERNIO_API_KEY`, el canal simplemente no publica
  (fail-soft), sin romper el pipeline.
- **Riesgo/mitigación:** dependencia de un tercero para alcance crítico. Mitigado porque los
  adapters bespoke siguen vivos; Zernio es complemento, no single point of failure.
- **Coherencia con la misión:** UltraIa quiere "democratizar la creación y distribución de
  contenido con IA". Zernio encaja como el "distribuidor universal" de la fábrica.

## 5. Siguientes pasos recomendados (backlog)

1. **Cola con target platforms:** hoy `publishDue` publica con `{ metadata }` y sin
   `zernioPlatforms`, así que el adapter descubre cuentas. Mejor: persistir en `Publication`
   un `zernioConfig` (plataformas + accountIds + programación) para publicación dirigida.
2. **Analytics Zernio:** añadir `fetchChannelAnalytics` para Zernio (endpoints de reportes) y
   fusionarlo en `publication_metrics` (F5).
3. **Promoción vía signals:** alimentar `growth.buildPlaybook` con señales de Zernio para
   cerrar el loop de mejora (F5 + capability `growth` ya existe).
4. **App review / OAuth:** si se prefiere OAuth 2.1 sobre API key, añadir flujo
   `GET /v1/auth/authorize` en `connections-catalog` y resolver token en `connections.ts`.
5. **Landing/Documentación:** sección en `docs/CANALES-CONFIG-2026.md` (hecho) + mención en
   el README de AutoPub.
