import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePlayerStore } from './playerStore'

// Reproductor basado en el stream de audio real extraído por yt-dlp en el
// backend (endpoint /audio). Reproduce CUALQUIER canción (incluida la música de
// sellos que bloquea la incrustación, error 150) usando <audio> HTML5.
//
// Usa DOS elementos <audio> que se alternan para hacer crossfade entre la
// canción actual y la siguiente (la siguiente ya viene precargada por el
// prefetch + caché del backend, así que la transición es suave e inmediata).
//
// Expone la MISMA interfaz que el antiguo youtubeStore para no tocar apiStore
// ni los componentes del reproductor.

interface AudioInfo {
  id: string
  url: string
  duration: number | null
}

interface PlayableTrack {
  name: string
  artists: Array<{ name: string }>
  youtube_id?: string
}

interface PlayOptions {
  autoplay?: boolean
  startTimeMs?: number
}

const STORAGE_KEY = 'audio-player-state'
const API_URL = 'http://localhost:8000'
const DEFAULT_CROSSFADE_SEC = 5

export const useAudioStore = defineStore('audio', () => {
  const playerStore = usePlayerStore()
  type Peek = NonNullable<ReturnType<typeof playerStore.peekNext>>

  // Dos elementos de audio (closure, no necesitan reactividad) que se alternan.
  let els: HTMLAudioElement[] = []
  let activeIdx = 0
  const active = () => els[activeIdx]
  const idle = () => els[1 - activeIdx]

  const currentVideo = ref<{ id: string; url: string } | null>(null)
  const currentYouTubeId = ref<string | null>(null)
  const isReady = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Guardas para evitar extracciones duplicadas y bucles de reintento.
  let inflightKey: string | null = null
  let inflightPromise: Promise<boolean> | null = null
  let retriedFor: string | null = null

  // Estado del crossfade.
  let crossfading = false
  let crossfadeTimer: number | null = null
  let pendingPeek: Peek | null = null

  // Estado persistente (posición, volumen y duración de crossfade).
  const savedState = localStorage.getItem(STORAGE_KEY)
  const initialState = savedState
    ? JSON.parse(savedState)
    : { currentTime: 0, volume: 0.5, youtube_id: null, crossfadeSec: DEFAULT_CROSSFADE_SEC }
  const persistedTime = ref<number>(initialState.currentTime ?? 0)
  // Id de la canción a la que pertenece persistedTime: la posición guardada solo
  // se restaura si vuelve a sonar ESA misma canción (no una distinta).
  const persistedYouTubeId = ref<string | null>(initialState.youtube_id ?? null)
  const persistedVolume = ref<number>(initialState.volume ?? 0.5)
  const crossfadeSec = ref<number>(initialState.crossfadeSec ?? DEFAULT_CROSSFADE_SEC)

  const saveState = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentTime: playerStore.currentTime,
        volume: playerStore.volume,
        youtube_id: currentYouTubeId.value,
        crossfadeSec: crossfadeSec.value,
      }),
    )
  }

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
  const effectiveVolume = () => (playerStore.isMuted ? 0 : clamp01(playerStore.volume))
  const trackQuery = (track: PlayableTrack) =>
    `${track.artists.map((a) => a.name).join(' ')} ${track.name}`.trim()
  const sameAsCurrent = (t: { id?: string }) =>
    !!t.id && !!playerStore.currentTrack && t.id === playerStore.currentTrack.id

  // Pide al backend la URL del stream (no toca el reproductor).
  const fetchInfo = async (track: PlayableTrack): Promise<AudioInfo | null> => {
    const params = track.youtube_id
      ? `id=${encodeURIComponent(track.youtube_id)}`
      : `query=${encodeURIComponent(trackQuery(track))}`
    const res = await fetch(`${API_URL}/audio?${params}`)
    if (!res.ok) return null
    const info = (await res.json()) as AudioInfo
    return info?.url ? info : null
  }

  // --- Prefetch -------------------------------------------------------------
  // Calienta la caché del backend extrayendo por adelantado el audio de la
  // siguiente pista, para que el crossfade/avance sea instantáneo.
  const prefetched = new Set<string>()
  const prefetch = (track?: PlayableTrack) => {
    if (!track) return
    const key = track.youtube_id || trackQuery(track)
    if (!key || prefetched.has(key)) return
    prefetched.add(key)
    const params = track.youtube_id
      ? `id=${encodeURIComponent(track.youtube_id)}`
      : `query=${encodeURIComponent(trackQuery(track))}`
    fetch(`${API_URL}/audio?${params}`).catch(() => prefetched.delete(key))
  }
  const prefetchUpcoming = () => {
    const peek = playerStore.peekNext(true)
    if (peek?.track) prefetch(peek.track)
  }

  // --- Crossfade ------------------------------------------------------------
  const rampCrossfade = (from: HTMLAudioElement, to: HTMLAudioElement) => {
    const userVol = effectiveVolume()
    const remaining = Number.isFinite(from.duration)
      ? Math.max(0.3, from.duration - from.currentTime)
      : crossfadeSec.value
    const dur = Math.min(crossfadeSec.value, remaining)
    const stepMs = 50
    const steps = Math.max(1, Math.round((dur * 1000) / stepMs))
    let i = 0
    if (crossfadeTimer) clearInterval(crossfadeTimer)
    crossfadeTimer = window.setInterval(() => {
      i++
      const p = Math.min(1, i / steps)
      try { from.volume = clamp01(userVol * (1 - p)) } catch { /* ignorar */ }
      try { to.volume = clamp01(userVol * p) } catch { /* ignorar */ }
      if (p >= 1) finalizeCrossfade()
    }, stepMs)
  }

  const finalizeCrossfade = () => {
    if (!crossfading) return
    if (crossfadeTimer) { clearInterval(crossfadeTimer); crossfadeTimer = null }
    const peek = pendingPeek
    const from = active()
    const to = idle()
    // Detener y limpiar el elemento saliente para reutilizarlo luego.
    try { from.pause(); from.removeAttribute('src'); from.load() } catch { /* ignorar */ }
    from.volume = effectiveVolume()
    // Intercambiar el elemento activo.
    activeIdx = 1 - activeIdx
    to.volume = effectiveVolume()
    crossfading = false
    pendingPeek = null
    if (peek) {
      currentYouTubeId.value = peek.track.youtube_id ?? null
      if (peek.track.youtube_id) {
        currentVideo.value = { id: peek.track.youtube_id, url: to.currentSrc || to.src }
      }
      retriedFor = null
      // Actualiza el estado SIN recargar (la pista ya suena en `to`).
      playerStore.commitAdvance(peek)
      prefetchUpcoming()
    }
  }

  // Lanza el crossfade hacia la siguiente pista (la carga en el elemento ocioso).
  const startCrossfade = async (peek: Peek) => {
    if (crossfading) return
    crossfading = true
    pendingPeek = peek
    const from = active()
    const to = idle()
    try {
      const info = await fetchInfo(peek.track)
      if (!info) throw new Error('sin audio para el crossfade')
      peek.track.youtube_id = info.id
      to.src = info.url
      to.load()
      to.volume = 0
      await to.play().catch(() => {})
      rampCrossfade(from, to)
    } catch (e) {
      console.error('Crossfade falló, se hará avance normal:', e)
      crossfading = false
      pendingPeek = null
      try { to.removeAttribute('src'); to.load() } catch { /* ignorar */ }
    }
  }

  const cancelCrossfade = () => {
    if (!crossfading) return
    if (crossfadeTimer) { clearInterval(crossfadeTimer); crossfadeTimer = null }
    const other = idle()
    try { other.pause(); other.removeAttribute('src'); other.load() } catch { /* ignorar */ }
    other.volume = effectiveVolume()
    crossfading = false
    pendingPeek = null
    active().volume = effectiveVolume()
  }

  // Re-extrae el stream actual (las URLs de googlevideo caducan a las ~6 h).
  const retryCurrent = async () => {
    const video = currentVideo.value
    const el = active()
    if (!video || retriedFor === video.id) return
    retriedFor = video.id
    const wasPlaying = !el.paused
    const at = el.currentTime
    try {
      const res = await fetch(`${API_URL}/audio?id=${encodeURIComponent(video.id)}`)
      if (!res.ok) return
      const info = (await res.json()) as AudioInfo
      if (!info.url) return
      currentVideo.value = { id: info.id, url: info.url }
      el.src = info.url
      el.load()
      el.addEventListener('loadedmetadata', () => {
        try { el.currentTime = at } catch { /* ignorar */ }
      }, { once: true })
      if (wasPlaying) el.play().catch(() => {})
    } catch (e) {
      console.error('Re-extracción de audio falló:', e)
    }
  }

  const makeEl = (): HTMLAudioElement => {
    const el = new Audio()
    el.preload = 'auto'

    el.addEventListener('timeupdate', () => {
      if (el !== active()) return
      playerStore.setCurrentTime(Math.floor((el.currentTime || 0) * 1000))
      saveState()
      // Disparo del crossfade cuando faltan crossfadeSec para el final.
      const dur = el.duration
      if (crossfadeSec.value > 0 && !crossfading && Number.isFinite(dur) && dur > 0) {
        const remaining = dur - el.currentTime
        if (remaining <= crossfadeSec.value && remaining > 0.25) {
          const peek = playerStore.peekNext(true)
          if (peek?.track && !sameAsCurrent(peek.track)) startCrossfade(peek)
        }
      }
    })
    el.addEventListener('loadedmetadata', () => {
      if (el !== active()) return
      if (Number.isFinite(el.duration)) playerStore.duration = Math.floor(el.duration * 1000)
    })
    el.addEventListener('ended', () => {
      if (el !== active()) return
      if (crossfading) { finalizeCrossfade(); return }
      playerStore.pause()
      saveState()
      playerStore.nextTrack(true).catch((e) => console.error('Auto-avance falló:', e))
    })
    el.addEventListener('error', () => {
      if (el !== active()) return
      if (currentVideo.value && retriedFor !== currentVideo.value.id) retryCurrent()
      else error.value = 'Error al reproducir el audio'
    })
    return el
  }

  const initPlayer = () => {
    if (typeof window === 'undefined') return
    if (els.length) {
      isReady.value = true
      return
    }
    els = [makeEl(), makeEl()]
    activeIdx = 0
    const v = clamp01(persistedVolume.value ?? 0.5)
    els[0].volume = v
    els[1].volume = v
    isReady.value = true
    if (persistedVolume.value !== undefined) playerStore.setVolume(persistedVolume.value)
    playerStore.pause()
    saveState()
  }

  // Carga (y opcionalmente reproduce) la pista en el elemento ACTIVO.
  const loadAndPlay = async (track: PlayableTrack, options?: PlayOptions): Promise<boolean> => {
    const el = active()
    if (!el) return false
    isLoading.value = true
    error.value = null
    try {
      const info = await fetchInfo(track)
      if (!info) throw new Error('respuesta sin URL de audio')

      track.youtube_id = info.id
      currentYouTubeId.value = info.id
      currentVideo.value = { id: info.id, url: info.url }
      retriedFor = null

      let startSeconds = 0
      if (options?.startTimeMs && options.startTimeMs > 0) {
        startSeconds = options.startTimeMs / 1000
      } else if (
        persistedTime.value > 0 &&
        persistedYouTubeId.value &&
        info.id === persistedYouTubeId.value
      ) {
        // Solo restauramos la posición guardada si es LA MISMA canción que sonaba
        // al recargar; una canción distinta debe empezar desde 0.
        startSeconds = persistedTime.value / 1000
      }
      // Consumir el estado restaurado: solo aplica al primer load tras recargar.
      persistedTime.value = 0
      persistedYouTubeId.value = null

      el.src = info.url
      el.load()
      el.volume = effectiveVolume()
      const applyStart = () => {
        if (startSeconds > 0) {
          try { el.currentTime = startSeconds } catch { /* ignorar */ }
        }
      }
      if (el.readyState >= 1) applyStart()
      else el.addEventListener('loadedmetadata', applyStart, { once: true })

      if (info.duration) playerStore.duration = Math.floor(info.duration * 1000)

      if (options?.autoplay !== false) {
        await el.play().catch((e) => console.error('play() rechazado por el navegador:', e))
      }
      saveState()
      return true
    } catch (e) {
      error.value = 'No se pudo reproducir la canción'
      console.error('Error al reproducir audio:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const playSpotifyTrack = async (track: PlayableTrack, options?: PlayOptions): Promise<boolean> => {
    // Cualquier reproducción explícita cancela un crossfade en curso.
    cancelCrossfade()
    const el = active()
    // Si esta pista ya está cargada en el elemento activo, solo seek/play.
    if (track.youtube_id && currentYouTubeId.value === track.youtube_id && el && el.src) {
      if (options?.startTimeMs && options.startTimeMs > 0) {
        try { el.currentTime = options.startTimeMs / 1000 } catch { /* ignorar */ }
        playerStore.setCurrentTime(options.startTimeMs)
      }
      el.volume = effectiveVolume()
      if (options?.autoplay !== false) await el.play().catch(() => {})
      prefetchUpcoming()
      return true
    }

    // Deduplicar llamadas concurrentes para la misma pista (playTrack + watch).
    const key = track.youtube_id || trackQuery(track)
    if (inflightKey === key && inflightPromise) return inflightPromise
    inflightKey = key
    inflightPromise = loadAndPlay(track, options)
    try {
      const ok = await inflightPromise
      if (ok) prefetchUpcoming()
      return ok
    } finally {
      if (inflightKey === key) {
        inflightKey = null
        inflightPromise = null
      }
    }
  }

  const play = () => {
    active()?.play()?.catch((e) => console.error('play() rechazado:', e))
  }

  const pause = () => {
    cancelCrossfade()
    active()?.pause()
  }

  const stop = () => {
    cancelCrossfade()
    const el = active()
    if (el) {
      el.pause()
      try { el.currentTime = 0 } catch { /* ignorar */ }
    }
  }

  const seekTo = (seconds: number) => {
    const el = active()
    if (!el) return
    try { el.currentTime = seconds } catch { /* ignorar */ }
    playerStore.setCurrentTime(seconds * 1000)
    saveState()
  }

  const setVolume = (volume: number) => {
    if (!crossfading) {
      const el = active()
      if (el) el.volume = clamp01(volume)
    }
    saveState()
  }

  const setCrossfade = (sec: number) => {
    crossfadeSec.value = Math.max(0, Math.min(12, sec))
    saveState()
  }

  const cleanup = () => {
    cancelCrossfade()
    els.forEach((el) => el.pause())
    saveState()
    // Mantenemos los elementos para reutilizarlos si el componente se remonta.
  }

  // Mantener el volumen del elemento activo sincronizado con el store.
  watch(
    () => playerStore.volume,
    () => {
      if (!crossfading) {
        const el = active()
        if (el) el.volume = effectiveVolume()
      }
      saveState()
    },
  )

  return {
    currentVideo,
    currentYouTubeId,
    isReady,
    isLoading,
    error,
    crossfadeSec,
    initPlayer,
    playSpotifyTrack,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    setCrossfade,
    cleanup,
  }
})
