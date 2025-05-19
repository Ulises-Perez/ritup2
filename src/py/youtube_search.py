from googleapiclient.discovery import build
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

# Cargar variables de entorno
load_dotenv()

# Modelo de datos para la respuesta
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
    title="YouTube Search API",
    description="API para buscar videos en YouTube",
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

# Configurar la API de YouTube
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
if not YOUTUBE_API_KEY:
    raise ValueError("YOUTUBE_API_KEY no está configurada en el archivo .env")

youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)

@app.get("/search", response_model=SearchResponse)
async def search_videos(
    query: str = Query(..., min_length=2, max_length=100),
    max_results: Optional[int] = Query(default=3, ge=1, le=10)
):
    try:
        # La consulta ya debería contener tanto el nombre de la canción como el artista
        search_query = query
        
        # Realizar la búsqueda
        search_response = youtube.search().list(
            q=search_query,
            part="id,snippet",
            maxResults=max_results,
            type="video"
        ).execute()

        # Procesar los resultados
        results = []
        for item in search_response.get("items", []):
            video_id = item["id"]["videoId"]
            snippet = item["snippet"]
            
            video_data = VideoResult(
                id=video_id,
                title=snippet["title"],
                url=f"https://www.youtube.com/watch?v={video_id}",
                thumbnail=snippet["thumbnails"]["high"]["url"],
                description=snippet["description"],
                published_at=snippet["publishedAt"],
                channel_title=snippet["channelTitle"]
            )
            results.append(video_data)

        return SearchResponse(
            results=results,
            total_results=len(results),
            query=search_query,
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al buscar videos: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 