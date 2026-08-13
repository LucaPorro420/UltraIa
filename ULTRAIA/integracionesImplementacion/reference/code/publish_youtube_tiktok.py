import os
import json
import requests
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# ==========================================
# 1. CONFIGURACIÓN Y METADATOS (ÁRABE / ESPAÑOL)
# ==========================================

# Estructura de metadatos multilingües
VIDEO_METADATA = {
    "title": "El Futuro de la IA | مستقبل الذكاء الاصطناعي #Shorts",
    "description": (
        "Descubre cómo la inteligencia artificial está transformando el mundo.\n"
        "اكتشف كيف يغير الذكاء الاصطناعي العالم اليوم.\n\n"
        "#IA #ArtificialIntelligence #الذكاء_الاصطناعي #Tech #Futuro"
    ),
    "tags": [
        "IA", "Inteligencia Artificial", "Tecnologia", "Shorts",
        "الذكاء الاصطناعي", "تكنولوجيا", "المستقبل"
    ],
    "privacy_status": "public"  # 'public', 'private', o 'unlisted'
}

# ==========================================
# 2. MÓDULO YOUTUBE SHORTS (YouTube Data API v3)
# ==========================================

YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

def authenticate_youtube(client_secrets_file="client_secret.json"):
    """
    Maneja el flujo de autenticación OAuth 2.0 para YouTube.
    Guarda y reutiliza el token en token.json.
    """
    creds = None
    if os.path.exists("token_youtube.json"):
        creds = Credentials.from_authorized_user_file("token_youtube.json", YOUTUBE_SCOPES)
    
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(client_secrets_file, YOUTUBE_SCOPES)
        creds = flow.run_local_server(port=0)
        with open("token_youtube.json", "w") as token:
            token.write(creds.to_json())
            
    return build("youtube", "v3", credentials=creds)

def upload_to_youtube_shorts(video_path, metadata):
    """
    Sube un video vertical en formato YouTube Shorts.
    """
    print("--- Iniciando subida a YouTube Shorts ---")
    youtube = authenticate_youtube()

    body = {
        "snippet": {
            "title": metadata["title"],
            "description": metadata["description"],
            "tags": metadata["tags"],
            "categoryId": "28"  # Categoría 28: Ciencia y Tecnología
        },
        "status": {
            "privacyStatus": metadata["privacy_status"],
            "selfDeclaredMadeForKids": False
        }
    }

    # Carga del archivo de video
    media = MediaFileUpload(
        video_path, 
        mimetype="video/mp4", 
        resumable=True, 
        chunksize=1024*1024*5 # Bloques de 5MB
    )

    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Progreso de subida a YouTube: {int(status.progress() * 100)}%")

    print(f"¡Éxito! Video subido a YouTube. ID del Video: {response['id']}")
    print(f"Enlace: https://youtube.com/shorts/{response['id']}")
    return response['id']

# ==========================================
# 3. MÓDULO TIKTOK (TikTok Content Posting API v2)
# ==========================================

def upload_to_tiktok(video_path, access_token, metadata):
    """
    Sube un video a TikTok utilizando el flujo de 2 pasos de la API oficial (Direct Post).
    """
    print("\n--- Iniciando subida a TikTok ---")
    file_size = os.path.getsize(video_path)

    # Paso A: Inicialización de la carga (POST)
    init_url = "https://open.tiktokapis.com/v2/post/publish/video/init/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8"
    }
    
    title_with_hashtags = f"{metadata['title']} {' '.join(['#'+t for t in metadata['tags']])}"
    
    init_body = {
        "post_info": {
            "title": title_with_hashtags[:150],  # Límite de caracteres en TikTok
            "privacy_level": "PUBLIC_TO_EVERYONE",
            "disable_duet": False,
            "disable_stitch": False,
            "disable_comment": False
        },
        "source_info": {
            "source": "FILE_UPLOAD",
            "video_size": file_size,
            "chunk_size": file_size,
            "total_chunk_count": 1
        }
    }

    response_init = requests.post(init_url, headers=headers, json=init_body)
    init_data = response_init.json()

    if response_init.status_code != 200 or init_data.get("error", {}).get("code") != "ok":
        raise Exception(f"Error al inicializar subida en TikTok: {init_data}")

    upload_url = init_data["data"]["upload_url"]
    publish_id = init_data["data"]["publish_id"]

    # Paso B: Subir el archivo de video binario
    print("Subiendo archivo de video a los servidores de TikTok...")
    with open(video_path, "rb") as video_file:
        upload_headers = {
            "Content-Type": "video/mp4",
            "Content-Length": str(file_size),
            "Content-Range": f"bytes 0-{file_size - 1}/{file_size}"
        }
        upload_res = requests.put(upload_url, headers=upload_headers, data=video_file)

    if upload_res.status_code in [200, 201]:
        print(f"¡Éxito! Video enviado a TikTok para procesamiento. Publish ID: {publish_id}")
        return publish_id
    else:
        raise Exception(f"Error al subir binario a TikTok: {upload_res.text}")

# ==========================================
# 4. EJECUCIÓN PRINCIPAL
# ==========================================

if __name__ == "__main__":
    # Ruta del video final generado previamente
    VIDEO_FILE = "output_final_video.mp4"
    
    # Credencial de TikTok (Token de acceso OAuth del desarrollador)
    TIKTOK_ACCESS_TOKEN = os.getenv("TIKTOK_ACCESS_TOKEN", "TU_TIKTOK_ACCESS_TOKEN_AQUI")

    if not os.path.exists(VIDEO_FILE):
        print(f"Error: El archivo {VIDEO_FILE} no existe.")
    else:
        try:
            # 1. Publicar en YouTube Shorts
            yt_id = upload_to_youtube_shorts(VIDEO_FILE, VIDEO_METADATA)
            
            # 2. Publicar en TikTok
            if TIKTOK_ACCESS_TOKEN != "TU_TIKTOK_ACCESS_TOKEN_AQUI":
                tt_id = upload_to_tiktok(VIDEO_FILE, TIKTOK_ACCESS_TOKEN, VIDEO_METADATA)
            else:
                print("\n[Aviso] No se proporcionó TIKTOK_ACCESS_TOKEN. Omitiendo subida a TikTok.")

        except Exception as e:
            print(f"\nOcurrió un error en el proceso de publicación: {str(e)}")