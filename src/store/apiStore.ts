import { defineStore } from 'pinia'
import { useConfigStore } from './configStore'
import { useAudioStore } from './audioStore'
import { useInvidiousStore } from './invidiousStore'
import { computed } from 'vue'

export const useApiStore = defineStore('api', () => {
  const configStore = useConfigStore()
  const audioStore = useAudioStore()
  const invidiousStore = useInvidiousStore()

  // Método para obtener el store correcto basado en la configuración
  const currentStore = computed(() => {
    return configStore.useInvidious ? invidiousStore : audioStore
  })

  // Inicializar el reproductor activo
  const initActivePlayer = () => {
    if (configStore.useInvidious) {
      // Limpiar el reproductor de audio antes de inicializar Invidious
      audioStore.cleanup()
      invidiousStore.initPlayer()
    } else {
      // Limpiar Invidious antes de inicializar el reproductor de audio
      invidiousStore.cleanup()
      audioStore.initPlayer()
    }
  }

  const searchVideo = async (query: string, maxResults = 2) => {
    // Para búsquedas, usamos Invidious directamente ya que expone searchVideoInvidious
    if (configStore.useInvidious) {
      return invidiousStore.searchVideoInvidious(query, maxResults)
    } else {
      // Para el reproductor de audio, precargamos el stream sin reproducirlo.
      const dummyTrack = {
        name: query,
        artists: [{ name: '' }],
        youtube_id: undefined,
      }
      const success = await audioStore.playSpotifyTrack(dummyTrack, { autoplay: false })
      if (success && audioStore.currentVideo) {
        return [audioStore.currentVideo]
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
      return audioStore.playSpotifyTrack(trackInfo, options)
    }
  }

  const play = () => currentStore.value.play()
  const pause = () => currentStore.value.pause()
  const stop = () => currentStore.value.stop()
  const seekTo = (seconds: number) => currentStore.value.seekTo(seconds)
  const setVolume = (volume: number) => currentStore.value.setVolume(volume)
  const cleanup = () => {
    audioStore.cleanup()
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
