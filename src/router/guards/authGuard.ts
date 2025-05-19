import { spotifyAuth } from '../../services/spotifyAuth'

export const authGuard = async (to: any, from: any, next: any) => {
  try {
    const isAuthenticated = await spotifyAuth.checkAuth()

    if (isAuthenticated) {
      next()
    } else {
      // Si no está autenticado, redirigir a la página de login de Spotify
      window.location.href = spotifyAuth.getAuthUrl()
    }
  } catch (error) {
    console.error('Error en el guard de autenticación:', error)
    // En caso de error, redirigir a la página de login
    window.location.href = spotifyAuth.getAuthUrl()
  }
}
