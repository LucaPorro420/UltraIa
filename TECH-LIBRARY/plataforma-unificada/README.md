# 🎓 Plataforma Total Unificada

> La primera plataforma que combina **47 cursos completos**, **orquestación multi-agente** y **34 proveedores LLM gratuitos** en una sola experiencia.

[![CI](https://github.com/SoftEngAi-dev/plataforma-unificada/actions/workflows/ci.yml/badge.svg)](https://github.com/SoftEngAi-dev/plataforma-unificada/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

## ✨ Características Principales

### 🎓 Academia Interactiva
- **47 cursos** · **269 lecciones** · **538 quizzes** con certificación verificable SHA-256
- Método Pomodoro integrado, rachas diarias, recomendaciones IA personalizadas
- Rutas guiadas: Full Stack Developer, AI/ML Engineer, DevOps & Cloud, Software Architect

### 🤖 Orquestación Multi-Agente (16 agentes)
- **Orchestrator**: Coordina flujos, planifica y delega
- **Tutor**: Guía pedagógica adaptada al nivel del usuario
- **Coder**: Implementa, refactoriza, debuggea, traduce código
- **Architect**: Diseña arquitectura, patrones, stack tecnológico
- **Researcher**: Investiga, compara tecnologías, mejores prácticas
- **Debugger**: Diagnostica errores, encuentra causa raíz
- **Tester**: Genera tests unitarios, integración, E2E
- **Security**: Audita OWASP, dependencias, autenticación
- **Documenter**: Genera README, OpenAPI, diagramas Mermaid
- **UI/UX**: Diseña interfaces, experiencia de usuario
- **Database Engineer**: Modelado SQL, migraciones, optimización
- **DevOps**: CI/CD, Kubernetes, Terraform, observabilidad
- **Cloud Engineer**: AWS/GCP/Azure, serverless, cost optimization
- **AI Engineer**: Fine-tuning, RAG, prompt engineering, evaluación
- **Project Manager**: Sprints, roadmap, risk management
- **Analyst**: User stories, domain modeling, acceptance criteria

### ☁️ FreeLLMAPI Gateway (34 proveedores)
- **7.4B tokens/mes gratis** de Google, Groq, OpenRouter, Cohere, Mistral, etc.
- Auto-failover inteligente, rate limiting adaptativo
- Fusion multi-modelo, compatible OpenAI/Anthropic/Gemini/Ollama
- MCP Server integrado para introspección de agentes

### 💻 IDE Educativo Inteligente
- Editor Monaco con IA que explica mientras programas
- Modos: Aprendizaje → Asistido → Profesional → Experto → Examen
- Terminal integrada, Git, debugging, testing, preview

### 🖥️ Multiplataforma
- **Web**: Astro 4 + React 18 + Tailwind (PWA, offline-first)
- **Desktop**: Electron 30 + Vite + React (Windows/macOS/Linux)
- **Mobile**: Expo 51 + React Native (próximamente)

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 20.18+
- npm 10+
- Docker (opcional, para producción)

### Desarrollo Local

```bash
# Clonar repositorio
git clone https://github.com/SoftEngAi-dev/plataforma-unificada.git
cd plataforma-unificada

# Instalar dependencias (workspaces)
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus claves

# Iniciar todo en desarrollo
npm run dev
```

Esto inicia:
- 🌐 **Web**: http://localhost:4321
- 🖥️ **Desktop**: Ventana Electron
- 🔌 **API**: http://localhost:3000
- 🤖 **Gateway**: http://localhost:3001 (FreeLLMAPI)

### Con Docker

```bash
# Construir imágenes
npm run docker:build

# Levantar stack completo
npm run docker:up

# Ver logs
npm run docker:logs
```

## 📁 Estructura del Monorepo

```
plataforma-unificada/
├── apps/
│   ├── web/           # Astro 4 + React 18 (PWA)
│   ├── desktop/       # Electron 30 + Vite + React
│   └── mobile/        # Expo 51 + React Native
├── packages/
│   ├── core/          # Types, config, utils compartidos
│   ├── agents/        # 16 agentes + OrchestrationEngine
│   ├── learning/      # Cursos, tutoring IA, gamificación
│   ├── gateway/       # Cliente FreeLLMAPI + Ollama compat
│   ├── plugins/       # Sistema de plugins
│   ├── mcp/           # MCP Server para agentes
│   ├── content/       # Importación Plataforma Total
│   ├── db/            # SQLite/PostgreSQL schemas
│   └── sync/          # Offline-first + hybrid sync
├── services/
│   ├── api/           # Express.js REST API
│   └── gateway/       # FreeLLMAPI server
├── infra/
│   ├── docker/        # Docker Compose + Dockerfiles
│   ├── k8s/           # Kubernetes manifests
│   └── terraform/     # Infrastructure as Code
└── docs/              # Documentación técnica
```

## 🔧 Configuración

### Variables de Entorno (.env)

```bash
# App
APP_NAME="Plataforma Total Unificada"
APP_VERSION="1.0.0"
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DB_TYPE=sqlite
DB_PATH=./data/plataforma.db

# FreeLLMAPI Gateway
GATEWAY_URL=http://localhost:3001
GATEWAY_API_KEY=tu_clave_si_tienes

# Auth
JWT_SECRET=tu_secreto_super_seguro_min_32_chars
JWT_EXPIRES_IN=7d

# AI Agents
AGENTS_ENABLED=true
AGENTS_DEFAULT_MODEL=auto
AGENTS_ORCHESTRATOR_MODEL=auto

# Features
FEATURE_AI_CHAT=true
FEATURE_AGENT_ORCHESTRATION=true
FEATURE_MCP_SERVER=true
FEATURE_OFFLINE_MODE=true
FEATURE_CERTIFICATES=true
FEATURE_GAMIFICATION=true
```

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests con coverage
npm run test:coverage

# Tests E2E (requiere servicios corriendo)
npm run test:e2e
```

## 📦 Build & Deploy

### Desktop (Electron Builder)

```bash
# Build para todas las plataformas
npm run desktop:dist

# Solo Windows
npm run build:desktop -- --win

# Solo macOS
npm run build:desktop -- --mac

# Solo Linux
npm run build:desktop -- --linux
```

### Web (Astro + Vercel/Cloudflare)

```bash
# Build estático
npm run build:web

# Deploy a Vercel
npm run deploy:vercel

# Deploy a Cloudflare Pages
npm run deploy:cloudflare
```

### API (Docker)

```bash
# Imagen Docker
docker build -f infra/docker/Dockerfile.api -t plataforma-api .

# Ejecutar
docker run -p 3000:3000 --env-file .env plataforma-api
```

## 📚 Importar Cursos de Plataforma Total

```bash
# Importar contenido de los 3 repositorios originales
npm run import:courses
```

Esto importa:
- 47 cursos de `plataforma-total-pro/contenido_*.py`
- 3,941 archivos de expansión (lecciones MD, quizzes HTML, flashcards, etc.)
- Plan diario de 364 días
- Proyectos guiados, entrevistas, resúmenes

## 🏗️ Arquitectura Técnica

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTES                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────────────┐ │
│  │  Web    │  │ Desktop │  │ Mobile  │  │  MCP Clients   │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └───────┬────────┘ │
└───────┼────────────┼────────────┼──────────────┼───────────┘
        │            │            │              │
        ▼            ▼            ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Express.js + JWT Auth + Rate Limiting + OpenAPI Docs   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   LEARNING    │  │   AGENTS      │  │   GATEWAY     │
│   SERVICE     │  │   ENGINE      │  │   (FreeLLM)   │
│               │  │               │  │               │
│ • Courses     │  │ • Orchestrator│  │ • 34 Providers│
│ • Progress    │  │ • 16 Agents   │  │ • 7.4B Tokens │
│ • Tutoring AI │  │ • MCP Server  │  │ • Auto-failover│
│ • Gamification│  │ • Human-in-loop│ │ • Ollama Compat│
└───────────────┘  └───────────────┘  └───────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                               │
│  SQLite (local) → PostgreSQL (prod) → Vector Store (RAG)    │
└─────────────────────────────────────────────────────────────┘
```

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Abre un Pull Request

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para detalles.

## 📄 Licencia

MIT License - ver [LICENSE](./LICENSE)

## 🙏 Créditos

- **FreeLLMAPI** - Gateway de 34 proveedores LLM gratuitos
- **Plataforma Total** - 47 cursos interactivos offline
- **Concepto Maestro** - Arquitectura multi-agente y pedagogía
- **Comunidad Open Source** - Por hacer esto posible

---

<div align="center">
  <strong>Hecho con ❤️ para desarrolladores que quieren aprender, construir y desplegar</strong>
  <br />
  <a href="https://github.com/SoftEngAi-dev/plataforma-unificada">GitHub</a> ·
  <a href="https://plataforma-total-unificada.dev">Demo</a> ·
  <a href="https://discord.gg/plataforma-total">Discord</a>
</div>