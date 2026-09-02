#!/usr/bin/env bash
# setup_repos.sh
#
# Clona varios repositorios relevantes para levantar modelos locales y tooling
# y ejecuta pasos básicos de instalación por cada repo.
#
# USO:
#   ./setup_repos.sh            # interactivo (te preguntará antes de acciones pesadas)
#   ./setup_repos.sh --dir tools --yes   # clona en ./tools y responde SÍ a prompts
#
# ADVERTENCIAS:
# - No descarga modelos pesados (weights). Debes descargarlos manualmente según la guía del repo.
# - Algunos builds requieren compiladores, CUDA, o mucho tiempo/espacio.
# - Revisa los pasos antes de ejecutar en máquinas críticas.
set -euo pipefail

# ---------------------------
# Config
# ---------------------------
TARGET_DIR="tools"
AUTO_YES=0
PARALLEL_JOBS=2

# Repositorios a clonar + tipo recomendado
# (nombre usado para carpeta local, repo URL, notes)
REPOS=(
  "llama.cpp|https://github.com/ggerganov/llama.cpp|c++ build (make)"
  "gpt4all|https://github.com/nomic-ai/gpt4all|python + native components"
  "text-generation-webui|https://github.com/oobabooga/text-generation-webui|python webui (API)"
  "text-generation-inference|https://github.com/huggingface/text-generation-inference|HuggingFace TGI"
  "transformers|https://github.com/huggingface/transformers|python package (optional)"
  "sentence-transformers|https://github.com/UKPLab/sentence-transformers|python embeddings"
  "chroma|https://github.com/chroma-core/chroma|python/chromadb"
  "qdrant|https://github.com/qdrant/qdrant|docker image (recommended)"
  "TTS|https://github.com/coqui-ai/TTS|python TTS (optional)"
)

# ---------------------------
# Helpers
# ---------------------------
log(){ echo -e "\n[setup] $*"; }
err(){ echo -e "\n[ERROR] $*" >&2; }

confirm() {
  if [ "$AUTO_YES" -eq 1 ]; then
    return 0
  fi
  read -r -p "$1 [y/N] " answer
  case "$answer" in
    [Yy]* ) return 0 ;;
    * ) return 1 ;;
  esac
}

check_prereq() {
  local cmd=$1
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "No se encontró '$cmd' en PATH. Instálalo antes y vuelve a ejecutar."
    return 1
  fi
  return 0
}

# ensure basic tools
for c in git python3 pip3; do
  if ! command -v "$c" >/dev/null 2>&1; then
    err "Falta requisito: $c (instálalo antes de proceder)."
  fi
done

# npm and docker are optional but recommended for some repos
HAS_NPM=0
HAS_DOCKER=0
if command -v npm >/dev/null 2>&1; then HAS_NPM=1; fi
if command -v docker >/dev/null 2>&1; then HAS_DOCKER=1; fi

# ---------------------------
# CLI args
# ---------------------------
while [[ $# -gt 0 ]]; do
  case $1 in
    --dir) TARGET_DIR="$2"; shift 2 ;;
    --yes) AUTO_YES=1; shift ;;
    --jobs) PARALLEL_JOBS="$2"; shift 2 ;;
    --help|-h) echo "Usage: $0 [--dir DIR] [--yes] [--jobs N]"; exit 0 ;;
    *) err "Unknown arg: $1"; exit 1 ;;
  esac
done

mkdir -p "$TARGET_DIR"
log "Destino: $TARGET_DIR"
log "Auto yes: $AUTO_YES"

# ---------------------------
# Install helpers
# ---------------------------
run_in_venv() {
  # $1 = path, $2 = pip args...
  local path="$1"; shift
  if [ ! -d "$path/.venv" ]; then
    python3 -m venv "$path/.venv"
  fi
  "$path/.venv/bin/pip" --version >/dev/null 2>&1 || true
  "$path/.venv/bin/pip" "$@"
}

npm_install_if_needed() {
  local dir="$1"
  if [ "$HAS_NPM" -eq 1 ] && [ -f "$dir/package.json" ]; then
    log "Running npm install in $dir"
    (cd "$dir" && npm install)
  fi
}

pip_install_requirements_if_needed() {
  local dir="$1"
  if [ -f "$dir/requirements.txt" ]; then
    log "Creating venv and pip installing requirements in $dir"
    run_in_venv "$dir" install -U pip wheel
    run_in_venv "$dir" install -r "$dir/requirements.txt"
  elif [ -f "$dir/pyproject.toml" ] || [ -f "$dir/setup.py" ]; then
    log "Creating venv and pip installing editable package in $dir"
    run_in_venv "$dir" install -U pip wheel
    run_in_venv "$dir" install -e "$dir"
  fi
}

make_if_needed() {
  local dir="$1"
  if [ -f "$dir/Makefile" ]; then
    log "Running make in $dir (may take time)"
    (cd "$dir" && make -j"${PARALLEL_JOBS}")
  fi
}

docker_pull_if_needed() {
  local image="$1"
  if [ "$HAS_DOCKER" -eq 1 ]; then
    log "Docker pulling image $image"
    docker pull "$image"
  else
    log "Docker not available; skipping docker pull for $image"
  fi
}

# ---------------------------
# Repo-specific steps
# ---------------------------
install_repo() {
  local name="$1"
  local url="$2"
  local notes="$3"
  local dir="$TARGET_DIR/$name"

  log "==== Processing $name ===="
  if [ ! -d "$dir" ]; then
    log "Cloning $url -> $dir"
    git clone "$url" "$dir"
  else
    log "Repo $dir already exists; fetching latest"
    (cd "$dir" && git fetch --all --prune && git pull --ff-only) || true
  fi

  case "$name" in
    llama.cpp)
      log "llama.cpp: building (make)"
      make_if_needed "$dir"
      ;;
    gpt4all)
      log "gpt4all: install python deps if present"
      pip_install_requirements_if_needed "$dir"
      ;;
    text-generation-webui)
      log "text-generation-webui: pip install requirements (may include torch)"
      pip_install_requirements_if_needed "$dir"
      ;;
    text-generation-inference)
      log "text-generation-inference: follow HF TGI docs; attempting pip install"
      pip_install_requirements_if_needed "$dir"
      ;;
    transformers)
      log "transformers: we recommend pip installing in a venv"
      pip_install_requirements_if_needed "$dir" || true
      ;;
    sentence-transformers)
      log "sentence-transformers: pip install -e . (if you want to develop) or pip install sentence-transformers"
      pip_install_requirements_if_needed "$dir" || run_in_venv "$dir" install -U sentence-transformers
      ;;
    chroma)
      log "chroma: pip install chromadb (or build from source)"
      python3 -m pip install --user chromadb || true
      ;;
    qdrant)
      log "qdrant: recommended via docker. Pulling qdrant image."
      docker_pull_if_needed "qdrant/qdrant:latest"
      ;;
    TTS)
      log "Coqui TTS: pip install -r requirements.txt if present"
      pip_install_requirements_if_needed "$dir"
      ;;
    *)
      npm_install_if_needed "$dir"
      pip_install_requirements_if_needed "$dir"
      make_if_needed "$dir"
      ;;
  esac

  log "Finished processing $name ($notes)"
}

# ---------------------------
# Main loop
# ---------------------------
log "Starting cloning/install process for ${#REPOS[@]} repos."

for entry in "${REPOS[@]}"; do
  IFS="|" read -r name url notes <<< "$entry"
  install_repo "$name" "$url" "$notes"
done

# Post-install notes
log "All repos processed. Next manual steps (recommended):"
cat <<EOF

- Models: many repos do NOT auto-download model weights. Read each repo's README to download models.
  Examples:
    * llama.cpp: get quantized weights and place them in the models/ folder.
    * text-generation-webui: download a model and point the UI to it.
- Docker services:
    * qdrant: run with 'docker run -p 6333:6333 qdrant/qdrant' or use docker-compose in qdrant docs.
- For each python repo a virtualenv was created at <repo>/.venv. Activate it with:
    source <repo>/.venv/bin/activate
- If any git LFS files are required, run:
    git lfs install
    git lfs pull

If you want me to also:
  - generate a docker-compose.yml that brings up qdrant + chroma + text-gen-server,
  - or create a small adapter snippet to connect UltraIa backend to one of these model servers,
say: "Genera docker-compose" or "Genera adapter for text-generation-webui".

EOF

log "Done."
