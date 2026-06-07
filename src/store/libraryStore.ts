import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Biblioteca local: playlists que el usuario crea dentro de la app.
// No usa ninguna cuenta externa (ni Spotify ni Deezer OAuth); todo se persiste
// en localStorage. Las playlists se exponen ya con la forma que leen las vistas
// (images[], owner.display_name, tracks.total) para reutilizar Library.vue,
// PlaylistView.vue y TrackList.vue sin cambios de plantilla.

// Usamos `any` para los tracks: son los objetos ya normalizados por deezerStore
// (id, name, duration_ms, artists[], album{images[]}, preview_url).
type Track = any

interface LocalPlaylist {
  id: string
  name: string
  tracks: Track[]
  // Id de la playlist de Deezer de la que se importó (si aplica). Sirve para
  // no importar dos veces la misma.
  sourceId?: string
}

const STORAGE_KEY = 'ritup-library'
const PLACEHOLDER_COVER = '/placeholder-playlist.jpg'

function loadInitial(): LocalPlaylist[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Error al cargar la biblioteca local:', error)
    return []
  }
}

// Carátula de una playlist: la del primer track que tenga imagen, o un placeholder.
function coverImages(playlist: LocalPlaylist) {
  const url =
    playlist.tracks.find((t) => t?.album?.images?.[0]?.url)?.album?.images?.[0]?.url ||
    PLACEHOLDER_COVER
  return [{ url }]
}

// Forma "tipo Spotify" de una playlist local, lista para las vistas.
function toViewPlaylist(playlist: LocalPlaylist) {
  return {
    id: playlist.id,
    name: playlist.name,
    images: coverImages(playlist),
    owner: { id: 'local', display_name: 'Tú' },
    tracks: { total: playlist.tracks.length },
  }
}

export const useLibraryStore = defineStore('library', () => {
  const playlistsRaw = ref<LocalPlaylist[]>(loadInitial())

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlistsRaw.value))
  }

  // Lista para la barra lateral / vistas (forma normalizada).
  const playlists = computed(() => playlistsRaw.value.map(toViewPlaylist))

  const generateId = () =>
    `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

  const createPlaylist = (name: string): string => {
    const clean = (name || '').trim() || 'Nueva playlist'
    const id = generateId()
    playlistsRaw.value.push({ id, name: clean, tracks: [] })
    save()
    return id
  }

  // Importa una playlist completa (p. ej. una de Deezer) como playlist local,
  // copiando todos sus tracks ya normalizados. La carátula se deriva sola del
  // primer track (ver coverImages).
  const importPlaylist = (name: string, tracks: Track[], sourceId?: string): string => {
    const clean = (name || '').trim() || 'Playlist importada'
    const id = generateId()
    playlistsRaw.value.push({ id, name: clean, tracks: [...(tracks ?? [])], sourceId })
    save()
    return id
  }

  // ¿Ya se importó una playlist de Deezer con este id de origen?
  const hasImported = (sourceId: string) =>
    !!sourceId && playlistsRaw.value.some((p) => String(p.sourceId) === String(sourceId))

  const renamePlaylist = (id: string, name: string) => {
    const playlist = playlistsRaw.value.find((p) => p.id === id)
    if (playlist) {
      playlist.name = (name || '').trim() || playlist.name
      save()
    }
  }

  const deletePlaylist = (id: string) => {
    playlistsRaw.value = playlistsRaw.value.filter((p) => p.id !== id)
    save()
  }

  const hasTrack = (id: string, trackId: string) => {
    const playlist = playlistsRaw.value.find((p) => p.id === id)
    return !!playlist?.tracks.some((t) => String(t?.id) === String(trackId))
  }

  const addTrack = (id: string, track: Track) => {
    const playlist = playlistsRaw.value.find((p) => p.id === id)
    if (!playlist || !track) return
    if (playlist.tracks.some((t) => String(t?.id) === String(track.id))) return // dedupe
    playlist.tracks.push(track)
    save()
  }

  const removeTrack = (id: string, trackId: string) => {
    const playlist = playlistsRaw.value.find((p) => p.id === id)
    if (!playlist) return
    playlist.tracks = playlist.tracks.filter((t) => String(t?.id) !== String(trackId))
    save()
  }

  // Forma "tipo Spotify" para PlaylistView (cabecera).
  const getPlaylist = (id: string) => {
    const playlist = playlistsRaw.value.find((p) => p.id === id)
    return playlist ? toViewPlaylist(playlist) : null
  }

  // Forma {items:[{track}]} para PlaylistView/TrackList.
  const getPlaylistTracks = (id: string) => {
    const playlist = playlistsRaw.value.find((p) => p.id === id)
    return { items: (playlist?.tracks ?? []).map((track) => ({ track })) }
  }

  return {
    playlists,
    createPlaylist,
    importPlaylist,
    hasImported,
    renamePlaylist,
    deletePlaylist,
    hasTrack,
    addTrack,
    removeTrack,
    getPlaylist,
    getPlaylistTracks,
  }
})
