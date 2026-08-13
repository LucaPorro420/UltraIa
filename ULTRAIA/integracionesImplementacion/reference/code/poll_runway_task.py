import asyncio
import aiohttp
import time

async def poll_task_status(
    task_id: str, 
    api_key: str, 
    base_url: str = "https://api.dev.runwayml.com/v1/tasks",
    initial_delay: int = 10,
    max_delay: int = 30,
    max_retries: int = 20
) -> dict:
    """
    Loop de Polling robusto con retardo adaptable para IAs de vídeo asíncronas.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "X-Runway-Version": "2024-11-06"
    }
    
    delay = initial_delay
    
    async with aiohttp.ClientSession() as session:
        for attempt in range(max_retries):
            print(f"[Intento {attempt + 1}/{max_retries}] Esperando {delay}s antes de consultar tarea: {task_id}...")
            await asyncio.sleep(delay)
            
            async with session.get(f"{base_url}/{task_id}", headers=headers) as response:
                if response.status != 200:
                    print(f"Error en respuesta ({response.status}): {await response.text()}")
                    continue
                
                data = await response.json()
                status = data.get("status")
                
                print(f"Estado actual: {status}")
                
                if status == "SUCCEEDED":
                    print("¡Generación completada con éxito!")
                    return data
                elif status in ["FAILED", "CANCELLED"]:
                    raise RuntimeError(f"La tarea de vídeo falló con estado: {status}. Detalles: {data.get('failure')}")
                
                # Aumenta gradualmente el tiempo de espera hasta el máximo permitido
                delay = min(delay + 5, max_delay)
                
    raise TimeoutError(f"Se alcanzó el límite máximo de intentos sin completar la tarea {task_id}.")