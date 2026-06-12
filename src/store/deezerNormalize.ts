// Capa de normalización Deezer -> forma de datos que la UI ya consume (estilo Spotify).
//
// Diferencias clave que resolvemos aquí (verificadas contra la doc de Deezer):
//  - Deezer expone `artist` único + `contributors[]`, no un `artists[]` como Spotify.
//  - `duration` viene en SEGUNDOS (Spotify usa `duration_ms`).
//  - Las imágenes son campos planos `cover_*` / `picture_*`, no un `images[]`.
//  - Las listas vienen envueltas en `{ data, total, next }`, no en `{ items }`.
//  - Los ids son numéricos (los pasamos a String: router-links, :key y el dedupe
//    por `track.id` del playerStore asumen strings).
//
// Todas las funciones GARANTIZAN arrays no nulos (`artists` nunca vacío,
// `images` siempre array) porque varias vistas hacen `artists[0]` / `images[0]`
// sin optional chaining (Player.vue, AlbumView, PlaylistView, ArtistView).

const PLACEHOLDER_ARTIST = { id: '', name: '' }

// Devuelve la primera URL no vacía de la lista.
function pickUrl(...urls: Array<string | undefined | null>): string {
  for (const url of urls) {
    if (url) return url
  }
  return ''
}

// --- Tipos crudos de Deezer (campos que usamos) ------------------------------

export interface DeezerArtistRaw {
  id: number | string
  name: string
  picture?: string
  picture_small?: string
  picture_medium?: string
  picture_big?: string
  picture_xl?: string
  nb_fan?: number
}

export interface DeezerAlbumRaw {
  id: number | string
  title: string
  cover?: string
  cover_small?: string
  cover_medium?: string
  cover_big?: string
  cover_xl?: string
  release_date?: string
  nb_tracks?: number
  // 'album' | 'single' | 'ep' | 'compilation' (Deezer lo incluye en /artist/{id}/albums).
  record_type?: string
  artist?: DeezerArtistRaw
  contributors?: DeezerArtistRaw[]
}

export interface DeezerTrackRaw {
  id: number | string
  title: string
  duration?: number
  preview?: string
  artist?: DeezerArtistRaw
  contributors?: DeezerArtistRaw[]
  album?: DeezerAlbumRaw
}

export interface DeezerPlaylistRaw {
  id: number | string
  title: string
  picture?: string
  picture_small?: string
  picture_medium?: string
  picture_big?: string
  picture_xl?: string
  nb_tracks?: number
  creator?: { id: number | string; name: string }
  user?: { id: number | string; name: string }
}

export interface DeezerGenreRaw {
  id: number | string
  name: string
  picture?: string
  picture_small?: string
  picture_medium?: string
  picture_big?: string
  picture_xl?: string
}

export interface DeezerRadioRaw {
  id: number | string
  title: string
  picture?: string
  picture_small?: string
  picture_medium?: string
  picture_big?: string
  picture_xl?: string
}

export interface DeezerList<T> {
  data?: T[]
  total?: number
  next?: string
  error?: { code: number | string; message: string; type?: string }
}

// --- Formas normalizadas (lo que lee la UI) ----------------------------------

export interface UiImage {
  url: string
}
export interface UiArtist {
  id: string
  name: string
}
export interface UiAlbumRef {
  id: string
  name: string
  images: UiImage[]
}

// --- Normalizadores ----------------------------------------------------------

export function normalizeArtist(a: DeezerArtistRaw) {
  return {
    id: String(a?.id ?? ''),
    name: a?.name ?? '',
    images: [{ url: pickUrl(a?.picture_big, a?.picture_medium, a?.picture, a?.picture_small) }],
    followers: { total: a?.nb_fan ?? 0 },
  }
}

// Construye el array de artistas de un track/álbum: usa `contributors` si existe,
// si no cae a `[artist]`. Nunca devuelve un array vacío.
function artistsFrom(artist?: DeezerArtistRaw, contributors?: DeezerArtistRaw[]): UiArtist[] {
  const source =
    Array.isArray(contributors) && contributors.length ? contributors : artist ? [artist] : []
  const mapped = source.map((a) => ({ id: String(a?.id ?? ''), name: a?.name ?? '' }))
  return mapped.length ? mapped : [PLACEHOLDER_ARTIST]
}

export function normalizeAlbum(al: DeezerAlbumRaw) {
  return {
    id: String(al?.id ?? ''),
    name: al?.title ?? '',
    images: [{ url: pickUrl(al?.cover_big, al?.cover_medium, al?.cover, al?.cover_small) }],
    artists: artistsFrom(al?.artist, al?.contributors),
    release_date: al?.release_date ?? '',
    total_tracks: al?.nb_tracks ?? 0,
    // 'album' | 'single' | 'ep' | 'compilation'. Sirve para separar discografía
    // (álbumes) de sencillos/EPs en ArtistView.
    album_type: al?.record_type ?? 'album',
  }
}

// `parentAlbum` se usa en listados de tracks de álbum/playlist donde Deezer omite
// la carátula por track: rellenamos desde el álbum padre ya normalizado.
export function normalizeTrack(t: DeezerTrackRaw, parentAlbum?: UiAlbumRef) {
  const rawAlbum = t?.album
  const albumUrl = rawAlbum
    ? pickUrl(rawAlbum.cover_big, rawAlbum.cover_medium, rawAlbum.cover, rawAlbum.cover_small)
    : ''

  let album: UiAlbumRef
  if (rawAlbum && albumUrl) {
    album = {
      id: String(rawAlbum.id ?? ''),
      name: rawAlbum.title ?? '',
      images: [{ url: albumUrl }],
    }
  } else if (parentAlbum) {
    album = parentAlbum
  } else {
    album = {
      id: rawAlbum ? String(rawAlbum.id ?? '') : '',
      name: rawAlbum?.title ?? '',
      images: [],
    }
  }

  return {
    id: String(t?.id ?? ''),
    name: t?.title ?? '',
    duration_ms: (t?.duration ?? 0) * 1000,
    preview_url: t?.preview ?? '',
    artists: artistsFrom(t?.artist, t?.contributors),
    album,
  }
}

// Géneros (las "categorías" de Deezer) y radios temáticas. Solo necesitamos
// id, nombre/título y una imagen, así que devolvemos `image` plano en vez del
// array `images[]` (no entran en el pipeline de tracks).
export function normalizeGenre(g: DeezerGenreRaw) {
  return {
    id: String(g?.id ?? ''),
    name: g?.name ?? '',
    image: pickUrl(g?.picture_big, g?.picture_medium, g?.picture, g?.picture_small),
  }
}

export function normalizeRadio(r: DeezerRadioRaw) {
  return {
    id: String(r?.id ?? ''),
    title: r?.title?.trim() ?? '',
    image: pickUrl(r?.picture_big, r?.picture_medium, r?.picture, r?.picture_small),
  }
}

export function normalizePlaylist(p: DeezerPlaylistRaw) {
  // En `/playlist/{id}` el dueño es `creator`; en `/search/playlist` es `user`.
  const owner = p?.creator ?? p?.user
  return {
    id: String(p?.id ?? ''),
    name: p?.title ?? '',
    images: [{ url: pickUrl(p?.picture_big, p?.picture_medium, p?.picture, p?.picture_small) }],
    owner: { id: String(owner?.id ?? ''), display_name: owner?.name ?? '' },
    tracks: { total: p?.nb_tracks ?? 0 },
  }
}

// Helpers para listas {data:[...]} -> array normalizado.
export function mapArtists(list: DeezerList<DeezerArtistRaw>) {
  return (list?.data ?? []).map(normalizeArtist)
}
export function mapAlbums(list: DeezerList<DeezerAlbumRaw>) {
  return (list?.data ?? []).map(normalizeAlbum)
}
export function mapTracks(list: DeezerList<DeezerTrackRaw>, parentAlbum?: UiAlbumRef) {
  return (list?.data ?? []).map((t) => normalizeTrack(t, parentAlbum))
}
export function mapPlaylists(list: DeezerList<DeezerPlaylistRaw>) {
  return (list?.data ?? []).map(normalizePlaylist)
}
export function mapGenres(list: DeezerList<DeezerGenreRaw>) {
  return (list?.data ?? []).map(normalizeGenre)
}
export function mapRadios(list: DeezerList<DeezerRadioRaw>) {
  return (list?.data ?? []).map(normalizeRadio)
}
