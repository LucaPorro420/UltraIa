"""Carga centralizada de configuración: pipeline_config.json + variables de entorno.

Requisito funcional RF-00: toda la configuración del pipeline (proveedores,
modelos, parámetros de voz/video) vive en `pipeline_config.json`; las claves
API viven EXCLUSIVAMENTE en variables de entorno (.env), nunca en código.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Ruta base: raíz del directorio de integraciones (dos niveles arriba de src/)
BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "pipeline_config.json"
OUTPUT_DIR = BASE_DIR / "output"


@dataclass(frozen=True)
class Settings:
    """Snapshot tipado de la configuración activa del pipeline."""

    language_target: str
    llm_model: str
    llm_temperature: float
    llm_base_url: str
    openai_api_key: str
    voice_id: str
    elevenlabs_api_key: str
    runway_api_key: str
    video_provider: str
    image_model: str
    image_size: str
    image_provider: str
    video_model: str
    video_duration_sec: int
    video_aspect_ratio: str
    polling_initial_delay: int
    polling_max_delay: int
    polling_max_retries: int
    fal_key_id: str
    fal_key_secret: str
    fal_image_model: str
    fal_video_model: str


def load_config() -> dict:
    """Lee pipeline_config.json. Lanza FileNotFoundError si no existe."""
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"No se encontró {CONFIG_PATH}. El pipeline requiere el schema de configuración."
        )
    with CONFIG_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def get_settings() -> Settings:
    """Construye Settings fusionando JSON + entorno. Requiere .env para las claves."""
    load_dotenv(BASE_DIR / ".env")
    cfg = load_config()
    pipe = cfg["pipeline"]

    text_cfg = pipe["text_generation"]
    voice_cfg = pipe["voice_synthesis"]
    img_cfg = pipe["image_generation"]
    vid_cfg = pipe["video_generation"]
    poll_cfg = pipe["polling"]
    fal_cfg = pipe["fal_ai"]

    return Settings(
        language_target=pipe["language_target"],
        llm_model=text_cfg["model"],
        llm_temperature=text_cfg["temperature"],
        llm_base_url=os.getenv("LLM_BASE_URL", "https://api.openai.com/v1"),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        voice_id=os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"),
        elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY", ""),
        runway_api_key=os.getenv("RUNWAY_API_KEY", ""),
        video_provider=os.getenv("ULTRAIA_VIDEO_PROVIDER", "runway").lower(),
        image_model=img_cfg["model"],
        image_size=img_cfg["size"],
        image_provider=img_cfg["provider"].lower(),
        video_model=vid_cfg["model"],
        video_duration_sec=vid_cfg["duration_sec"],
        video_aspect_ratio=vid_cfg["aspect_ratio"],
        polling_initial_delay=poll_cfg["initial_delay_sec"],
        polling_max_delay=poll_cfg["max_delay_sec"],
        polling_max_retries=poll_cfg["max_retries"],
        fal_key_id=os.getenv("FAL_KEY_ID", ""),
        fal_key_secret=os.getenv("FAL_KEY_SECRET", ""),
        fal_image_model=fal_cfg["image_model"],
        fal_video_model=fal_cfg["video_model"],
    )


def require_key(name: str, value: str) -> None:
    """Valida que una clave API esté presente. Lanza RuntimeError si falta."""
    if not value:
        raise RuntimeError(
            f"Falta la clave API '{name}'. Configúrala en el archivo .env "
            f"(plantilla en .env.example) o usa --dry-run para simular."
        )


def ensure_output_dirs() -> dict[str, Path]:
    """Crea y devuelve las carpetas de salida: audio/, images/, video/."""
    dirs = {
        "audio": OUTPUT_DIR / "audio",
        "images": OUTPUT_DIR / "images",
        "video": OUTPUT_DIR / "video",
        "meta": OUTPUT_DIR / "meta",
    }
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)
    return dirs