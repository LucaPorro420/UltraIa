import os
import json
import asyncio
import requests

# 1. Configuración de Credenciales
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
RUNWAY_API_KEY = os.getenv("RUNWAY_API_KEY")

# 2. Generación del Guion y Prompt Visual
def generate_metadata_prompt(topic: str) -> dict:
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "gpt-4o",
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "Eres un director audiovisual. Genera un JSON estricto con las claves: "
                    "'script_es' (guion en español con pausas dramáticas), "
                    "'script_ar' (guion en árabe diacritizado), "
                    "'video_prompt_en' (prompt cinemático en inglés para Runway/Kling)."
                )
            },
            {"role": "user", "content": f"Tema: {topic}"}
        ]
    }
    res = requests.post(url, headers=headers, json=payload)
    return json.loads(res.json()['choices'][0]['message']['content'])

# 3. Generación de Audio en ElevenLabs
def generate_audio(text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM") -> bytes:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    }
    res = requests.post(url, headers=headers, json=payload)
    if res.status_code == 200:
        return res.content
    raise Exception(f"Error ElevenLabs: {res.text}")

# 4. Solicitud de Video a Runway
def trigger_runway_video(prompt: str) -> str:
    url = "https://api.dev.runwayml.com/v1/tasks"
    headers = {
        "Authorization": f"Bearer {RUNWAY_API_KEY}",
        "X-Runway-Version": "2024-11-06",
        "Content-Type": "application/json"
    }
    payload = {
        "taskType": "gen3a_turbo",
        "promptText": prompt,
        "duration": 5,
        "ratio": "16:9"
    }
    res = requests.post(url, headers=headers, json=payload)
    data = res.json()
    return data["id"]

# 5. Ejecución Principal
async def main():
    print("--- 1. Generando Estructura de Guión y Prompts ---")
    data = generate_metadata_prompt("Ciudades inteligentes del futuro")
    print("Prompts Creados:", json.dumps(data, indent=2, ensure_ascii=False))

    print("\n--- 2. Generando Audio Multilingüe en ElevenLabs ---")
    audio_data = generate_audio(data["script_es"])
    with open("output_audio.mp3", "wb") as f:
        f.write(audio_data)
    print("Audio guardado como 'output_audio.mp3'")

    print("\n--- 3. Enviando tarea de Video a Runway ---")
    task_id = trigger_runway_video(data["video_prompt_en"])
    print(f"Tarea iniciada con ID: {task_id}")

    print("\n--- 4. Iniciando Loop de Polling Perfecto ---")
    result = await poll_task_status(task_id, RUNWAY_API_KEY)
    
    video_url = result.get("output", [None])[0]
    print(f"\n¡Proceso Completado Exitosamente! URL del video final: {video_url}")

if __name__ == "__main__":
    asyncio.run(main())