import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePlayerStore } from './playerStore'

// No redeclaramos los tipos globales para YT, asumimos que están definidos en otro lugar
// o que podemos usar 'window.YT' directamente sin tipado fuerte

// Tipos específicos para manejar la API del reproductor de YouTube
interface YouTubePlayerTarget {
  setVolume(volume: number): void
  pauseVideo(): void
  playVideo(): void
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getPlayerState(): number
}

interface YouTubePlayerEvent {
  target: YouTubePlayerTarget
  data?: number
}

// Tipo para métodos específicos del reproductor
interface YouTubePlayer {
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  setVolume(volume: number): void
  getPlayerState(): number
  loadVideoById(options: {
    videoId: string
    startSeconds?: number
    suggestedQuality?: string
  }): void
  addEventListener(event: string, listener: Function): void
  removeEventListener(event: string, listener: Function): void
  destroy(): void
}

// Interfaces para la API de Invidious
// Referencia: https://docs.invidious.io/api/ (GET /api/v1/search y GET /api/v1/videos/:id)

interface InvidiousVideoThumbnail {
  quality: string
  url: string
  width: number
  height: number
}

// Esta interfaz combina campos de resultados de búsqueda y detalles de video si es necesario.
// Por ahora, nos centraremos en los campos disponibles en la respuesta de búsqueda.
interface InvidiousVideo {
  type: 'video' // En la búsqueda, siempre es 'video' para los resultados que nos interesan
  title: string
  videoId: string // Este es el ID de YouTube
  author: string
  authorId: string
  authorUrl: string
  videoThumbnails: InvidiousVideoThumbnail[]
  description: string
  descriptionHtml: string
  viewCount: number
  published: number // Timestamp Unix
  publishedText: string
  lengthSeconds: number
  liveNow: boolean
  paid: boolean
  premium: boolean
  // Campos adicionales que podrían ser útiles de GET /api/v1/videos/:id si se llama directamente
  // Por ahora, la búsqueda es prioritaria.
  // url: string; // No directamente en la respuesta de búsqueda, se construye con videoId
  // channel_title: string; // 'author' en Invidious
}

interface InvidiousSearchResult {
  type: string
  title: string
  videoId: string
  author: string
  authorId: string
  authorUrl: string
  videoThumbnails: InvidiousVideoThumbnail[]
  description: string
  descriptionHtml: string
  viewCount: number
  published: number
  publishedText: string
  lengthSeconds: number
  liveNow: boolean
  paid: boolean
  premium: boolean
  [key: string]: any
}

// Lista de instancias públicas de Invidious
const INVIDIOUS_INSTANCES = [
  'https://vid.puffyan.us',
  'https://invidious.snopyta.org',
  'https://inv.vern.cc',
  'https://invidious.flokinet.to',
  'https://invidious.projectsegfau.lt',
  'https://yt.artemislena.eu',
  'https://invidious.privacydev.net',
  'https://iv.ggtyler.dev',
  'https://invidious.lunar.icu',
]

// Cache de instancias que han fallado
const failedInstances = new Set<string>()
let lastInstanceChange = Date.now()
const INSTANCE_RETRY_TIMEOUT = 5 * 60 * 1000 // 5 minutos

// Valor por defecto que será actualizado por checkInvidiousInstance
let INVIDIOUS_API_URL = INVIDIOUS_INSTANCES[0]
const INVIDIOUS_STORAGE_KEY = 'player-state'

// Crear el contenedor global del iframe si no existe (misma lógica que youtubeStore)
function ensureGlobalYouTubeIframe() {
  let div = document.getElementById('youtube-player') // Reutilizamos el mismo div para el player
  if (!div) {
    div = document.createElement('div')
    div.id = 'youtube-player'
    div.style.position = 'absolute'
    div.style.width = '1px'
    div.style.height = '1px'
    div.style.opacity = '0'
    div.style.pointerEvents = 'none'
    div.style.overflow = 'hidden'
    document.body.appendChild(div)
  } else {
    div.style.position = 'absolute'
    div.style.width = '1px'
    div.style.height = '1px'
    div.style.opacity = '0'
    div.style.pointerEvents = 'none'
    div.style.overflow = 'hidden'
  }
}

// Inyectar el script de la API solo si no existe (misma lógica que youtubeStore)
function ensureYouTubeScript() {
  if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
  }
}

// Función para verificar si una instancia de Invidious está activa
const checkInvidiousInstance = async (forceNew: boolean = false): Promise<string> => {
  // Si tenemos una instancia guardada y no forzamos nueva, intentar usarla primero
  const savedInstance = localStorage.getItem('invidious-instance')
  if (savedInstance && !forceNew && !failedInstances.has(savedInstance)) {
    try {
      console.log('Verificando instancia guardada de Invidious:', savedInstance)
      const response = await fetch(`${savedInstance}/api/v1/stats`, {
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        timeout: 3000,
      })
      if (response.ok) {
        console.log('Instancia guardada de Invidious OK:', savedInstance)
        return savedInstance
      }
      failedInstances.add(savedInstance)
      console.warn('Instancia guardada de Invidious no respondió OK:', response.status)
    } catch (error) {
      failedInstances.add(savedInstance)
      console.warn('Error al conectar con la instancia guardada de Invidious:', error)
    }
  }

  // Limpiar instancias fallidas después del timeout
  if (Date.now() - lastInstanceChange > INSTANCE_RETRY_TIMEOUT) {
    failedInstances.clear()
    lastInstanceChange = Date.now()
  }

  // Filtrar instancias que no han fallado
  const availableInstances = INVIDIOUS_INSTANCES.filter(
    (instance) => !failedInstances.has(instance),
  )

  // Si no hay instancias disponibles, limpiar el cache y empezar de nuevo
  if (availableInstances.length === 0) {
    failedInstances.clear()
    return checkInvidiousInstance(true)
  }

  // Intentar con las instancias disponibles en orden aleatorio
  const shuffledInstances = availableInstances.sort(() => Math.random() - 0.5)

  for (const instance of shuffledInstances) {
    try {
      console.log('Probando instancia:', instance)
      const response = await fetch(`${instance}/api/v1/stats`, {
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000),
      })

      if (response.ok) {
        console.log('Instancia disponible de Invidious encontrada:', instance)
        localStorage.setItem('invidious-instance', instance)
        return instance
      }
      failedInstances.add(instance)
    } catch (error) {
      failedInstances.add(instance)
      console.warn(`La instancia ${instance} no está disponible:`, error)
    }
  }

  // Si llegamos aquí, ninguna instancia funcionó
  console.warn('Ninguna instancia de Invidious está disponible, usando la primera por defecto.')
  const defaultInstance = INVIDIOUS_INSTANCES[0]
  localStorage.setItem('invidious-instance', defaultInstance)
  return defaultInstance
}

async function isEmbeddable(videoId: string): Promise<boolean> {
  let retries = 0
  const MAX_RETRIES = 3

  while (retries < MAX_RETRIES) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(`${INVIDIOUS_API_URL}/api/v1/videos/${videoId}`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.status === 500) {
        // Si es error 500, intentar con otra instancia
        INVIDIOUS_API_URL = await checkInvidiousInstance(true)
        retries++
        continue
      }

      if (!res.ok) return false

      const info = await res.json()
      return !!info.hlsUrl || !!info.dashUrl
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Timeout al verificar video, intentando otra instancia')
        INVIDIOUS_API_URL = await checkInvidiousInstance(true)
      } else {
        console.error('Error al verificar video:', error)
      }
      retries++
    }
  }
  return false
}

export const useInvidiousStore = defineStore('invidious', () => {
  const playerStore = usePlayerStore()
  const currentVideo = ref<InvidiousVideo | null>(null)
  const player = ref<YouTubePlayer | null>(null)
  const isReady = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentYouTubeId = ref<string | null>(null) // Sigue siendo el ID de YT
  let progressInterval: number | null = null

  const savedState = localStorage.getItem(INVIDIOUS_STORAGE_KEY)
  const initialState = savedState
    ? JSON.parse(savedState)
    : {
        currentTime: 0,
        volume: 0.5,
        youtube_id: null,
        api: 'invidious',
      }
  const persistedTime = ref(initialState.currentTime)
  const persistedVolume = ref(initialState.volume)
  const persistedYouTubeId = ref(initialState.youtube_id)

  const saveState = () => {
    localStorage.setItem(
      INVIDIOUS_STORAGE_KEY,
      JSON.stringify({
        currentTime: playerStore.currentTime,
        volume: playerStore.volume,
        youtube_id: currentYouTubeId.value,
        api: 'invidious',
        title: currentVideo.value?.title || null,
        author: currentVideo.value?.author || null,
      }),
    )
  }

  // Manejadores de eventos como funciones independientes (no métodos)
  function onReady(event: YouTubePlayerEvent) {
    isReady.value = true
    if (persistedVolume.value !== undefined && event.target) {
      event.target.setVolume(persistedVolume.value * 100)
      playerStore.setVolume(persistedVolume.value)
    }
    if (event.target) {
      event.target.pauseVideo()
    }
    playerStore.pause()
    saveState()
  }

  function onError(event: YouTubePlayerEvent) {
    error.value = `Error del reproductor Invidious (YT): ${event.data}`
    stopProgressTracking()
  }

  function onStateChange(event: YouTubePlayerEvent) {
    if (!window.YT || !window.YT.PlayerState) return

    switch (event.data) {
      case window.YT.PlayerState.ENDED:
        stopProgressTracking()
        playerStore.pause()
        saveState()
        break
      case window.YT.PlayerState.PLAYING:
        startProgressTracking()
        if (!playerStore.isPlaying) playerStore.resume()
        saveState()
        break
      case window.YT.PlayerState.PAUSED:
        playerStore.pause()
        stopProgressTracking()
        saveState()
        break
      case window.YT.PlayerState.CUED:
        if (player.value && persistedTime.value > 0) {
          const current = Math.floor((player.value.getCurrentTime() || 0) * 1000)
          if (Math.abs(current - persistedTime.value) > 1500) {
            player.value.seekTo(persistedTime.value / 1000, true)
            playerStore.setCurrentTime(persistedTime.value)
          }
          persistedTime.value = 0
        }
        break
      case window.YT.PlayerState.BUFFERING:
        break
    }
  }

  const initPlayer = async () => {
    if (typeof window !== 'undefined') {
      // Obtener una instancia de Invidious que funcione
      INVIDIOUS_API_URL = await checkInvidiousInstance()

      ensureGlobalYouTubeIframe()
      ensureYouTubeScript()
      window.onYouTubeIframeAPIReady = () => {
        if (!player.value && window.YT && window.YT.Player) {
          try {
            // Necesitamos usar any para la creación, porque YT.Player tiene una firma muy específica
            // que no podemos representar fácilmente con tipos TypeScript estándar
            const playerInstance = new window.YT.Player('youtube-player', {
              height: '0',
              width: '0',
              playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                enablejsapi: 1,
                modestbranding: 1,
                playsinline: 1,
                rel: 0,
              },
              events: {
                // Pasamos funciones sin this binding para los eventos
                onReady: () => onReady({ target: playerInstance }),
                onStateChange: (event: { data: number }) =>
                  onStateChange({ target: playerInstance, data: event.data }),
                onError: (event: { data: number }) =>
                  onError({ target: playerInstance, data: event.data }),
              },
            })

            // Asignamos la instancia a nuestra ref con el tipo YouTubePlayer
            player.value = playerInstance as unknown as YouTubePlayer
          } catch (err) {
            console.error('Error al inicializar el reproductor Invidious:', err)
          }
        }
      }
      if (window.YT && window.YT.Player && !player.value) {
        window.onYouTubeIframeAPIReady()
      }
    }
  }

  const startProgressTracking = () => {
    if (progressInterval) stopProgressTracking()
    progressInterval = window.setInterval(() => {
      if (player.value) {
        try {
          const currentTime = player.value.getCurrentTime() || 0
          const duration = player.value.getDuration() || 0
          playerStore.setCurrentTime(Math.floor(currentTime * 1000))
          playerStore.duration = Math.floor(duration * 1000)
          saveState()
        } catch (err) {
          console.error('Error al actualizar el progreso (Invidious):', err)
        }
      }
    }, 1000)
  }

  const stopProgressTracking = () => {
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
  }

  // Buscar video usando la API de Invidious DIRECTAMENTE sin pasar por el servidor local
  const searchVideoInvidious = async (
    query: string,
    maxResults: number = 2,
  ): Promise<InvidiousVideo[]> => {
    let retries = 0
    const MAX_RETRIES = 3

    while (retries < MAX_RETRIES) {
      try {
        isLoading.value = true
        error.value = null

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        console.log(
          `Buscando en Invidious: ${INVIDIOUS_API_URL}/api/v1/search?q=${encodeURIComponent(query)}`,
        )
        const response = await fetch(
          `${INVIDIOUS_API_URL}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort=relevance`,
          { signal: controller.signal },
        )

        clearTimeout(timeoutId)

        if (response.status === 500) {
          // Si es error 500, intentar con otra instancia
          INVIDIOUS_API_URL = await checkInvidiousInstance(true)
          retries++
          continue
        }

        if (!response.ok) {
          throw new Error(`Error HTTP Invidious: ${response.status}`)
        }

        const data = (await response.json()) as InvidiousSearchResult[]
        return processInvidiousResults(data, maxResults)
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') {
          console.warn('Timeout en búsqueda, intentando otra instancia')
          INVIDIOUS_API_URL = await checkInvidiousInstance(true)
        } else {
          const err = e instanceof Error ? e : new Error(String(e))
          console.error('Error al buscar en Invidious:', err)
        }

        if (retries === MAX_RETRIES - 1) {
          error.value = `Error al buscar en Invidious después de ${MAX_RETRIES} intentos`
          return []
        }

        retries++
      } finally {
        isLoading.value = false
      }
    }
    return []
  }

  // Función auxiliar para procesar los resultados de Invidious
  const processInvidiousResults = (
    data: InvidiousSearchResult[],
    maxResults: number,
  ): InvidiousVideo[] => {
    // Filtrar y mapear para asegurar que solo obtenemos videos válidos
    const videos = data
      .filter((item) => item && item.type === 'video' && item.videoId)
      .map(
        (item) =>
          ({
            type: 'video',
            title: item.title || '',
            videoId: item.videoId,
            author: item.author || '',
            authorId: item.authorId || '',
            authorUrl: item.authorUrl || '',
            videoThumbnails: item.videoThumbnails || [],
            description: item.description || '',
            descriptionHtml: item.descriptionHtml || '',
            viewCount: item.viewCount || 0,
            published: item.published || 0,
            publishedText: item.publishedText || '',
            lengthSeconds: item.lengthSeconds || 0,
            liveNow: item.liveNow || false,
            paid: item.paid || false,
            premium: item.premium || false,
          }) as InvidiousVideo,
      )
    return videos.slice(0, maxResults)
  }

  // Reproducir canción (adaptado de playSpotifyTrack)
  const playTrackQuery = async (
    trackInfo: { name: string; artists: Array<{ name: string }>; youtube_id?: string },
    options?: { autoplay?: boolean; startTimeMs?: number },
  ): Promise<boolean> => {
    let retryCount = 0
    const MAX_RETRIES = 3

    while (retryCount < MAX_RETRIES) {
      try {
        stopProgressTracking()
        const autoplay = options?.autoplay !== false

        // Intentar restaurar el estado si cambiamos de API
        const savedPlayerState = localStorage.getItem('player-state')
        if (savedPlayerState) {
          const state = JSON.parse(savedPlayerState)
          if (state.youtube_id && state.youtube_id === trackInfo.youtube_id) {
            console.log('Restaurando estado de reproducción desde otra API')
            currentYouTubeId.value = state.youtube_id
            if (state.currentTime) {
              persistedTime.value = state.currentTime
            }
            if (state.title) {
              currentVideo.value = {
                ...currentVideo.value,
                title: state.title,
                author: state.author,
                videoId: state.youtube_id,
              } as InvidiousVideo
            }
          }
        }

        // --- NUEVO: intentar cargar directamente si ya tenemos youtube_id guardado ---
        if (trackInfo.youtube_id) {
          console.log('Intentando cargar video directamente por ID:', trackInfo.youtube_id)
          // Si es el mismo ID que ya está en el reproductor pero no se reproduce, simplemente play/seek
          if (currentYouTubeId.value === trackInfo.youtube_id && player.value && isReady.value) {
            if (options?.startTimeMs && options.startTimeMs > 0) {
              player.value.seekTo(options.startTimeMs / 1000, true)
              playerStore.setCurrentTime(options.startTimeMs)
            }
            if (autoplay) player.value.playVideo()
            else player.value.pauseVideo()
            return true
          }

          if (player.value && isReady.value) {
            currentYouTubeId.value = trackInfo.youtube_id
            persistedYouTubeId.value = trackInfo.youtube_id

            if (!(await isEmbeddable(trackInfo.youtube_id))) {
              console.warn('ID bloqueado para embeds, probamos siguiente resultado')
              trackInfo.youtube_id = undefined // forzamos nueva búsqueda
            }

            player.value.loadVideoById({
              videoId: trackInfo.youtube_id,
              startSeconds: options?.startTimeMs ? options.startTimeMs / 1000 : 0,
              suggestedQuality: 'auto',
            })

            // esperar a estado listo
            const directStatus = await new Promise<boolean>((resolve) => {
              const timeout = setTimeout(() => resolve(false), 3000)
              const listener = (e: { data: number }) => {
                if (!window.YT) return
                if (
                  e.data === window.YT.PlayerState.PLAYING ||
                  e.data === window.YT.PlayerState.PAUSED
                ) {
                  clearTimeout(timeout)
                  player.value?.removeEventListener('onStateChange', listener)
                  resolve(true)
                }
              }
              player.value?.addEventListener('onStateChange', listener)
            })
            if (directStatus) {
              if (!autoplay) playerStore.pause()
              saveState()
              return true
            }
            console.warn('Fallo al cargar directamente, procederemos a búsqueda')
          }
        }
        // -------------------------------------------------------

        // Si no tenemos el video cargado o es uno nuevo, lo buscamos
        console.log(
          'Buscando video en Invidious:',
          trackInfo.name,
          trackInfo.artists.map((a) => a.name).join(', '),
        )
        const query = `${trackInfo.name} ${trackInfo.artists.map((a) => a.name).join(' ')} official audio`

        // Asegurarse de que tenemos una instancia válida antes de buscar
        if (!INVIDIOUS_API_URL) {
          INVIDIOUS_API_URL = await checkInvidiousInstance()
        }

        const videos = await searchVideoInvidious(query, 2)

        if (!videos || videos.length === 0) {
          console.warn('No se encontraron videos en Invidious para:', query)
          error.value = 'No se encontraron videos en Invidious.'
          return false
        }

        // Procesamos el primer video encontrado
        for (const video of videos) {
          if (!(await isEmbeddable(video.videoId))) continue // probar el siguiente
          if (video && player.value && isReady.value && window.YT && window.YT.PlayerState) {
            console.log('Reproduciendo video de Invidious:', video.title, video.videoId)
            const playerInstance = player.value
            trackInfo.youtube_id = video.videoId
            currentYouTubeId.value = video.videoId
            currentVideo.value = video

            let startSeconds = 0
            if (options?.startTimeMs && options.startTimeMs > 0) {
              startSeconds = options.startTimeMs / 1000
            } else if (persistedTime.value > 0 && persistedYouTubeId.value === video.videoId) {
              startSeconds = persistedTime.value / 1000
              persistedTime.value = 0
            }

            persistedYouTubeId.value = video.videoId

            if (!(await isEmbeddable(video.videoId))) {
              console.warn('ID bloqueado para embeds, probamos siguiente resultado')
              trackInfo.youtube_id = undefined // forzamos nueva búsqueda
            }

            playerInstance.loadVideoById({
              videoId: video.videoId,
              startSeconds,
              suggestedQuality: 'auto',
            })

            // Función auxiliar para comprobar el estado
            function getStatus(): Promise<boolean> {
              return new Promise((resolve) => {
                const timeoutDuration = autoplay ? 3500 : 2000

                // Manejador de eventos que se procesará cuando cambie el estado del reproductor
                function stateChangeHandler(e: { data: number }) {
                  if (!window.YT || !window.YT.PlayerState) {
                    resolve(false)
                    return
                  }

                  const state = e.data
                  if (autoplay && state === window.YT.PlayerState.PLAYING) {
                    cleanup()
                    resolve(true)
                  } else if (
                    !autoplay &&
                    (state === window.YT.PlayerState.PAUSED || state === window.YT.PlayerState.CUED)
                  ) {
                    cleanup()
                    resolve(true)
                  } else if (
                    state === window.YT.PlayerState.UNSTARTED ||
                    state === window.YT.PlayerState.ENDED
                  ) {
                    cleanup()
                    resolve(false)
                  }
                }

                // Timeout que resolverá la promesa si no hay cambio de estado después de un tiempo
                const timeoutId = window.setTimeout(() => {
                  cleanup()

                  // Comprobar el estado actual como último recurso
                  if (playerInstance && typeof playerInstance.getPlayerState === 'function') {
                    const currentState = playerInstance.getPlayerState()
                    if (autoplay && currentState === window.YT?.PlayerState.PLAYING) {
                      resolve(true)
                    } else if (
                      !autoplay &&
                      (currentState === window.YT?.PlayerState.PAUSED ||
                        currentState === window.YT?.PlayerState.CUED)
                    ) {
                      resolve(true)
                    } else {
                      resolve(false)
                    }
                  } else {
                    resolve(false)
                  }
                }, timeoutDuration)

                // Función de limpieza para eliminar el evento y el timeout
                function cleanup() {
                  clearTimeout(timeoutId)
                  if (playerInstance && typeof playerInstance.removeEventListener === 'function') {
                    playerInstance.removeEventListener('onStateChange', stateChangeHandler)
                  }
                }

                // Añadir el manejador de eventos
                if (playerInstance && typeof playerInstance.addEventListener === 'function') {
                  playerInstance.addEventListener('onStateChange', stateChangeHandler)
                } else {
                  cleanup()
                  resolve(false)
                }
              })
            }

            const result = await getStatus()
            if (result) {
              if (!autoplay) {
                playerStore.pause()
                if (options?.startTimeMs) playerStore.setCurrentTime(options.startTimeMs)
                else playerStore.setCurrentTime(startSeconds * 1000)
              }
              saveState()
              return true
            }
          }
        }
        error.value = 'No se pudo reproducir ningún video válido de Invidious.'
        return false
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e))
        console.warn(`Intento ${retryCount + 1} fallido:`, err)

        if (retryCount === MAX_RETRIES - 1) {
          error.value = `Error al reproducir la canción (Invidious): ${err.message}`
          console.error('Error al reproducir (Invidious):', err)
          return false
        }

        // Esperar antes de reintentar
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)))
        retryCount++

        // Intentar cambiar de instancia de Invidious
        INVIDIOUS_API_URL = await checkInvidiousInstance()
        continue
      }
    }
    return false
  }

  const play = () => {
    if (
      player.value &&
      isReady.value &&
      window.YT &&
      player.value.getPlayerState() !== window.YT.PlayerState.PLAYING
    ) {
      player.value.playVideo()
    }
  }

  const pause = () => {
    if (
      player.value &&
      isReady.value &&
      window.YT &&
      player.value.getPlayerState() !== window.YT.PlayerState.PAUSED
    ) {
      player.value.pauseVideo()
    }
  }

  const stop = () => {
    if (player.value && isReady.value) {
      player.value.stopVideo()
      stopProgressTracking()
      currentYouTubeId.value = null
      currentVideo.value = null
      playerStore.setCurrentTime(0)
      playerStore.duration = 0
      saveState()
    }
  }

  const seekTo = (seconds: number) => {
    if (player.value && isReady.value) {
      player.value.seekTo(seconds, true)
      playerStore.setCurrentTime(seconds * 1000)
      saveState()
    }
  }

  const setVolume = (volume: number) => {
    if (player.value && isReady.value) {
      player.value.setVolume(volume * 100)
      saveState()
    }
  }

  const cleanup = () => {
    stopProgressTracking()
    if (player.value) {
      player.value.destroy()
      player.value = null
    }
    isReady.value = false
  }

  // Restaurar estado al inicializar
  if (persistedTime.value > 0) {
    playerStore.setCurrentTime(persistedTime.value)
  }
  if (persistedVolume.value !== undefined) {
    playerStore.setVolume(persistedVolume.value)
  }
  // Si teníamos almacenado el youtube_id, inyectarlo en el currentTrack para facilitar la reanudación
  if (persistedYouTubeId.value && playerStore.currentTrack) {
    ;(playerStore.currentTrack as any).youtube_id = persistedYouTubeId.value
    currentYouTubeId.value = persistedYouTubeId.value
  }

  playerStore.pause() // Forzar el estado a pausa inicialmente en playerStore
  saveState() // Guardar el estado inicial

  // Reactividad de volumen (desde playerStore hacia el reproductor de YT)
  watch(
    () => playerStore.volume,
    (newVolume) => {
      if (player.value && isReady.value) {
        player.value.setVolume(newVolume * 100)
        saveState()
      }
    },
  )

  localStorage.setItem(
    'player-state',
    JSON.stringify({
      api: 'invidious',
      youtube_id: currentYouTubeId.value,
      currentTime: playerStore.currentTime,
      volume: playerStore.volume,
    }),
  )

  // Al final del store, justo antes del return
  watch(
    () => playerStore.currentTrack,
    (newTrack) => {
      if (newTrack && newTrack.youtube_id) {
        currentYouTubeId.value = newTrack.youtube_id
        saveState()
      }
    },
  )

  return {
    currentVideo,
    isReady,
    isLoading,
    error,
    initPlayer,
    playTrackQuery,
    searchVideoInvidious,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    cleanup,
    currentYouTubeId,
  }
})
