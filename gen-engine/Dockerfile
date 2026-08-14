# Imagen base con CUDA para los modelos open-weights del Gen-Engine.
# En CPU (sin GPU) el engine degrada automáticamente a keyless.
FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-venv python3-pip ffmpeg git curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN python3 -m venv /venv && /venv/bin/pip install --upgrade pip && \
    /venv/bin/pip install -r requirements.txt && \
    /venv/bin/pip install torch torchvision diffusers accelerate soundfile transformers

COPY app/ ./app/

EXPOSE 8000
CMD ["/venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]