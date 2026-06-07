import { computed } from 'vue'
import { usePlayerStore } from '@/store/playerStore'
import { useApiStore } from '@/store/apiStore'

// Lógica de control del reproductor compartida por MiniPlayer y NowPlaying.
// NO incluye la inicialización del backend (YouTube/Invidious): de eso es dueño
// EXCLUSIVO MiniPlayer (un solo montaje) para no doble-inicializar el iframe.

export function usePlayerControls() {
  const playerStore = usePlayerStore()
  const apiStore = useApiStore()

  const currentTrack = computed(() => playerStore.currentTrack)
  const isPlaying = computed(() => playerStore.isPlaying)
  const currentTime = computed(() => playerStore.currentTime)
  const duration = computed(() => playerStore.duration)
  const volume = computed(() => playerStore.volume)
  const isMuted = computed(() => playerStore.isMuted)
  const autoplay = computed(() => playerStore.autoplay)
  const shuffle = computed(() => playerStore.shuffle)
  const repeat = computed(() => playerStore.repeat)
  const queue = computed(() => playerStore.queue)
  const currentIndex = computed(() => playerStore.currentIndex)

  const artistNames = computed(() =>
    currentTrack.value ? currentTrack.value.artists.map((a) => a.name).join(', ') : '',
  )

  const albumLink = computed(() => {
    const id = (currentTrack.value?.album as { id?: string } | undefined)?.id
    return id ? `/album/${id}` : ''
  })

  const progressPercentage = computed(() => {
    if (!duration.value) return 0
    return (currentTime.value / duration.value) * 100
  })

  const repeatTitle = computed(() =>
    repeat.value === 'one'
      ? 'Repetir: una canción'
      : repeat.value === 'all'
        ? 'Repetir: toda la cola'
        : 'Repetir',
  )

  const formatTime = (ms: number) => {
    if (!ms || ms < 0) ms = 0
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const togglePlay = async () => {
    if (isPlaying.value) {
      apiStore.pause()
      playerStore.pause()
      return
    }
    if (!currentTrack.value) return
    playerStore.resume()
    const trackYouTubeId = currentTrack.value.youtube_id
    try {
      if (apiStore.currentStore.currentYouTubeId === trackYouTubeId && apiStore.currentStore.isReady) {
        apiStore.play()
      } else {
        await apiStore.playTrack(currentTrack.value, {
          autoplay: true,
          startTimeMs: playerStore.currentTime,
        })
      }
    } catch (error) {
      console.error('Error al reproducir:', error)
      await apiStore.playTrack(currentTrack.value, { autoplay: true, startTimeMs: 0 })
    }
  }

  const prevTrack = async () => {
    await playerStore.prevTrack()
  }

  const nextTrack = async () => {
    await playerStore.nextTrack()
  }

  const toggleMute = () => {
    const next = !isMuted.value
    playerStore.setMuted(next)
    apiStore.setVolume(next ? 0 : volume.value)
  }

  const toggleAutoplay = () => playerStore.setAutoplay(!autoplay.value)
  const toggleShuffle = () => playerStore.toggleShuffle()
  const cycleRepeat = () => playerStore.cycleRepeat()

  const seekToMs = (ms: number) => {
    playerStore.seekTo(ms)
  }

  const seekToPercent = (pct: number) => {
    seekToMs((Math.max(0, Math.min(100, pct)) / 100) * duration.value)
  }

  const setVolumePct = (pct: number) => {
    const v = Math.max(0, Math.min(1, pct / 100))
    if (isMuted.value && v > 0) playerStore.setMuted(false)
    playerStore.setVolume(v)
    apiStore.setVolume(v)
  }

  const seekBy = (deltaMs: number) => {
    if (!currentTrack.value || !duration.value) return
    seekToMs(Math.max(0, Math.min(duration.value, currentTime.value + deltaMs)))
  }

  const changeVolume = (delta: number) => {
    // Partimos del volumen EFECTIVO (lo que ve el usuario: 0 si está muteado),
    // no del subyacente, para que +/- avancen un escalón desde lo mostrado y no
    // den un salto al pulsar estando muteado.
    const base = isMuted.value ? 0 : volume.value
    const v = Math.max(0, Math.min(1, base + delta))
    if (isMuted.value && v > 0) playerStore.setMuted(false)
    playerStore.setVolume(v)
    apiStore.setVolume(v)
  }

  return {
    // state
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    autoplay,
    shuffle,
    repeat,
    queue,
    currentIndex,
    artistNames,
    albumLink,
    progressPercentage,
    repeatTitle,
    // actions
    formatTime,
    togglePlay,
    prevTrack,
    nextTrack,
    toggleMute,
    toggleAutoplay,
    toggleShuffle,
    cycleRepeat,
    seekToMs,
    seekToPercent,
    setVolumePct,
    seekBy,
    changeVolume,
  }
}
