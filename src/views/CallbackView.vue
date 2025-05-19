<template>
  <div class="min-h-screen flex items-center justify-center bg-[#181818]">
    <div class="text-center">
      <div v-if="loading" class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
      <p v-if="loading" class="text-white">Autenticando con Spotify...</p>
      <div v-if="error" class="text-red-500">
        <p class="text-lg font-semibold mb-2">Error de autenticación</p>
        <p class="text-sm">{{ error }}</p>
        <button
          @click="retryAuth"
          class="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { spotifyAuth } from '../services/spotifyAuth'

const router = useRouter()
const loading = ref(true)
const error = ref('')

const retryAuth = () => {
  window.location.href = spotifyAuth.getAuthUrl()
}

onMounted(async () => {
  try {
    await spotifyAuth.handleCallback()
    router.push('/')
  } catch (err) {
    console.error('Error en la autenticación:', err)
    error.value = err instanceof Error ? err.message : 'Error desconocido'
    loading.value = false
  }
})
</script>
