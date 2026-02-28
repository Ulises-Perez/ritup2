import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

interface Track {
  id: string
  name: string
  duration_ms: number
  preview_url: string
  album: {
    images: Array<{ url: string }>
    name?: string
  }
  artists: Array<{ name: string }>
  youtube_id?: string
}

interface PlaybackContext {
  type: 'playlist' | 'album' | 'search' | 'similar'
  id?: string
  name?: string
  tracks: Track[]
}

interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  queue: Track[]
  currentIndex: number
  playbackContext: PlaybackContext | null
  similarTracks: Track[]
  autoplay: boolean
}

interface YouTubeEvent {
  data: number
}

interface YouTubePlayer {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  addEventListener: (event: string, callback: (event: YouTubeEvent) => void) => void
}

const STORAGE_KEY = 'spotify-player-state'

export const usePlayerStore = defineStore('player', () => {
  // Estado inicial desde localStorage
  const savedState = localStorage.getItem(STORAGE_KEY)
  const initialState: PlayerState = savedState
    ? JSON.parse(savedState)
    : {
        currentTrack: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 0.5,
        isMuted: false,
        queue: [],
        currentIndex: -1,
        playbackContext: null,
        similarTracks: [],
        autoplay: true,
      }

  // Estado
  const currentTrack = ref<Track | null>(initialState.currentTrack)
  const isPlaying = ref(initialState.isPlaying)
  const currentTime = ref(initialState.currentTime)
  const duration = ref(initialState.duration)
  const volume = ref(initialState.volume)
  const isMuted = ref(initialState.isMuted)
  const queue = ref<Track[]>(initialState.queue)
  const currentIndex = ref(initialState.currentIndex)
  const playbackContext = ref<PlaybackContext | null>(initialState.playbackContext)
  const similarTracks = ref<Track[]>(initialState.similarTracks)
  const autoplay = ref(initialState.autoplay)
  const audioElement = ref<HTMLAudioElement | null>(null)
  const youtubePlayer = ref<YouTubePlayer | null>(null)

  // Getters
  const hasNextTrack = computed(() => currentIndex.value < queue.value.length - 1)
  const hasPrevTrack = computed(() => currentIndex.value > 0)

  // Acciones
  const playTrack = async (track: Track) => {
    currentTrack.value = track
    isPlaying.value = true
    currentTime.value = 0
    duration.value = track.duration_ms
    saveState()

    // Configurar el evento de finalización para audio normal
    if (audioElement.value) {
      audioElement.value.onended = () => {
        nextTrack()
      }
    }

    // Configurar el evento de finalización para YouTube
    if (youtubePlayer.value) {
      youtubePlayer.value.addEventListener('onStateChange', (event: YouTubeEvent) => {
        if (event.data === 0) {
          // 0 significa que el video terminó
          nextTrack()
        }
      })
    }

    // Reproducir la canción en el reproductor correspondiente
    try {
      const { useApiStore } = await import('./apiStore')
      const apiStore = useApiStore()
      await apiStore.playTrack(track, { autoplay: true })
    } catch (error) {
      console.error('Error al reproducir la canción:', error)
    }
  }

  const pause = () => {
    isPlaying.value = false
    saveState()
  }

  const resume = () => {
    isPlaying.value = true
    saveState()
  }

  const setCurrentTime = (time: number) => {
    currentTime.value = time
    saveState()
  }

  const seekTo = (time: number) => {
    try {
      // Si es un video de YouTube, usar el youtubeStore
      if (currentTrack.value?.youtube_id) {
        // Importar y usar el youtubeStore dinámicamente
        import('./youtubeStore').then(({ useYouTubeStore }) => {
          const youtubeStore = useYouTubeStore()
          youtubeStore.seekTo(time / 1000)
        })
        // Actualizar el tiempo inmediatamente en el store
        setCurrentTime(time)
        return
      }

      // Si es un audio normal
      if (audioElement.value) {
        audioElement.value.currentTime = time / 1000
        setCurrentTime(time)
      }
    } catch (error) {
      console.error('Error al buscar posición:', error)
    }
  }

  const setVolume = (newVolume: number) => {
    volume.value = Math.max(0, Math.min(1, newVolume))
    saveState()
  }

  const setMuted = (muted: boolean) => {
    isMuted.value = muted
    saveState()
  }

  const addToQueue = (track: Track) => {
    queue.value.push(track)
    saveState()
  }

  const clearQueue = () => {
    queue.value = []
    currentIndex.value = -1
    saveState()
  }

  const nextTrack = async () => {
    if (hasNextTrack.value) {
      currentIndex.value++
      await playTrack(queue.value[currentIndex.value])
    } else if (autoplay.value && similarTracks.value.length > 0) {
      // Si está activado el autoplay y hay canciones similares, reproducir una similar
      const randomSimilar =
        similarTracks.value[Math.floor(Math.random() * similarTracks.value.length)]
      await playTrack(randomSimilar)
    } else {
      // Si no hay más canciones y no hay autoplay, detener la reproducción
      isPlaying.value = false
      currentTime.value = 0
      saveState()
    }
  }

  const prevTrack = async () => {
    if (hasPrevTrack.value) {
      currentIndex.value--
      await playTrack(queue.value[currentIndex.value])
    }
  }

  const setPlaybackContext = (context: PlaybackContext) => {
    playbackContext.value = context
    queue.value = context.tracks
    currentIndex.value = 0
    saveState()
  }

  const setSimilarTracks = (tracks: Track[]) => {
    similarTracks.value = tracks
    saveState()
  }

  const setAutoplay = (enabled: boolean) => {
    autoplay.value = enabled
    saveState()
  }

  const playFromContext = async (track: Track, context: PlaybackContext) => {
    setPlaybackContext(context)
    const trackIndex = context.tracks.findIndex((t) => t.id === track.id)
    if (trackIndex !== -1) {
      currentIndex.value = trackIndex
    }
    await playTrack(track)
  }

  // Función para guardar el estado
  const saveState = () => {
    const state: PlayerState = {
      currentTrack: currentTrack.value,
      isPlaying: isPlaying.value,
      currentTime: currentTime.value,
      duration: duration.value,
      volume: volume.value,
      isMuted: isMuted.value,
      queue: queue.value,
      currentIndex: currentIndex.value,
      playbackContext: playbackContext.value,
      similarTracks: similarTracks.value,
      autoplay: autoplay.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  // Guardar estado cada vez que cambie el tiempo actual
  watch(currentTime, () => {
    saveState()
  })

  return {
    // Estado
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    queue,
    currentIndex,
    playbackContext,
    similarTracks,
    autoplay,
    audioElement,
    youtubePlayer,

    // Getters
    hasNextTrack,
    hasPrevTrack,

    // Acciones
    playTrack,
    pause,
    resume,
    setCurrentTime,
    seekTo,
    setVolume,
    setMuted,
    addToQueue,
    clearQueue,
    nextTrack,
    prevTrack,
    setPlaybackContext,
    setSimilarTracks,
    setAutoplay,
    playFromContext,
  }
})
