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

type RepeatMode = 'off' | 'all' | 'one'

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
  shuffle: boolean
  repeat: RepeatMode
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
        shuffle: false,
        repeat: 'off',
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
  const shuffle = ref<boolean>(initialState.shuffle ?? false)
  const repeat = ref<RepeatMode>(initialState.repeat ?? 'off')
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
        nextTrack(true)
      }
    }

    // Configurar el evento de finalización para YouTube
    if (youtubePlayer.value) {
      youtubePlayer.value.addEventListener('onStateChange', (event: YouTubeEvent) => {
        if (event.data === 0) {
          // 0 significa que el video terminó
          nextTrack(true)
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
      // Delegar en el reproductor activo (audio/Invidious) vía apiStore.
      // Import dinámico para evitar la dependencia circular con apiStore.
      if (currentTrack.value?.youtube_id) {
        import('./apiStore').then(({ useApiStore }) => {
          useApiStore().seekTo(time / 1000)
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

  // isAuto = la llamada viene del fin natural de la pista (no del botón "siguiente").
  const nextTrack = async (isAuto = false) => {
    // Repetir una: en el auto-avance, repetir la misma pista.
    if (isAuto && repeat.value === 'one' && currentTrack.value) {
      await playTrack(currentTrack.value)
      return
    }

    // Aleatorio: saltar a una pista al azar de la cola (distinta de la actual).
    if (shuffle.value && queue.value.length > 1) {
      let nextIndex = currentIndex.value
      while (nextIndex === currentIndex.value) {
        nextIndex = Math.floor(Math.random() * queue.value.length)
      }
      currentIndex.value = nextIndex
      await playTrack(queue.value[nextIndex])
      return
    }

    if (hasNextTrack.value) {
      currentIndex.value++
      await playTrack(queue.value[currentIndex.value])
    } else if (repeat.value === 'all' && queue.value.length > 0) {
      // Repetir toda la cola: volver al principio.
      currentIndex.value = 0
      await playTrack(queue.value[0])
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

  // Calcula cuál sería la siguiente pista (misma lógica que nextTrack) SIN
  // reproducirla. Lo usa el crossfade para precargarla. index = -1 si la pista
  // no está en la cola (caso de "similares"). Devuelve null si no hay siguiente.
  const peekNext = (isAuto = true): { track: Track; index: number } | null => {
    if (isAuto && repeat.value === 'one' && currentTrack.value) {
      return { track: currentTrack.value, index: currentIndex.value }
    }
    if (shuffle.value && queue.value.length > 1) {
      let nextIndex = currentIndex.value
      while (nextIndex === currentIndex.value) {
        nextIndex = Math.floor(Math.random() * queue.value.length)
      }
      return { track: queue.value[nextIndex], index: nextIndex }
    }
    if (hasNextTrack.value) {
      return { track: queue.value[currentIndex.value + 1], index: currentIndex.value + 1 }
    }
    if (repeat.value === 'all' && queue.value.length > 0) {
      return { track: queue.value[0], index: 0 }
    }
    if (autoplay.value && similarTracks.value.length > 0) {
      const t = similarTracks.value[Math.floor(Math.random() * similarTracks.value.length)]
      return { track: t, index: -1 }
    }
    return null
  }

  // Avanza el estado a una pista que YA está sonando (la cargó el crossfade en
  // el otro elemento de audio). NO vuelve a cargar/reproducir: solo actualiza el
  // estado para que la UI lo refleje.
  const commitAdvance = (peek: { track: Track; index: number }) => {
    currentTrack.value = peek.track
    if (peek.index >= 0) currentIndex.value = peek.index
    isPlaying.value = true
    saveState()
  }

  const prevTrack = async () => {
    // Como Spotify: si llevamos más de 3s, el botón "anterior" reinicia la pista.
    if (currentTime.value > 3000 && currentTrack.value) {
      seekTo(0)
      return
    }
    if (hasPrevTrack.value) {
      currentIndex.value--
      await playTrack(queue.value[currentIndex.value])
    } else if (currentTrack.value) {
      seekTo(0)
    }
  }

  // --- Aleatorio / Repetir ---------------------------------------------------
  const toggleShuffle = () => {
    shuffle.value = !shuffle.value
    saveState()
  }

  const cycleRepeat = () => {
    repeat.value = repeat.value === 'off' ? 'all' : repeat.value === 'all' ? 'one' : 'off'
    saveState()
  }

  // --- Gestión de la cola ----------------------------------------------------
  const playQueueIndex = async (index: number) => {
    if (index < 0 || index >= queue.value.length) return
    currentIndex.value = index
    await playTrack(queue.value[index])
  }

  const removeFromQueue = (index: number) => {
    if (index < 0 || index >= queue.value.length) return
    queue.value.splice(index, 1)
    if (index < currentIndex.value) {
      currentIndex.value--
    } else if (index === currentIndex.value) {
      // Se quitó la pista actual: ajustamos el índice sin forzar cambio de pista.
      currentIndex.value = Math.min(currentIndex.value, queue.value.length - 1)
    }
    saveState()
  }

  const moveInQueue = (from: number, to: number) => {
    if (
      from < 0 ||
      from >= queue.value.length ||
      to < 0 ||
      to >= queue.value.length ||
      from === to
    )
      return
    const [item] = queue.value.splice(from, 1)
    queue.value.splice(to, 0, item)
    // Mantener currentIndex apuntando a la pista que se está reproduciendo.
    if (from === currentIndex.value) {
      currentIndex.value = to
    } else {
      if (from < currentIndex.value) currentIndex.value--
      if (to <= currentIndex.value) currentIndex.value++
    }
    saveState()
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
      shuffle: shuffle.value,
      repeat: repeat.value,
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
    shuffle,
    repeat,
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
    peekNext,
    commitAdvance,
    prevTrack,
    setPlaybackContext,
    setSimilarTracks,
    setAutoplay,
    playFromContext,
    toggleShuffle,
    cycleRepeat,
    playQueueIndex,
    removeFromQueue,
    moveInQueue,
  }
})
