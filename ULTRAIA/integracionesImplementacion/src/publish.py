"""Publicación automática: YouTube Shorts + TikTok con metadatos es/ar.

Requisito funcional RF-12: el video final (vertical 9:16, <60s) se publica en
YouTube Shorts (YouTube Data API v3) y TikTok (Content Posting API v2) con
títulos, descripciones y hashtags bilingües español/árabe.

Base verificada: `gemini-code-1786584914170.py` y documentación en `ing`
(flujo OAuth2 de YouTube, Direct Post de 2 pasos de TikTok).

Requisitos previos:
    YouTube: client_secret.json de Google Cloud (YouTube Data API v3) en la
             carpeta del proyecto (ver .env.example).
    TikTok:  app de desarrollador con permiso video.publish + TIKTOK_ACCESS_TOKEN.
"""
from __future__ import annotations

import os
from pathlib import Path

import requests

from .config import BASE_DIR

YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

# Metadatos bilingües por defecto (se sobreescriben con los del guion si se pasa title).
DEFAULT_METADATA = {
    "title": "El Futuro de la IA | مستقبل الذكاء الاصطناعي #Shorts",
    "description": (
        "Descubre cómo la inteligencia artificial está transformando el mundo.\n"
        "اكتشف كيف يغير الذكاء الاصطناعي العالم اليوم.\n\n"
        "#IA #ArtificialIntelligence #الذكاء_الاصطناعي #Tech #Futuro"
    ),
    "tags": [
        "IA", "Inteligencia Artificial", "Tecnologia", "Shorts",
        "الذكاء الاصطناعي", "تكنولوجيا", "المستقبل",
    ],
    "privacy_status": "public",  # 'public', 'private' o 'unlisted'
}


# ------------------------------------------------------------------- YouTube

def _authenticate_youtube() -> "object":
    """Autenticación OAuth2 para YouTube. Reutiliza token_youtube.json."""
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    client_secrets = os.getenv("YOUTUBE_CLIENT_SECRET_FILE", str(BASE_DIR / "client_secret.json"))
    token_file = os.getenv("YOUTUBE_TOKEN_FILE", str(BASE_DIR / "token_youtube.json"))

    creds = None
    if Path(token_file).exists():
        creds = Credentials.from_authorized_user_file(token_file, YOUTUBE_SCOPES)
    if not creds or not creds.valid:
        if not Path(client_secrets).exists():
            raise RuntimeError(
                f"No existe {client_secrets}. Crea un proyecto OAuth2 en Google Cloud "
                "(YouTube Data API v3) y descarga las credenciales de app de escritorio."
            )
        flow = InstalledAppFlow.from_client_secrets_file(client_secrets, YOUTUBE_SCOPES)
        creds = flow.run_local_server(port=0)
        Path(token_file).write_text(creds.to_json(), encoding="utf-8")
    return build("youtube", "v3", credentials=creds)


def upload_to_youtube_shorts(video_path: str, metadata: dict | None = None) -> str:
    """Sube un video vertical (9:16) como YouTube Short y devuelve el video ID."""
    from googleapiclient.http import MediaFileUpload

    print("--- Iniciando subida a YouTube Shorts ---")
    youtube = _authenticate_youtube()
    meta = {**DEFAULT_METADATA, **(metadata or {})}

    body = {
        "snippet": {
            "title": meta["title"],
            "description": meta["description"],
            "tags": meta["tags"],
            "categoryId": "28",  # Ciencia y Tecnología
        },
        "status": {
            "privacyStatus": meta["privacy_status"],
            "selfDeclaredMadeForKids": False,
        },
    }
    media = MediaFileUpload(video_path, mimetype="video/mp4", resumable=True,
                            chunksize=1024 * 1024 * 5)

    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Progreso de subida a YouTube: {int(status.progress() * 100)}%")

    print(f"¡Éxito! Video subido. ID: {response['id']} → https://youtube.com/shorts/{response['id']}")
    return response["id"]


# -------------------------------------------------------------------- TikTok

def upload_to_tiktok(video_path: str, access_token: str, metadata: dict | None = None) -> str:
    """Sube un video a TikTok (Direct Post de 2 pasos). Devuelve el publish_id."""
    print("\n--- Iniciando subida a TikTok ---")
    meta = {**DEFAULT_METADATA, **(metadata or {})}
    file_size = Path(video_path).stat().st_size

    # Paso A: inicialización de la carga
    init_url = "https://open.tiktokapis.com/v2/post/publish/video/init/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8",
    }
    title_with_hashtags = f"{meta['title']} {' '.join('#' + t for t in meta['tags'])}"
    init_body = {
        "post_info": {
            "title": title_with_hashtags[:150],  # límite TikTok
            "privacy_level": "PUBLIC_TO_EVERYONE",
            "disable_duet": False,
            "disable_stitch": False,
            "disable_comment": False,
        },
        "source_info": {
            "source": "FILE_UPLOAD",
            "video_size": file_size,
            "chunk_size": file_size,
            "total_chunk_count": 1,
        },
    }
    response_init = requests.post(init_url, headers=headers, json=init_body, timeout=60)
    init_data = response_init.json()
    if response_init.status_code != 200 or init_data.get("error", {}).get("code") != "ok":
        raise RuntimeError(f"Error al inicializar subida en TikTok: {init_data}")

    upload_url = init_data["data"]["upload_url"]
    publish_id = init_data["data"]["publish_id"]

    # Paso B: subida del binario
    print("Subiendo archivo de video a los servidores de TikTok...")
    upload_headers = {
        "Content-Type": "video/mp4",
        "Content-Length": str(file_size),
        "Content-Range": f"bytes 0-{file_size - 1}/{file_size}",
    }
    with Path(video_path).open("rb") as video_file:
        upload_res = requests.put(upload_url, headers=upload_headers, data=video_file, timeout=600)

    if upload_res.status_code not in (200, 201):
        raise RuntimeError(f"Error al subir binario a TikTok: {upload_res.text}")
    print(f"¡Éxito! Video enviado a TikTok. Publish ID: {publish_id}")
    return publish_id


def build_metadata_from_script(title: str, plain_script: str | None = None) -> dict:
    """Construye metadatos bilingües a partir del título del guion generado.

    El título árabe del guion se combina con un título español genérico; los
    tags mezclan hashtags es/ar para ambos algoritmos (YouTube y TikTok).
    """
    tags = [
        "IA", "Inteligencia Artificial", "Shorts", "Tecnologia",
        "الذكاء الاصطناعي", "تكنولوجيا", "المستقبل",
    ]
    desc_es = f"{title}\n\nContenido generado con IA. #IA #Shorts"
    desc_ar = plain_script or f"{title}"
    return {
        "title": f"{title} | الذكاء الاصطناعي #Shorts",
        "description": f"{desc_es}\n{desc_ar}\n\n{' '.join('#' + t for t in tags)}",
        "tags": tags,
        "privacy_status": "public",
    }


def publish_video(
    video_path: str,
    metadata: dict | None = None,
    to_youtube: bool = True,
    to_tiktok: bool = True,
) -> dict:
    """Punto de entrada: publica el MP4 final en las plataformas habilitadas."""
    results: dict = {}
    if to_youtube:
        results["youtube_id"] = upload_to_youtube_shorts(video_path, metadata)
    if to_tiktok:
        token = os.getenv("TIKTOK_ACCESS_TOKEN", "")
        if not token:
            print("[Aviso] No se proporcionó TIKTOK_ACCESS_TOKEN. Omitiendo TikTok.")
        else:
            results["tiktok_publish_id"] = upload_to_tiktok(video_path, token, metadata)
    return results