import { ref, watch } from 'vue'

// Estado de UI del shell (no es capa de datos). Singleton a nivel de módulo
// para que cualquier componente abra/cierre cola, paleta o reproductor expandido
// sin prop-drilling.

const STORAGE_KEY = 'ritup:sidebar-expanded'

const readBool = (key: string, fallback: boolean) => {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v === 'true'
  } catch {
    return fallback
  }
}

const queueOpen = ref(false)
const paletteOpen = ref(false)
const nowPlayingExpanded = ref(false)
const sidebarExpanded = ref(readBool(STORAGE_KEY, false))

// Modal de creación de playlist. `pendingTrack` permite que el flujo
// "Nueva playlist" del menú de una canción cree la lista y añada esa pista.
const createPlaylistOpen = ref(false)
const pendingTrack = ref<any>(null)

watch(sidebarExpanded, (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(v))
  } catch {
    /* ignore */
  }
})

export function useShell() {
  return {
    queueOpen,
    paletteOpen,
    nowPlayingExpanded,
    sidebarExpanded,
    createPlaylistOpen,
    pendingTrack,
    openQueue: () => (queueOpen.value = true),
    openPalette: () => (paletteOpen.value = true),
    expandPlayer: () => (nowPlayingExpanded.value = true),
    toggleSidebar: () => (sidebarExpanded.value = !sidebarExpanded.value),
    openCreatePlaylist: (track: any = null) => {
      pendingTrack.value = track
      createPlaylistOpen.value = true
    },
  }
}
