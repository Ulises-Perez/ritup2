import { useSpotifyStore } from '../store/spotifyStore'

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

export const spotifyAuth = {
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
      scope: import.meta.env.VITE_SPOTIFY_SCOPES,
      show_dialog: 'false',
      state: this.generateRandomString(16)
    })

    return `${SPOTIFY_AUTH_URL}?${params.toString()}`
  },

  generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const values = crypto.getRandomValues(new Uint8Array(length))
    return values.reduce((acc, x) => acc + possible[x % possible.length], "")
  },

  async getTokens(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
        client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
        client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET
      })

      const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error en la respuesta de Spotify:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(`Error al obtener tokens: ${errorData.error_description || 'Error desconocido'}`)
      }

      const data = await response.json()
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in
      }
    } catch (error) {
      console.error('Error en getTokens:', error)
      throw error
    }
  },

  async handleCallback(): Promise<void> {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const error = urlParams.get('error')
      const state = urlParams.get('state')

      if (error) {
        throw new Error(`Error de autorización: ${error}`)
      }

      if (!code) {
        throw new Error('No se encontró el código de autorización')
      }

      const tokens = await this.getTokens(code)
      const spotifyStore = useSpotifyStore()
      spotifyStore.setTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn)

      // Limpiar la URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } catch (error) {
      console.error('Error en handleCallback:', error)
      throw error
    }
  },

  async checkAuth(): Promise<boolean> {
    try {
      const spotifyStore = useSpotifyStore()
      const isValid = await spotifyStore.checkTokenValidity()

      if (!isValid) {
        const storedTokens = localStorage.getItem('spotify_tokens')
        // Solo redirigir si no hay tokens almacenados
        if (!storedTokens) {
          console.log('No hay tokens almacenados, redirigiendo a autenticación')
          window.location.href = this.getAuthUrl()
        }
        return false
      }

      return true
    } catch (error) {
      console.error('Error en checkAuth:', error)
      return false
    }
  }
}
