import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

interface Track {
  id: string
  name: string
  duration_ms: number
  preview_url: string
  album: {
    images: Array<{ url: string }>
  }
  artists: Array<{ name: string }>
  youtube_id?: string
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
}

const STORAGE_KEY = 'spotify-player-state'

export const usePlayerStore = defineStore('player', () => {
  // Estado inicial desde localStorage
  const savedState = localStorage.getItem(STORAGE_KEY)
  const initialState: PlayerState = savedState ? JSON.parse(savedState) : {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.5,
    isMuted: false,
    queue: [],
    currentIndex: -1
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

  // Getters
  const hasNextTrack = computed(() => currentIndex.value < queue.value.length - 1)
  const hasPrevTrack = computed(() => currentIndex.value > 0)

  // Acciones
  const playTrack = (track: Track) => {
    currentTrack.value = track
    isPlaying.value = true
    currentTime.value = 0
    duration.value = track.duration_ms
    saveState()
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

  const nextTrack = () => {
    if (hasNextTrack.value) {
      currentIndex.value++
      playTrack(queue.value[currentIndex.value])
    }
  }

  const prevTrack = () => {
    if (hasPrevTrack.value) {
      currentIndex.value--
      playTrack(queue.value[currentIndex.value])
    }
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
      currentIndex: currentIndex.value
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

    // Getters
    hasNextTrack,
    hasPrevTrack,

    // Acciones
    playTrack,
    pause,
    resume,
    setCurrentTime,
    setVolume,
    setMuted,
    addToQueue,
    clearQueue,
    nextTrack,
    prevTrack
  }
})
