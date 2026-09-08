# AI/ML Course — UltraIa Learning

## Course Overview
Artificial Intelligence and Machine Learning course covering the verified knowledge from UltraIa's learning system. Focus on keyless-first, production-ready approaches and verified resources.

## Module 1: Diffusion and Generative Models (Verified 14/08/2026)
### 1.1 Theoretical Foundations (from `learning/truth/truth_ai_gen_resources.json`)
- **arXiv 2208.11970 (Unified Diffusion)**: VDM=VAE markoviano, 3 objetivos (x0/ruido/score), Tweedie
- **arXiv 2006.11239 (DDPM)**: Paper fundacional: CIFAR-10 FID 3.17, timesteps 1000, lr 2e-4, EMA 0.995
- **arXiv 2210.02747 (Flow Matching)**: Alternativa moderna a difusión (OT paths): entrenamiento/sampling más rápidos
- **arXiv 2206.00364 (EDM)**: Receta: FID 1.79 cond / 35 NFE (18 pasos Heun); NVlabs/edm
- **arXiv 2307.01952 (SDXL)**: Latent diffusion: UNet 3x, 2º text encoder, refinement model

### 1.2 Code References (from `learning/truth/truth_ai_gen_resources.json`)
- **lucidrains/denoising-diffusion-pytorch**: Base de entrenamiento principal (10.7k⭐, MIT); Unet1D para audio
- **karpathy/makemore**: Pedagogía "generar de la nada": Bigram→Transformer, CPU, 1 archivo
- **NVlabs/edm**: Repo oficial EDM (CC BY-NC-SA 4.0): CIFAR-10 32x32 ~6s/grid

### 1.3 Proposed Decisions for UltraIa Gen-Engine
- **DDPM + lucidrains**: Base del entrenamiento del Gen-Engine
- **Flow Matching**: Escalado a video/audio
- **EDM**: Sampling eficiente (35 NFE con Heun)
- **makemore**: Pedagogía para generador desde cero en CreationsApp/mvp/

## Module 2: Media and Modalities (Verified 14/08/2026)
### 2.1 Keyless Image Generation
- **Pollinations**: `https://image.pollinations.ai/prompt/{prompt}?width=&height=&model=flux&nologo=true`
- Sin clave, sin límite práctico, hotlinkable
- Verificado 14/08/2026
- 14 idiomas soportados

### 2.2 Language Detection for CJK
- Japonés y chino comparten kanji (CJK)
- Distinguir por **kana** (U+3040–30FF, exclusivo de japonés)
- Kanji puro solo es chino
- Regex de script japonés = solo kana, no CJK completo

### 2.3 TTS (Text-to-Speech) — Keyless
- **edge-tts**: 100+ voces multilingües
- Voces por idioma: `es-MX-DaliaNeural`, `ar-SA-ZariyahNeural`, `ja-JP-NanamiNeural`...
- Postproceso: loudnorm -16 LUFS + fade 0.4/0.6s
- Sin clave API requerida

### 2.4 Music Generation — Keyless
- **Tunetank MCP**: `POST https://mcp.tunetank.com` con header `Accept: application/json, text/event-stream`
- Sin API key requerida
- Búsqueda por palabra única (no queries completas)
- Fallback automático a `composeMusic`

### 2.5 Video Generation — Keyless/Degradation
- **Pollinations video**: Degrade a storyboard/composición sin engine
- **LTX-2.3**: Necesita ~16GB VRAM; laptop sin GPU → deploy cloud GPU
- **Seedance 2.5**: 4K 30s nativo, 50 refs multimodales, R2V, audio sync, 180s beta
- **Veo 3.1**: 4K, audio nativo, SynthID

### 2.6 Provider Degradation by Design
- Sin GPU ni claves: TODAS las modalidades siguen funcionando (pollinations/edge-tts/storyboard/composición)
- "Modelo propio" (open-weights) se activa solo en GPU cloud (RunPod/Spheron/Vast)
- Requisito de robustez: `_HAS_LOCAL = torch.cuda.is_available()`

## Module 3: UltraIa-Specific AI Resources (Verified 17/08/2026)
### 3.1 Capabilities Verified (from `learning/truth/truth_ultraia_capabilities.json`)
- **reach**: Web search, scraping, reachability tools
- **video_edit**: Video editing with EDL, rendering, self-evaluation
- **screenflow**: Screen recording pipeline
- **codevfx**: VFX code generation
- **growth**: Channel analysis, experiment planning
- **cloud**: Cloud storage and file management
- **telegram**: Telegram bot integration
- **discord**: Discord webhook integration
- **slack**: Slack API integration
- **publish**: Content distribution platforms
- **omag**: OMAG orchestrator (AUDIO/VIDEO/IMAGE)
- **sdf**: Signed distance fields + ray marching
- **videoqa**: Video quality metrics (MAE/MSE/PSNR/SSIM)
- **motion**: Motion analysis and flow
- **replica**: Replica.io orchestration
- **vault**: Knowledge repository
- **pdfsearch**: PDF searching and harvesting

### 3.2 Keyless-First Philosophy
- All capabilities designed to work without API keys
- Degrade elegantly to local/fallback implementations
- No single point of failure from missing keys
- Primary: local compute, secondary: keyless APIs (pollinations, DDG, etc.)

### 3.3 Model Optimization (from `learning/truth/truth_ultraia_capabilities.json`)
- **Embeddings densos deterministas sin deps**: dim 4 NO discrimina (coseno medio 0.9055)
- **Hashing con signo (Weinberger 2009)**: `v[hash % dim] += sign(hash) * peso`, normalizado a norma 1
- **Two-stage retrieval**: Dense small-dim + exact rescore = 100% ranking reproduction
- **Dimension selection**: `d > c^2 (sqrt(2 ln n) + z)^2 / Delta^2`, no por intuición
- **dim 1024**: recall@10 = 1.000, hybrid reproduces esparcido ranking al 100%
- **4 KB/punto** en vez de 16 KB

### 3.4 Memory and Semantic Search
- **Two-stage > giant vector**: Dense candidates + exact rescore
- **Recuperación en dos etapas**: denso pequeño + rescoring exacto sobre payload
- **Embeddings only generators**: No son jueces; quien puntúa debe ser misma función que usa memoria en-proceso
- **Corpus a medias peor que pequeño**: 38 de 54 docs tenían texto literal `""` por formatos inconsistentes
- **Loader debe verificar indexabilidad**: tokens > 0, no solo "no rompe"
- **`JSON.stringify(undefined ?? '')` devuelve '""'**: clásico que solo se ve midiendo

### 3.5 Verified Metrics and Evaluation
- **Media score (0-25)**: PAS≥20, createPublication persiste mediaScore
- **Channel KPIs**: published/failed/pending, success rate, average score
- **Publication metrics**: publicadas/fallidas/pendientes, tasaÉxito, scorePromedio
- **Publication signals**: feedback post-pub → critiques BAD → improve.ts
- **YouTube Data API v3**: GRATIS con YOUTUBE_API_KEY, cuota 10k/day, números como STRINGS
- **Keyless-first analytics**: TikTok Research = aprobación humana, X v2 = OAuth2 user, IG/Threads = token Graph, Telegram = bot admin

## Module 4: Production AI Engineering
### 4.1 Prompt Engineering
- **Structured prompts**: Zod validation, schema-driven prompts
- **Keyless prompts**: No dependen de API keys específicas
- **Bilingual prompts**: es/ar side-by-side
- **CTA by channel**: Platform-specific called-to-action

### 4.2 Model Routing and Selection
- **Primary**: Local/open-weights (GPU cloud when available)
- **Secondary**: Keyless APIs (pollinations, edge-tts, Tunetank)
- **Tertiary**: Degrade to storyboard/composición
- **Runtime detection**: `_HAS_LOCAL = torch.cuda.is_available()`

### 4.3 MLOps for UltraIa
- **Data versioning**: Track changes to prompts, models, configs
- **Model drift monitoring**: Compare new outputs vs verified truth
- **Retraining pipeline**: When and how to fine-tune
- **Dependency auditing**: CVE/SCA audits of all packages
- **Secret management**: No hardcoded keys; use env vars + validation

### 4.4 Integration Patterns
- **Instrumentation**: `registerGenEngineIfHealthy()` health-check `/health` timeout 3s
- **Provider setup**: `setMusicProvider`+`setVideoProvider` only if engine responds
- **Fallback chains**: engine → keyless → local procedural → fail-soft
- **Edge vs Node**: `serverOnlyBuiltins` + `serverExternalPackages` with stitch-sdk
- **Web payloads**: `node:*` imports need webpack fallbacks + `serverExternalPackages`