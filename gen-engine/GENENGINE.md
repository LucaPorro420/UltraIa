# Gen-Engine — modelo propio self-hosted (imagen/audio/video)

Microservicio FastAPI que expone generación de imagen, música, TTS y video con
**degradación garantizada**: sin GPU ni claves API, todas las modalidades
funcionan keyless; en una GPU cloud se activan los modelos open-weights.

## Arquitectura de proveedores

```
POST /generate/image   local: FLUX.2 klein 4B  -> keyless: Pollinations flux
POST /generate/music   local: ACE-Step 1.5     -> keyless: composición estructurada
POST /generate/tts     siempre keyless: edge-tts (100+ voces, 10+ idiomas)
POST /generate/video   local: LTX-2.3 (22B)    -> keyless: storyboard de frames
```

Selección automática por endpoint (`provider: auto`): local si hay GPU utilizable,
si no keyless. `GET /health` y `GET /capabilities` reportan el estado.

## Ejecutar sin GPU (esta laptop, keyless)

### Vía start.py (recomendado, un comando)

`python start.py` lanza web (:3000) + webhooks (:8000) + gen-engine (:8100) y
anuncia la URL a la web (`apps/web/.env` → `instrumentation.ts` registra los
providers solo si `/health` responde). Solo el engine:

```bash
python start.py --gen-engine     # http://localhost:8100
curl http://localhost:8100/health
```

El puerto local es :8100 para no chocar con el webhook server (:8000). Para un
pod GPU remoto, pon `GEN_ENGINE_URL="http://<pod>:8000"` en `.env`.

### Manual

```bash
cd gen-engine
pip install -r requirements.txt        # + uvicorn ya incluido
uvicorn app.main:app --port 8100
curl http://localhost:8100/health
curl -X POST http://localhost:8100/generate/image -H "Content-Type: application/json" \
     -d '{"prompt":"futuristic desert city, golden hour","width":1024,"height":576}'
```

## Deploy en GPU cloud (RunPod/Spheron/Vast) — 3 comandos

Los modelos open-weight (FLUX.2 klein ~8GB, ACE-Step <4GB, LTX-2.3 16GB FP8)
no corren en GPU de laptop; se alquilan por hora (spot ~$0.3–1/hr, 2026):

```bash
# 1) En la nube: clona y construye (imagen CUDA 12.4 con torch + diffusers)
git clone <repo> && cd UltraIa/gen-engine
docker compose -f docker-compose.gpu.yml up -d

# 2) Verifica que la GPU fue reservada y los modelos se cargan
curl http://localhost:8000/health        # "local_engine": true, device: cuda

# 3) Genera con el modelo propio
curl -X POST http://localhost:8000/generate/image -H "Content-Type: application/json" \
     -d '{"prompt":"product shot, studio lighting","provider":"local"}'
```

Templates recomendados (2026): RunPod "RunPod PyTorch 2.x + CUDA 12.4", Vast.ai
"comfyui" o "pytorch 12.4", Spheron GPU instances. Costo típico: FLUX.2 klein
~2–5s/imagen en RTX 4090; LTX-2.3 ~7s/clip 720p en A100.

## Exponer al web de UltraIa

El web (Next.js) llama al engine vía `GEN_ENGINE_URL` (ej. un túnel localtunnel
o el endpoint del pod). Los providers TS (`setVideoProvider`, `setMusicProvider`)
apuntan a `$GEN_ENGINE_URL/generate/...` — ver Fase 5 del plan.

## Variables de entorno

| Variable | Default | Uso |
|---|---|---|
| `FLUX_MODEL` | `black-forest-labs/FLUX.2-klein` | Modelo de imagen local |
| `ACESTEP_MODEL` | `ACE-Step/ACE-Step-v1-3.5B` | Modelo de música local |
| `LTX_MODEL` | `Lightricks/LTX-2.3` | Modelo de video local |
| `FAL_KEY_ID`/`FAL_KEY_SECRET` | — | Premium Fal.ai (opcional) |
| `MEIGEN_API_TOKEN` | — | Premium MeiGEN (opcional) |

## Licencias de los modelos propios

- **FLUX.2 klein**: Apache 2.0 (comercial libre) — usar klein/schnell, NO dev.
- **ACE-Step 1.5**: MIT.
- **LTX-2.3**: LTX Community License (comercial libre <$10M ingresos).
- **edge-tts**: gratuito (Microsoft Edge neural voices, sin redistribución del motor).
