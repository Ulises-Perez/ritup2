import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePlayerStore } from './playerStore'

interface YouTubeVideo {
  id: string
  title: string
  url: string
  thumbnail: string
  description: string
  published_at: string
  channel_title: string
}

interface YouTubeSearchResponse {
  results: YouTubeVideo[]
  total_results: number
  query: string
  timestamp: string
}

const STORAGE_KEY = 'youtube-player-state'

// Crear el contenedor global del iframe si no existe
function ensureGlobalYouTubeIframe() {
  let div = document.getElementById('youtube-player')
  if (!div) {
    div = document.createElement('div')
    div.id = 'youtube-player'
    // Hacerlo invisible
    div.style.position = 'absolute'
    div.style.width = '1px'
    div.style.height = '1px'
    div.style.opacity = '0'
    div.style.pointerEvents = 'none'
    div.style.overflow = 'hidden'
    document.body.appendChild(div)
  } else {
    // Si ya existe, asegúrate de que sea invisible
    div.style.position = 'absolute'
    div.style.width = '1px'
    div.style.height = '1px'
    div.style.opacity = '0'
    div.style.pointerEvents = 'none'
    div.style.overflow = 'hidden'
  }
}

// Inyectar el script de la API solo si no existe
function ensureYouTubeScript() {
  if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
  }
}

export const useYouTubeStore = defineStore('youtube', () => {
  const playerStore = usePlayerStore()
  const currentVideo = ref<YouTubeVideo | null>(null)
  const player = ref<any>(null)
  const isReady = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentYouTubeId = ref<string | null>(null)
  let progressInterval: number | null = null

  // Estado persistente
  const savedState = localStorage.getItem(STORAGE_KEY)
  const initialState = savedState
    ? JSON.parse(savedState)
    : {
        currentTime: 0,
        volume: 0.5,
        youtube_id: null,
      }
  const persistedTime = ref(initialState.currentTime)
  const persistedVolume = ref(initialState.volume)
  const persistedYouTubeId = ref(initialState.youtube_id)

  // URL de la API de FastAPI
  const API_URL = 'http://localhost:8000'

  // Guardar estado en localStorage
  const saveState = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentTime: playerStore.currentTime,
        volume: playerStore.volume,
        youtube_id: currentYouTubeId.value,
      }),
    )
  }

  // Inicializar el reproductor de YouTube (global, nunca destruir salvo cleanup global)
  const initPlayer = () => {
    if (typeof window !== 'undefined') {
      ensureGlobalYouTubeIframe()
      ensureYouTubeScript()
      window.onYouTubeIframeAPIReady = () => {
        if (!player.value) {
          player.value = new window.YT.Player('youtube-player', {
            height: '0',
            width: '0',
            playerVars: {
              autoplay: 0, // Siempre iniciar en pausa
              controls: 0,
              disablekb: 1,
              enablejsapi: 1,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
            },
            events: {
              onReady: () => {
                isReady.value = true
                // Restaurar volumen solo aquí
                if (persistedVolume.value !== undefined) {
                  player.value.setVolume(persistedVolume.value * 100)
                  playerStore.setVolume(persistedVolume.value)
                }
                // Siempre pausar al iniciar
                player.value.pauseVideo()
                playerStore.pause()
                saveState()
              },
              onStateChange: onPlayerStateChange,
              onError: (event: any) => {
                error.value = `Error del reproductor: ${event.data}`
                stopProgressTracking()
              },
            },
          })
        }
      }
      // Si la API ya está cargada, inicializar inmediatamente
      if (window.YT && window.YT.Player && !player.value) {
        window.onYouTubeIframeAPIReady()
      }
    }
  }

  // Actualizar el progreso de reproducción
  const startProgressTracking = () => {
    if (progressInterval) {
      stopProgressTracking()
    }

    progressInterval = window.setInterval(() => {
      if (player.value && player.value.getCurrentTime && player.value.getDuration) {
        try {
          const currentTime = player.value.getCurrentTime() || 0
          const duration = player.value.getDuration() || 0
          playerStore.setCurrentTime(Math.floor(currentTime * 1000))
          playerStore.duration = Math.floor(duration * 1000)
          saveState()
        } catch (err) {
          console.error('Error al actualizar el progreso:', err)
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

  // Manejar cambios de estado del reproductor
  const onPlayerStateChange = (event: any) => {
    switch (event.data) {
      case window.YT.PlayerState.ENDED:
        stopProgressTracking()
        playerStore.pause()
        saveState()
        // Reproducir automáticamente la siguiente canción
        playerStore.nextTrack().catch((error) => {
          console.error('Error al reproducir la siguiente canción:', error)
        })
        break
      case window.YT.PlayerState.PLAYING:
        startProgressTracking()
        // Solo aquí actualizamos el estado de reproducción
        if (!playerStore.isPlaying) playerStore.resume()
        saveState()
        break
      case window.YT.PlayerState.PAUSED:
        playerStore.pause()
        stopProgressTracking()
        saveState()
        break
      case window.YT.PlayerState.CUED:
        // Si el video está en CUED y el tiempo no es correcto, ajustar solo si es necesario
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

  // Buscar video usando la API de FastAPI
  const searchVideo = async (query: string) => {
    try {
      isLoading.value = true
      error.value = null
      const response = await fetch(
        `${API_URL}/search?query=${encodeURIComponent(query)}&max_results=1`,
      )
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`)
      const data: YouTubeSearchResponse = await response.json()
      if (data.results && data.results.length > 0) return data.results
      return []
    } catch (err) {
      error.value = 'Error al buscar el video'
      console.error('Error al buscar en YouTube:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Reproducir canción de Spotify usando YouTube
  const playSpotifyTrack = async (
    track: { name: string; artists: Array<{ name: string }>; youtube_id?: string },
    options?: { autoplay?: boolean; startTimeMs?: number },
  ) => {
    try {
      stopProgressTracking()
      // Si el video ya está cargado, solo hacer play/seek si es necesario
      if (
        track.youtube_id &&
        currentYouTubeId.value === track.youtube_id &&
        player.value &&
        isReady.value
      ) {
        if (options?.startTimeMs && options.startTimeMs > 0) {
          player.value.seekTo(options.startTimeMs / 1000, true)
          playerStore.setCurrentTime(options.startTimeMs)
        }
        if (options?.autoplay) player.value.playVideo()
        return true
      }
      // Buscar videos y probar el primero, si falla probar el segundo
      const query = `${track.artists.map((a) => a.name).join(' ')} ${track.name} audio`
      const videos = await searchVideo(query)
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i]
        if (video && player.value && isReady.value) {
          track.youtube_id = video.id
          currentYouTubeId.value = video.id
          currentVideo.value = video
          let startSeconds = 0
          if (options && options.startTimeMs && options.startTimeMs > 0) {
            startSeconds = options.startTimeMs / 1000
          } else if (persistedTime.value > 0) {
            startSeconds = persistedTime.value / 1000
            persistedTime.value = 0
          }
          // Intentar cargar el video
          player.value.loadVideoById({
            videoId: video.id,
            startSeconds,
            suggestedQuality: 'auto',
          })
          // Esperar un poco y verificar si el video se reproduce
          const playPromise = new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => resolve(false), 2500)
            const onStateChange = (event: any) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                clearTimeout(timeout)
                player.value.removeEventListener('onStateChange', onStateChange)
                resolve(true)
              } else if (
                event.data === window.YT.PlayerState.UNSTARTED ||
                event.data === window.YT.PlayerState.ENDED
              ) {
                // Si no puede reproducirse
                clearTimeout(timeout)
                player.value.removeEventListener('onStateChange', onStateChange)
                resolve(false)
              }
            }
            player.value.addEventListener('onStateChange', onStateChange)
          })
          const played = await playPromise
          if (played) return true
        }
      }
      error.value = 'No se pudo reproducir ningún video válido.'
      return false
    } catch (err) {
      error.value = 'Error al reproducir la canción'
      console.error('Error al reproducir:', err)
      return false
    }
  }

  const play = () => {
    if (player.value && isReady.value) {
      player.value.playVideo()
    }
  }

  const pause = () => {
    if (player.value && isReady.value) {
      player.value.pauseVideo()
      stopProgressTracking()
    }
  }

  const stop = () => {
    if (player.value && isReady.value) {
      player.value.stopVideo()
      stopProgressTracking()
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
    // No eliminar el iframe ni el script aquí para mantener el control global
  }

  // Restaurar estado al inicializar
  if (persistedYouTubeId.value && playerStore.currentTrack) {
    playerStore.currentTrack.youtube_id = persistedYouTubeId.value
  }
  if (persistedTime.value > 0) {
    playerStore.setCurrentTime(persistedTime.value)
  }
  if (persistedVolume.value !== undefined) {
    playerStore.setVolume(persistedVolume.value)
  }

  // Al inicializar, forzar el estado a pausa
  playerStore.pause()
  saveState()

  // Reactividad de volumen
  watch(
    () => playerStore.volume,
    (newVolume) => {
      if (player.value && isReady.value) {
        player.value.setVolume(newVolume * 100)
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
    playSpotifyTrack,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    cleanup,
    currentYouTubeId,
  }
})
