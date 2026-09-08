# Master Course Map — UltraIa Learning

## Overview
Complete nested course structure for UltraIa learning system, organized across 7 main domains with progressive difficulty and verified content.

## Course Structure

### 1. English Language Course (courses/english/)
- **Level 1**: Basics (greetings, personal info, basic verbs)
- **Level 2**: Technical English (programming terms, dev workflow, API terms)
- **Level 3**: AI/Engineering English (LLM terms, modes, tools)
- **Level 4**: Bilingual Technical (es/ar technical vocabulary, bilingual prompts)
- **Assessments**: Vocabulary quiz, technical translation, bilingual prompt construction

### 2. Programming Course (courses/programming/)
- **Module 1**: Fundamentals (pixel engine math, trigonometry, rasterization, procedural generation, audio, video I/O, metrics, architecture, 11 projects)
- **Module 2**: Free Resources (115 free programming books, library structure, usage)
- **Module 3**: Graph Theory (fundamentals, algorithms, applications)
- **Module 4**: Media Processing (pipeline programming, scripting, UltraIa integration)
- **Module 5**: Advanced Topics (differentiable programming, multi-language stack, testing/verification)

### 3. Logic Course (courses/logic/)
- **Module 1**: Mathematical Foundations (propositional logic, predicate logic, logical equivalences)
- **Module 2**: Reasoning Patterns (IA loop 4-phase, verification logic, RICE prioritization, budget-aware decision making, gap detection)
- **Module 3**: Logical Frameworks in UltraIa (state integrity check, loop triage, auto-learn gap detection)
- **Module 4**: Logical Fallacies (common AI/LLM errors, logical fallacies)
- **Module 5**: Logic in Code (conventional commits, gate logic, error handling patterns)

### 4. AI/ML Course (courses/ai_ml/)
- **Module 1**: Diffusion and Generative Models (theoretical foundations from arXiv, code references, proposed decisions)
- **Module 2**: Media and Modalities (keyless image, language detection CJK, TTS, music, video degradation, provider design)
- **Module 3**: UltraIa Capabilities (verified capabilities, keyless-first philosophy, model optimization, memory/semantic search)
- **Module 4**: Production AI Engineering (prompt engineering, model routing, MLOps, integration patterns)

### 5. Video Course (courses/video/)
- **Module 1**: Video Editing Fundamentals (cutting/triming, subtitles/overlays, audio processing, EDL, self-evaluation)
- **Module 2**: Video Generation (procedural, storyboard/shot planning, multi-modal, long-form 60-180s, open-source tools)
- **Module 3**: ScreenFlow and Recording (capture pipeline, region-based editing, post-production workflow)
- **Module 4**: Video Quality and Metrics (MAE/MSE/PSNR/SSIM, videoqa tool, self-evaluation integration)
- **Module 5**: Advanced Techniques (Ken Burns, procedural generation, SEO/distribution)

### 6. Cloud Course (courses/cloud/)
- **Module 1**: Cloud-Free 2026 Verified Landscape (Cloudflare, Vercel, Supabase, Render, X API v2, Meta/IG, TikTok, YouTube)
- **Module 2**: Cost and Budget Management (budget limits, free tier decision matrix, cost optimization)
- **Module 3**: Repository Own and Vault Integration (local vault, cloud sync, R2 adapter, local adapter, upload limits/types)
- **Module 4**: API Integration Patterns (web routes, client-side, cloud service operations)
- **Module 5**: Deployment and Migration (migration patterns, multi-region, monitoring/health checks)

### 7. VFX Course (courses/vfx/)
- **Module 1**: Procedural Effect Principles (9 effect kinds, settings-as-API tree, phase machine, flicker/restrike, GPU ring-buffer)
- **Module 2**: Colorimetry and Shading (HSL color analysis, curvature shading 0-1, perspective planning, GLSL shaders per kind)
- **Module 3**: Effect Orchestration (planReframe, planUpscale, planLutMatch, planRotoscope, planDrawToEdit, planBroll)
- **Module 3**: Advanced Techniques (noise by personality, shape hash, anti-patterns, GPU optimization)
- **Module 5**: Integration with UltraIa Tools (tool integration, codevfx demo output, tests/verification)

## Navigation Guide

### How to Use This Map
1. **Start at your level**: Each module has progressive difficulty
2. **Follow the sequence**: Modules build on each other within a course
3. **Use the search tool**: `python learning/scripts/search_learning.py <query>` to find specific topics
4. **Cross-reference**: Topics appear in multiple courses (e.g., SDF appears in both Programming and VFX)

### Recommended Learning Paths

#### Path A: Full-Stack Developer (start-to-end)
1. English Level 1 → Programming Module 1 → Logic Module 1 → AI/ML Module 1 → Video Module 1 → Cloud Module 1 → VFX Module 1

#### Path B: AI Engineer (focused)
1. English Level 3 → AI/ML Full → Logic Full → Video Editing → Cloud Deployment

#### Path C: Video Engineer (focused)
1. English Level 2 → Video Full → Cloud Deployment → VFX Effects → Programming Math

#### Path D: Quick Reference (topic-based)
- Use `search_learning.py "SDF"` → appears in Programming Module 1, VFX Module 1
- Use `search_learning.py "TTT"` → appears in multiple contexts
- Use `search_learning.py "gate"` → appears in Logic and modes of operation

### Course Verification
- **Total source files**: 30 (original) + 7 new course outlines
- **Total lines**: 11,209 (original sources) + course documentation
- **All content**: Offline-first, verified against truth, keyless-first
- **Searchable**: All content searchable via `search_learning.py`

### Course Updates
- **Add new content**: Create new module under appropriate course directory
- **Update outline**: Modify course-outline.md
- **Rebuild search index**: The search tool auto-discovers new files
- **Verify**: Run `python learning/scripts/search_learning.py --stats` to update stats