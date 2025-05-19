<template>
  <div class="min-h-screen flex items-center justify-center bg-[#181818]">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-white mb-8">Bienvenido a Spotify Clone</h1>
      <button
        @click="login"
        class="px-8 py-4 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors text-lg font-semibold flex items-center justify-center"
      >
        <svg
          class="w-6 h-6 mr-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
        Iniciar sesión con Spotify
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { spotifyAuth } from '../services/spotifyAuth'

const router = useRouter()

const login = () => {
  window.location.href = spotifyAuth.getAuthUrl()
}

onMounted(async () => {
  try {
    const isAuthenticated = await spotifyAuth.checkAuth()
    if (isAuthenticated) {
      router.push('/')
    }
  } catch (error) {
    console.error('Error al verificar autenticación:', error)
  }
})
</script>
