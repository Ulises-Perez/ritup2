import { defineStore } from 'pinia'
import axios from 'axios'
import { ref } from 'vue'
import { spotifyAuth } from '../services/spotifyAuth'

interface SpotifyImage {
  url: string
  height: number
  width: number
}

interface SpotifyArtist {
  id: string
  name: string
  images: SpotifyImage[]
  external_urls: {
    spotify: string
  }
}

interface SpotifyTrack {
  id: string
  name: string
  artists: {
    name: string
  }[]
  album: {
    id: string
    name: string
    images: SpotifyImage[]
  }
  duration_ms: number
  preview_url: string | null
}

interface SpotifyAlbum {
  id: string
  name: string
  images: SpotifyImage[]
  artists: {
    name: string
  }[]
  release_date: string
  total_tracks: number
}

interface SpotifyTokens {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
}

export const useSpotifyStore = defineStore('spotify', () => {
  const accessToken = ref('')
  const user = ref(null)
  const playlists = ref([])
  const lastPlaylistsUpdate = ref(0)
  const PLAYLISTS_UPDATE_INTERVAL = 5 * 60 * 1000 // 5 minutos

  const setAccessToken = (token: string) => {
    accessToken.value = token
  }

  const getAccessToken = () => {
    return accessToken.value
  }

  const getCurrentUser = async () => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o inválido
          const isValid = await checkTokenValidity()
          if (!isValid) {
            throw new Error('Token inválido')
          }
          // Reintentar la llamada
          return getCurrentUser()
        }
        throw new Error('Error al obtener datos del usuario')
      }

      const userData = await response.json()
      user.value = userData
      return userData
    } catch (error) {
      console.error('Error en getCurrentUser:', error)
      throw error
    }
  }

  const getCurrentUserPlaylists = async (forceUpdate = false) => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const now = Date.now()
      const shouldUpdate = forceUpdate || !playlists.value.length || (now - lastPlaylistsUpdate.value) > PLAYLISTS_UPDATE_INTERVAL

      if (shouldUpdate) {
        const response = await fetch('https://api.spotify.com/v1/me/playlists', {
          headers: {
            Authorization: `Bearer ${accessToken.value}`
          }
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Token expirado o inválido
            const isValid = await checkTokenValidity()
            if (!isValid) {
              throw new Error('Token inválido')
            }
            // Reintentar la llamada
            return getCurrentUserPlaylists(forceUpdate)
          }
          throw new Error('Error al obtener playlists')
        }

        const data = await response.json()
        playlists.value = data.items
        lastPlaylistsUpdate.value = now
      }

      return playlists.value
    } catch (error) {
      console.error('Error en getCurrentUserPlaylists:', error)
      throw error
    }
  }

  const getArtist = async (id: string) => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const response = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o inválido
          const isValid = await checkTokenValidity()
          if (!isValid) {
            throw new Error('Token inválido')
          }
          // Reintentar la llamada
          return getArtist(id)
        }
        throw new Error('Error al obtener datos del artista')
      }

      return response.json()
    } catch (error) {
      console.error('Error en getArtist:', error)
      throw error
    }
  }

  const getArtistTopTracks = async (id: string) => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const response = await fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=ES`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          const isValid = await checkTokenValidity()
          if (!isValid) {
            throw new Error('Token inválido')
          }
          return getArtistTopTracks(id)
        }
        throw new Error('Error al obtener las canciones principales')
      }

      const data = await response.json()
      return data.tracks
    } catch (error) {
      console.error('Error en getArtistTopTracks:', error)
      throw error
    }
  }

  const getArtistAlbums = async (id: string) => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const response = await fetch(`https://api.spotify.com/v1/artists/${id}/albums?market=ES&limit=50`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          const isValid = await checkTokenValidity()
          if (!isValid) {
            throw new Error('Token inválido')
          }
          return getArtistAlbums(id)
        }
        throw new Error('Error al obtener los álbumes')
      }

      return response.json()
    } catch (error) {
      console.error('Error en getArtistAlbums:', error)
      throw error
    }
  }

  const getArtistPlaylists = async (artistId: string) => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}/playlists?limit=10`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          const isValid = await checkTokenValidity()
          if (!isValid) {
            throw new Error('Token inválido')
          }
          return getArtistPlaylists(artistId)
        }
        throw new Error('Error al obtener las playlists del artista')
      }

      return response.json()
    } catch (error) {
      console.error('Error en getArtistPlaylists:', error)
      throw error
    }
  }

  const getAlbum = async (id: string) => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const response = await fetch(`https://api.spotify.com/v1/albums/${id}?market=ES`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          const isValid = await checkTokenValidity()
          if (!isValid) {
            throw new Error('Token inválido')
          }
          return getAlbum(id)
        }
        throw new Error('Error al obtener el álbum')
      }

      return response.json()
    } catch (error) {
      console.error('Error en getAlbum:', error)
      throw error
    }
  }

  const getAlbumTracks = async (id: string) => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const response = await fetch(`https://api.spotify.com/v1/albums/${id}/tracks?market=ES`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          const isValid = await checkTokenValidity()
          if (!isValid) {
            throw new Error('Token inválido')
          }
          return getAlbumTracks(id)
        }
        throw new Error('Error al obtener las canciones del álbum')
      }

      return response.json()
    } catch (error) {
      console.error('Error en getAlbumTracks:', error)
      throw error
    }
  }

  const setTokens = (newAccessToken: string, refreshToken: string, expiresIn: number) => {
    accessToken.value = newAccessToken
    localStorage.setItem('spotify_tokens', JSON.stringify({
      accessToken: newAccessToken,
      refreshToken,
      expiresAt: Date.now() + (expiresIn * 1000)
    }))
  }

  const checkTokenValidity = async (): Promise<boolean> => {
    try {
      const storedTokens = localStorage.getItem('spotify_tokens')
      if (!storedTokens) return false

      const tokens = JSON.parse(storedTokens)
      if (!tokens.accessToken || !tokens.refreshToken || !tokens.expiresAt) return false

      // Si el token ha expirado o expirará en los próximos 5 minutos, renovarlo
      if (Date.now() >= (tokens.expiresAt - 300000)) { // 5 minutos en milisegundos
        const success = await refreshAccessToken(tokens.refreshToken)
        return success
      }

      setAccessToken(tokens.accessToken)
      return true
    } catch (error) {
      console.error('Error en checkTokenValidity:', error)
      localStorage.removeItem('spotify_tokens')
      return false
    }
  }

  const refreshAccessToken = async (refreshToken: string): Promise<boolean> => {
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
          client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET
        }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      setTokens(
        response.data.access_token,
        refreshToken,
        response.data.expires_in
      )
      return true
    } catch (error) {
      console.error('Error al refrescar el token:', error)
      localStorage.removeItem('spotify_tokens')
      return false
    }
  }

  const getUserProfile = async (id: string) => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const response = await fetch(`https://api.spotify.com/v1/users/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o inválido
          const isValid = await checkTokenValidity()
          if (!isValid) {
            throw new Error('Token inválido')
          }
          // Reintentar la llamada
          return getUserProfile(id)
        }
        throw new Error('Error al obtener el perfil del usuario')
      }

      return response.json()
    } catch (error) {
      console.error('Error en getUserProfile:', error)
      throw error
    }
  }

  const getUserPlaylists = async (id: string) => {
    const response = await axios.get(`https://api.spotify.com/v1/users/${id}/playlists?limit=50`, {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    return response.data.items
  }

  const getFollowedArtists = async () => {
    const response = await axios.get('https://api.spotify.com/v1/me/following?type=artist&limit=50', {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    return response.data.artists.items
  }

  const getTopArtists = async () => {
    const response = await axios.get('https://api.spotify.com/v1/me/top/artists', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
      params: {
        limit: 10,
        time_range: 'short_term' // últimas 4 semanas
      }
    })
    return response.data.items
  }

  const getSavedTracks = async () => {
    const response = await axios.get('https://api.spotify.com/v1/me/tracks', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
      params: {
        limit: 50
      }
    })
    return response.data.items
  }

  const getSavedAlbums = async () => {
    const response = await axios.get('https://api.spotify.com/v1/me/albums', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
      params: {
        limit: 50
      }
    })
    return response.data.items
  }

  const getNewReleases = async () => {
    const response = await axios.get('https://api.spotify.com/v1/browse/new-releases', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
      params: {
        limit: 20,
        country: 'ES'
      }
    })
    return response.data.albums.items
  }

  const getTopTracks = async () => {
    const response = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
      params: {
        limit: 20,
        time_range: 'short_term'
      }
    })
    return response.data.items
  }

  const searchArtistPlaylists = async (artistName: string) => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const query = encodeURIComponent(`artist:${artistName}`)
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${query}&type=playlist&limit=10&market=ES`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          const isValid = await checkTokenValidity()
          if (!isValid) {
            throw new Error('Token inválido')
          }
          return searchArtistPlaylists(artistName)
        }
        throw new Error('Error al buscar playlists del artista')
      }

      const data = await response.json()
      return data.playlists
    } catch (error) {
      console.error('Error en searchArtistPlaylists:', error)
      throw error
    }
  }

  const getPlaylist = async (id: string) => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const response = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          const isValid = await checkTokenValidity()
          if (!isValid) {
            throw new Error('Token inválido')
          }
          return getPlaylist(id)
        }
        throw new Error('Error al obtener la playlist')
      }

      return response.json()
    } catch (error) {
      console.error('Error en getPlaylist:', error)
      throw error
    }
  }

  const getPlaylistTracks = async (id: string) => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const response = await fetch(`https://api.spotify.com/v1/playlists/${id}/tracks?market=ES`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          const isValid = await checkTokenValidity()
          if (!isValid) {
            throw new Error('Token inválido')
          }
          return getPlaylistTracks(id)
        }
        throw new Error('Error al obtener las canciones de la playlist')
      }

      return response.json()
    } catch (error) {
      console.error('Error en getPlaylistTracks:', error)
      throw error
    }
  }

  const search = async (query: string) => {
    try {
      if (!accessToken.value) {
        const isValid = await checkTokenValidity()
        if (!isValid) {
          throw new Error('No hay token de acceso válido')
        }
      }

      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,artist,album,playlist&market=ES&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${accessToken.value}`
          }
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          const isValid = await checkTokenValidity()
          if (!isValid) {
            throw new Error('Token inválido')
          }
          return search(query)
        }
        throw new Error('Error al realizar la búsqueda')
      }

      return response.json()
    } catch (error) {
      console.error('Error en search:', error)
      throw error
    }
  }

  return {
    accessToken,
    setAccessToken,
    getAccessToken,
    getCurrentUser,
    getCurrentUserPlaylists,
    getArtist,
    getArtistTopTracks,
    getArtistAlbums,
    getArtistPlaylists,
    getAlbum,
    getAlbumTracks,
    setTokens,
    checkTokenValidity,
    refreshAccessToken,
    getUserProfile,
    getUserPlaylists,
    getFollowedArtists,
    getTopArtists,
    getSavedTracks,
    getSavedAlbums,
    getNewReleases,
    getTopTracks,
    searchArtistPlaylists,
    getPlaylist,
    getPlaylistTracks,
    search
  }
})
