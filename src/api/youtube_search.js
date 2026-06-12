import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { execFile } from 'node:child_process'
import 'dotenv/config'

const app = express()
const port = 8000

app.use(cors())

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

if (!YOUTUBE_API_KEY) {
  console.warn('YOUTUBE_API_KEY no está configurada en las variables de entorno')
}

// Comando para invocar yt-dlp. Por defecto usamos el módulo de Python instalado
// con `pip install yt-dlp`. Se puede sobreescribir el intérprete con la variable
// de entorno YTDLP_PYTHON (p. ej. una ruta absoluta a python.exe).
const PYTHON = process.env.YTDLP_PYTHON || 'python'
// Separador poco común para parsear la salida de --print sin ambigüedad.
const SEP = '@@@'

// Extrae con yt-dlp la mejor pista de SOLO AUDIO de un video de YouTube y
// devuelve { id, duration, url }. `target` puede ser un ID de video o una
// búsqueda tipo "ytsearch1:artista cancion". Esto esquiva el bloqueo de
// incrustación (error 150) porque reproducimos el stream directo, no el embed.
function extractAudio(target) {
  return new Promise((resolve, reject) => {
    execFile(
      PYTHON,
      [
        '-m',
        'yt_dlp',
        '-f',
        'bestaudio[ext=m4a]/bestaudio/best',
        '--no-playlist',
        '--no-warnings',
        '--print',
        `%(id)s${SEP}%(duration)s${SEP}%(url)s`,
        target,
      ],
      { timeout: 45000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error((stderr || err.message || '').trim() || 'yt-dlp falló'))
        }
        // Tomamos la última línea no vacía por si yt-dlp imprime avisos antes.
        const line = stdout.trim().split('\n').filter(Boolean).pop() || ''
        const [id, duration, url] = line.split(SEP)
        if (!url) return reject(new Error('yt-dlp no devolvió una URL de audio'))
        resolve({ id, duration: Number(duration) || null, url })
      },
    )
  })
}

// Caché en memoria de extracciones { clave -> { info, expiresAt } }. Las URLs de
// googlevideo caducan (parámetro expire=), así que respetamos esa caducidad.
const audioCache = new Map()
// Peticiones en vuelo { clave -> Promise<info> } para no extraer dos veces lo
// mismo cuando el prefetch y el play coinciden.
const audioInflight = new Map()

function cacheGet(key) {
  const hit = audioCache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.info
  if (hit) audioCache.delete(key)
  return null
}

function cacheSet(key, info) {
  let ttl = 5 * 60 * 60 * 1000 // 5 h por defecto
  try {
    const exp = new URL(info.url).searchParams.get('expire')
    if (exp) {
      // Caducar 5 min antes que la URL real, con un mínimo de 1 min.
      ttl = Math.max(60 * 1000, Number(exp) * 1000 - Date.now() - 5 * 60 * 1000)
    }
  } catch {
    /* URL sin expire: usamos el TTL por defecto */
  }
  audioCache.set(key, { info, expiresAt: Date.now() + ttl })
}

// Resuelve la info de audio usando caché + dedupe de peticiones en vuelo.
function resolveAudio(cacheKey, target) {
  const cached = cacheGet(cacheKey)
  if (cached) return Promise.resolve(cached)

  const existing = audioInflight.get(cacheKey)
  if (existing) return existing

  const promise = extractAudio(target)
    .then((info) => {
      cacheSet(cacheKey, info)
      // Cachear también por el ID resuelto para aciertos futuros por id.
      if (info.id) cacheSet(`id:${info.id}`, info)
      return info
    })
    .finally(() => audioInflight.delete(cacheKey))

  audioInflight.set(cacheKey, promise)
  return promise
}

// Devuelve la URL directa del stream de audio para reproducir con <audio>.
// Acepta ?query=<texto> (búsqueda) o ?id=<videoId> (video concreto).
app.get('/audio', async (req, res) => {
  const query = (req.query.query || '').toString().trim()
  const id = (req.query.id || '').toString().trim()
  if (!query && !id) {
    return res.status(400).json({ detail: 'Falta el parámetro query o id' })
  }
  try {
    const cacheKey = id ? `id:${id}` : `q:${query.toLowerCase()}`
    const target = id || `ytsearch1:${query}`
    const info = await resolveAudio(cacheKey, target)
    res.json(info)
  } catch (error) {
    console.error('Error en /audio:', error.message)
    res.status(500).json({ detail: `Error al extraer el audio: ${error.message}` })
  }
})

app.get('/search', async (req, res) => {
  try {
    const query = req.query.query
    const max_results = parseInt(req.query.max_results) || 3

    if (!query || query.length < 2) {
      return res.status(400).json({ detail: 'La consulta debe tener al menos 2 caracteres' })
    }

    const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'id,snippet',
        q: query,
        maxResults: max_results,
        type: 'video',
        // Solo videos que SE PUEDEN incrustar y reproducir fuera de youtube.com.
        // Sin esto, la búsqueda devuelve videos de música oficial cuyo dueño
        // deshabilitó la incrustación (error 150), y el reproductor IFrame
        // no puede reproducirlos.
        videoEmbeddable: 'true',
        videoSyndicated: 'true',
        key: YOUTUBE_API_KEY,
      },
    })

    const results = (data.items || []).map((item) => {
      const video_id = item.id.videoId
      const snippet = item.snippet

      return {
        id: video_id,
        title: snippet.title,
        url: `https://www.youtube.com/watch?v=${video_id}`,
        thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
        description: snippet.description,
        published_at: snippet.publishedAt,
        channel_title: snippet.channelTitle,
      }
    })

    res.json({
      results,
      total_results: results.length,
      query: query,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error al buscar videos:', error.response?.data || error.message)
    res.status(500).json({ detail: `Error al buscar videos: ${error.message}` })
  }
})

// Proxy de Deezer para producción (el proxy de Vite solo existe en dev).
// api.deezer.com no envía cabeceras CORS, así que reenviamos aquí y `cors()`
// (montado arriba) añade el Access-Control-Allow-Origin. Mantenemos el prefijo
// `/deezer` igual que el rewrite de Vite y reenviamos el status/body tal cual
// (Deezer responde HTTP 200 con {error:{...}} en errores de cuota, etc.).
app.use('/deezer', async (req, res) => {
  try {
    // req.url ya viene sin el prefijo /deezer e incluye la query string.
    const { data, status } = await axios.get(`https://api.deezer.com${req.url}`, {
      validateStatus: () => true,
    })
    res.status(status).json(data)
  } catch (error) {
    console.error('Error en el proxy de Deezer:', error.message)
    res.status(502).json({ error: { code: 'proxy', message: error.message } })
  }
})

app.listen(port, () => {
  console.log(`YouTube Search API (Node.js) listening at http://localhost:${port}`)
})
