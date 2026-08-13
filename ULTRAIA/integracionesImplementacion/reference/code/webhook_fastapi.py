from fastapi import FastAPI, Request, BackgroundTasks
import uvicorn

app = FastAPI(title="AI Generation Webhook Receiver")

@app.post("/webhook/runway")
async def runway_callback(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    task_id = payload.get("id")
    status = payload.get("status")
    
    if status == "SUCCEEDED":
        video_url = payload["output"][0]
        print(f"¡Notificación recibida! Video listo en: {video_url}")
        # Registrar función en segundo plano para descargar y unir con audio
        background_tasks.add_task(process_final_video, video_url, task_id)
        
    return {"status": "received"}

def process_final_video(url: str, task_id: str):
    print(f"Descargando y procesando video {task_id} desde {url}...")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)