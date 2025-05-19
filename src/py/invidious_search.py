from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

# Modelo de datos para la respuesta (similar a youtube_search.py)
class VideoResult(BaseModel):
    id: str
    title: str
    url: str
    thumbnail: str
    description: str
    published_at: str
    channel_title: str

class SearchResponse(BaseModel):
    results: List[VideoResult]
    total_results: int
    query: str
    timestamp: str

# Inicializar FastAPI
app = FastAPI(
    title="Invidious Search API",
    description="API para buscar videos en YouTube usando la API de Invidious",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de Invidious
# Lista de instancias públicas de Invidious (puedes cambiar por tu instancia preferida)
INVIDIOUS_INSTANCES = [
    "https://vid.puffyan.us",
    "https://invidious.snopyta.org",
    "https://yt.artemislena.eu",
    "https://invidious.namazso.eu"
]

# Usamos la primera instancia por defecto, pero se puede configurar para usar otras
INVIDIOUS_API_URL = os.getenv("INVIDIOUS_API_URL", INVIDIOUS_INSTANCES[0])

# Función para convertir la respuesta de Invidious al formato que esperamos
def convert_invidious_result(item: Dict[Any, Any]) -> VideoResult:
    # Seleccionar la mejor miniatura disponible
    thumbnail_url = ""
    if item.get("videoThumbnails"):
        # Intentar obtener la miniatura de alta calidad
        for thumb in item["videoThumbnails"]:
            if thumb.get("quality") == "high" or thumb.get("quality") == "maxres":
                thumbnail_url = thumb["url"]
                break
        # Si no hay de alta calidad, usar la primera disponible
        if not thumbnail_url and item["videoThumbnails"]:
            thumbnail_url = item["videoThumbnails"][0]["url"]
    
    # Convertir timestamp de Unix a formato ISO (si está disponible)
    published_at = ""
    if item.get("published"):
        try:
            published_at = datetime.fromtimestamp(item["published"]).isoformat()
        except:
            published_at = item.get("publishedText", "")
    else:
        published_at = item.get("publishedText", "")
    
    # Crear y devolver el objeto VideoResult
    return VideoResult(
        id=item["videoId"],
        title=item["title"],
        url=f"https://www.youtube.com/watch?v={item['videoId']}",
        thumbnail=thumbnail_url,
        description=item.get("description", ""),
        published_at=published_at,
        channel_title=item.get("author", "")
    )

@app.get("/search", response_model=SearchResponse)
def search_videos(
    query: str = Query(..., min_length=2, max_length=100),
    max_results: Optional[int] = Query(default=3, ge=1, le=10)
):
    try:
        search_query = query
        
        # Construir la URL de la API de Invidious para buscar videos
        search_url = f"{INVIDIOUS_API_URL}/api/v1/search"
        params = {
            "q": search_query,
            "type": "video",
            "sort_by": "relevance"
        }
        
        # Realizar la petición HTTP a la API de Invidious usando requests
        response = requests.get(search_url, params=params)
        
        # Comprobar si la petición fue exitosa
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error from Invidious API: {response.text}"
            )
        
        # Obtener los datos JSON de la respuesta
        data = response.json()
        
        # Filtrar solo los resultados de tipo 'video'
        videos = [item for item in data if item.get("type") == "video"]
        
        # Limitar el número de resultados según max_results
        limited_videos = videos[:max_results]
        
        # Convertir los resultados al formato esperado
        results = [convert_invidious_result(item) for item in limited_videos]
        
        # Construir y devolver la respuesta
        return SearchResponse(
            results=results,
            total_results=len(results),
            query=search_query,
            timestamp=datetime.now().isoformat()
        )
    
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Error connecting to Invidious API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error searching videos: {str(e)}"
        )

# Endpoint para probar la conexión a la API de Invidious
@app.get("/invidious-status")
def check_invidious():
    try:
        # Intentar obtener la información de la API de Invidious
        response = requests.get(f"{INVIDIOUS_API_URL}/api/v1/stats")
        
        if response.status_code != 200:
            return {
                "status": "error",
                "message": f"Error from Invidious API: Status {response.status_code}",
                "api_url": INVIDIOUS_API_URL
            }
        
        stats = response.json()
        return {
            "status": "ok",
            "api_url": INVIDIOUS_API_URL,
            "version": stats.get("version", "unknown"),
            "software": stats.get("software", {})
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error connecting to Invidious API: {str(e)}",
            "api_url": INVIDIOUS_API_URL
        }

# Endpoint para cambiar la instancia de Invidious
@app.get("/change-instance/{index}")
def change_invidious_instance(index: int):
    global INVIDIOUS_API_URL
    
    if index < 0 or index >= len(INVIDIOUS_INSTANCES):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid instance index. Must be between 0 and {len(INVIDIOUS_INSTANCES) - 1}"
        )
    
    INVIDIOUS_API_URL = INVIDIOUS_INSTANCES[index]
    
    return {
        "status": "ok",
        "message": f"Invidious instance changed to {INVIDIOUS_API_URL}",
        "current_instance": INVIDIOUS_API_URL,
        "available_instances": INVIDIOUS_INSTANCES
    }

# Endpoint para obtener todas las instancias disponibles
@app.get("/available-instances")
def get_available_instances():
    return {
        "current_instance": INVIDIOUS_API_URL,
        "available_instances": INVIDIOUS_INSTANCES
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 