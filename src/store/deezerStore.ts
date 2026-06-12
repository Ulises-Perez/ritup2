import { defineStore } from 'pinia'
import {
  normalizeArtist,
  normalizeAlbum,
  normalizePlaylist,
  normalizeTrack,
  normalizeGenre,
  mapAlbums,
  mapArtists,
  mapTracks,
  mapPlaylists,
  mapGenres,
  mapRadios,
  type DeezerList,
  type DeezerArtistRaw,
  type DeezerAlbumRaw,
  type DeezerTrackRaw,
  type DeezerPlaylistRaw,
  type DeezerGenreRaw,
  type DeezerRadioRaw,
} from './deezerNormalize'

// Base del proxy. En dev lo resuelve `server.proxy` de Vite ('/deezer' -> api.deezer.com).
// En producción, apuntar VITE_DEEZER_PROXY_BASE al passthrough de Express (/deezer en
// src/api/youtube_search.js), p. ej. 'https://mi-backend/deezer'.
const BASE = import.meta.env.VITE_DEEZER_PROXY_BASE || '/deezer'

// Helper de fetch: parsea JSON y lanza si Deezer devuelve un cuerpo {error}.
// (Deezer responde HTTP 200 incluso en errores como cuota -> code 4, por eso
// hay que inspeccionar el body, no solo response.ok.)
async function dz<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`)
  if (!response.ok) {
    throw new Error(`Error HTTP Deezer: ${response.status}`)
  }
  const data = await response.json()
  if (data && data.error) {
    const message = data.error.message || 'Error desconocido de la API de Deezer'
    throw new Error(`Deezer: ${message}`)
  }
  return data as T
}

const q = (value: string) => encodeURIComponent(value)

export const useDeezerStore = defineStore('deezer', () => {
  // Búsqueda multi-tipo. Deezer separa la búsqueda por recurso, así que lanzamos
  // las cuatro en paralelo y reconstruimos la forma {artists:{items},...} de Spotify.
  const search = async (query: string) => {
    const [tracks, artists, albums, playlists] = await Promise.all([
      dz<DeezerList<DeezerTrackRaw>>(`/search?q=${q(query)}`),
      dz<DeezerList<DeezerArtistRaw>>(`/search/artist?q=${q(query)}`),
      dz<DeezerList<DeezerAlbumRaw>>(`/search/album?q=${q(query)}`),
      dz<DeezerList<DeezerPlaylistRaw>>(`/search/playlist?q=${q(query)}`),
    ])

    return {
      tracks: { items: mapTracks(tracks) },
      artists: { items: mapArtists(artists) },
      albums: { items: mapAlbums(albums) },
      playlists: { items: mapPlaylists(playlists) },
    }
  }

  const getArtist = async (id: string) => {
    const artist = await dz<DeezerArtistRaw>(`/artist/${id}`)
    return normalizeArtist(artist)
  }

  // Devuelve un array (como spotifyStore.getArtistTopTracks, que retornaba data.tracks).
  const getArtistTopTracks = async (id: string) => {
    const top = await dz<DeezerList<DeezerTrackRaw>>(`/artist/${id}/top?limit=10`)
    return mapTracks(top)
  }

  const getArtistAlbums = async (id: string) => {
    const albums = await dz<DeezerList<DeezerAlbumRaw>>(`/artist/${id}/albums?limit=50`)
    return { items: mapAlbums(albums) }
  }

  // Artistas relacionados / de referencia (la red "fans también escuchan" de Deezer).
  const getRelatedArtists = async (id: string, limit = 12) => {
    const artists = await dz<DeezerList<DeezerArtistRaw>>(`/artist/${id}/related?limit=${limit}`)
    return mapArtists(artists)
  }

  // "Aparece en": Deezer no expone un endpoint de "playlists en las que aparece el
  // artista" sin auth, así que aproximamos buscando playlists por su nombre.
  const getArtistPlaylists = async (name: string, limit = 10) => {
    if (!name?.trim()) return []
    const list = await dz<DeezerList<DeezerPlaylistRaw>>(
      `/search/playlist?q=${q(name)}&limit=${limit}`,
    )
    return mapPlaylists(list)
  }

  const getAlbum = async (id: string) => {
    const album = await dz<DeezerAlbumRaw>(`/album/${id}`)
    return normalizeAlbum(album)
  }

  const getAlbumTracks = async (id: string) => {
    // El listado de tracks de un álbum no trae carátula por track: la rellenamos
    // desde el propio álbum.
    const [album, tracks] = await Promise.all([
      dz<DeezerAlbumRaw>(`/album/${id}`),
      dz<DeezerList<DeezerTrackRaw>>(`/album/${id}/tracks`),
    ])
    const normalizedAlbum = normalizeAlbum(album)
    const parentAlbum = {
      id: normalizedAlbum.id,
      name: normalizedAlbum.name,
      images: normalizedAlbum.images,
    }
    return { items: mapTracks(tracks, parentAlbum) }
  }

  const getPlaylist = async (id: string) => {
    const playlist = await dz<DeezerPlaylistRaw>(`/playlist/${id}`)
    return normalizePlaylist(playlist)
  }

  const getPlaylistTracks = async (id: string) => {
    const tracks = await dz<DeezerList<DeezerTrackRaw>>(`/playlist/${id}/tracks`)
    // PlaylistView espera item.track (igual que Spotify).
    return { items: mapTracks(tracks).map((track) => ({ track })) }
  }

  // Deezer no tiene "mis novedades/top" sin auth: usamos los charts públicos.
  // `/chart/0` trae tracks + albums + artists + playlists (+ podcasts) de golpe,
  // así que poblamos todo el home con UNA sola petición.
  const getCharts = async () => {
    const data = await dz<{
      tracks?: DeezerList<DeezerTrackRaw>
      albums?: DeezerList<DeezerAlbumRaw>
      artists?: DeezerList<DeezerArtistRaw>
    }>(`/chart/0?limit=24`)
    return {
      tracks: mapTracks(data.tracks ?? {}),
      albums: mapAlbums(data.albums ?? {}),
      artists: mapArtists(data.artists ?? {}),
    }
  }

  // Playlists destacadas. La carátula que da el chart es un mosaico; la
  // sustituimos por la portada de la PRIMERA canción de cada playlist (una
  // petición /tracks?limit=1 por playlist, en paralelo).
  const getTopPlaylists = async (limit = 10) => {
    const list = await dz<DeezerList<DeezerPlaylistRaw>>(`/chart/0/playlists?limit=${limit}`)
    const playlists = mapPlaylists(list)
    return Promise.all(
      playlists.map(async (pl) => {
        try {
          const tracks = await dz<DeezerList<DeezerTrackRaw>>(`/playlist/${pl.id}/tracks?limit=1`)
          const cover = mapTracks(tracks)[0]?.album?.images?.[0]?.url
          return cover ? { ...pl, images: [{ url: cover }] } : pl
        } catch {
          return pl
        }
      }),
    )
  }

  // Álbumes curados por el equipo editorial de Deezer (distintos del chart).
  const getEditorialSelection = async () => {
    const albums = await dz<DeezerList<DeezerAlbumRaw>>(`/editorial/0/selection?limit=20`)
    return mapAlbums(albums)
  }

  // Categorías (géneros) de Deezer. El id 0 es "Todos" (no es una categoría
  // navegable real), así que lo descartamos.
  const getGenres = async () => {
    const genres = await dz<DeezerList<DeezerGenreRaw>>(`/genre`)
    return mapGenres(genres).filter((g) => g.id !== '0')
  }

  const getGenre = async (id: string) => {
    const genre = await dz<DeezerGenreRaw>(`/genre/${id}`)
    return normalizeGenre(genre)
  }

  const getGenreArtists = async (id: string) => {
    const artists = await dz<DeezerList<DeezerArtistRaw>>(`/genre/${id}/artists?limit=50`)
    return mapArtists(artists)
  }

  const getGenreRadios = async (id: string) => {
    const radios = await dz<DeezerList<DeezerRadioRaw>>(`/genre/${id}/radios`)
    return mapRadios(radios)
  }

  // Tracks de una radio temática. Sirven para reproducir la radio como una cola
  // normal (el pipeline yt-dlp resuelve el audio por título+artista).
  const getRadioTracks = async (id: string) => {
    const tracks = await dz<DeezerList<DeezerTrackRaw>>(`/radio/${id}/tracks`)
    return mapTracks(tracks)
  }

  // Continuación "de género similar": cuando una cola (playlist/álbum) se agota,
  // seguimos con el top del MISMO género de la canción semilla. El género se saca
  // del álbum de la semilla (`/album/{id}.genre_id`) y las pistas del chart de ese
  // género (`/chart/{genreId}/tracks`; genreId 0 = chart global como último recurso).
  const getGenreContinuation = async (
    seed: { album?: { id?: string } } | null,
    excludeIds: string[] = [],
    limit = 20,
  ) => {
    try {
      let genreId = '0'
      const albumId = seed?.album?.id
      if (albumId) {
        const album = await dz<DeezerAlbumRaw & { genre_id?: number | string }>(
          `/album/${albumId}`,
        ).catch(() => null)
        const gid = album?.genre_id
        // Deezer usa -1 para "sin género".
        if (gid !== undefined && gid !== null && String(gid) !== '-1') genreId = String(gid)
      }

      const fetchChart = (id: string) =>
        dz<DeezerList<DeezerTrackRaw>>(`/chart/${id}/tracks?limit=100`).catch(
          () => ({ data: [] }) as DeezerList<DeezerTrackRaw>,
        )

      let list = await fetchChart(genreId)
      if (!list.data?.length && genreId !== '0') list = await fetchChart('0')

      const exclude = new Set(excludeIds.map(String))
      const seen = new Set<string>()
      const tracks = mapTracks(list).filter((t) => {
        if (!t.id || exclude.has(t.id) || seen.has(t.id)) return false
        seen.add(t.id)
        return true
      })

      // Mezclar para que la radio no sea siempre el mismo orden del chart.
      return tracks
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
        .slice(0, limit)
    } catch (error) {
      console.error('Error en getGenreContinuation (Deezer):', error)
      return []
    }
  }

  // Canciones similares: artistas relacionados + top del artista, mezclados y sin
  // duplicados. Reemplaza a spotifyStore.getSimilarSongs (que dependía del endpoint
  // /related-artists de Spotify, retirado para apps nuevas).
  const getSimilarSongs = async (artistId: string) => {
    if (!artistId) return []

    try {
      const [related, top] = await Promise.all([
        dz<DeezerList<DeezerArtistRaw>>(`/artist/${artistId}/related?limit=5`).catch(
          () => ({ data: [] }) as DeezerList<DeezerArtistRaw>,
        ),
        dz<DeezerList<DeezerTrackRaw>>(`/artist/${artistId}/top?limit=10`).catch(
          () => ({ data: [] }) as DeezerList<DeezerTrackRaw>,
        ),
      ])

      let allTracks = mapTracks(top)

      const relatedArtists = related.data ?? []
      const relatedTopResults = await Promise.all(
        relatedArtists.slice(0, 3).map((artist) =>
          dz<DeezerList<DeezerTrackRaw>>(`/artist/${artist.id}/top?limit=5`)
            .then((result) => mapTracks(result))
            .catch(() => []),
        ),
      )
      allTracks = allTracks.concat(...relatedTopResults)

      // Quitar duplicados por id y mezclar aleatoriamente.
      const seen = new Set<string>()
      const unique = allTracks.filter((track) => {
        if (!track.id || seen.has(track.id)) return false
        seen.add(track.id)
        return true
      })

      const shuffled = unique
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)

      return shuffled.slice(0, 20)
    } catch (error) {
      console.error('Error en getSimilarSongs (Deezer):', error)
      return []
    }
  }

  return {
    search,
    getArtist,
    getArtistTopTracks,
    getArtistAlbums,
    getRelatedArtists,
    getArtistPlaylists,
    getAlbum,
    getAlbumTracks,
    getPlaylist,
    getPlaylistTracks,
    getCharts,
    getTopPlaylists,
    getEditorialSelection,
    getGenres,
    getGenre,
    getGenreArtists,
    getGenreRadios,
    getRadioTracks,
    getGenreContinuation,
    getSimilarSongs,
  }
})
