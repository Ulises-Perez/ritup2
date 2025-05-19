import { defineStore } from 'pinia'
import { useConfigStore } from './configStore'
import { useYouTubeStore } from './youtubeStore'
import { useInvidiousStore } from './invidiousStore'
import { computed } from 'vue'

export const useApiStore = defineStore('api', () => {
  const configStore = useConfigStore()
  const youtubeStore = useYouTubeStore()
  const invidiousStore = useInvidiousStore()

  // Método para obtener el store correcto basado en la configuración
  const currentStore = computed(() => {
    return configStore.useInvidious ? invidiousStore : youtubeStore
  })

  // Inicializar el reproductor activo
  const initActivePlayer = () => {
    if (configStore.useInvidious) {
      // Limpiar YouTube antes de inicializar Invidious
      youtubeStore.cleanup()
      invidiousStore.initPlayer()
    } else {
      // Limpiar Invidious antes de inicializar YouTube
      invidiousStore.cleanup()
      youtubeStore.initPlayer()
    }
  }

  // No podemos usar directamente searchVideo porque no está expuesto en youtubeStore
  const searchVideo = async (query: string, maxResults = 2) => {
    // Para búsquedas, usamos Invidious directamente ya que expone searchVideoInvidious
    if (configStore.useInvidious) {
      return invidiousStore.searchVideoInvidious(query, maxResults)
    } else {
      // Para YouTube, hacer la búsqueda interna a través de playSpotifyTrack
      // Esto es un poco ineficiente pero es la forma más compatible
      const dummyTrack = {
        name: query,
        artists: [{ name: '' }],
        youtube_id: undefined,
      }
      // Inicia la carga del video pero lo pausa inmediatamente
      const success = await youtubeStore.playSpotifyTrack(dummyTrack, { autoplay: false })
      // Retorna un array con el video actual si se cargó correctamente
      if (success && youtubeStore.currentVideo) {
        return [youtubeStore.currentVideo]
      }
      return []
    }
  }

  // Reproducir canción - compatibilidad con ambos métodos
  const playTrack = async (
    trackInfo: { name: string; artists: Array<{ name: string }>; youtube_id?: string },
    options?: { autoplay?: boolean; startTimeMs?: number },
  ) => {
    if (configStore.useInvidious) {
      return invidiousStore.playTrackQuery(trackInfo, options)
    } else {
      return youtubeStore.playSpotifyTrack(trackInfo, options)
    }
  }

  const play = () => currentStore.value.play()
  const pause = () => currentStore.value.pause()
  const stop = () => currentStore.value.stop()
  const seekTo = (seconds: number) => currentStore.value.seekTo(seconds)
  const setVolume = (volume: number) => currentStore.value.setVolume(volume)
  const cleanup = () => {
    youtubeStore.cleanup()
    invidiousStore.cleanup()
  }

  return {
    currentStore,
    initActivePlayer,
    searchVideo,
    playTrack,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    cleanup,
  }
})
