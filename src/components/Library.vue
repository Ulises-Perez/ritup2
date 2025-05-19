<template>
  <div class="col-span-2 bg-[#121212] rounded-lg h-[calc(100vh-9rem)] overflow-y-auto px-4 pt-4 pb-12">

    <div class="space-y-4">
      <!-- Encabezado -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <h2 class="text-white text-xl font-bold">Tu Biblioteca</h2>
        </div>
        <button
          @click="loadPlaylists(true)"
          class="text-white/60 hover:text-white transition-colors"
          :disabled="isLoading"
        >
          <svg
            class="w-5 h-5"
            :class="{ 'animate-spin': isLoading }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="isLoading"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      <!-- Estado de error -->
      <div v-if="error" class="p-4 bg-red-500/10 rounded-lg">
        <p class="text-red-400 text-sm">{{ error }}</p>
        <button
          @click="loadPlaylists(true)"
          class="mt-2 text-white text-sm hover:text-green-500 transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>

      <!-- Estado de carga inicial -->
      <div v-if="isLoading && !playlists.length" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>

      <!-- Lista de Playlists -->
      <div v-else class="space-y-2">
        <router-link
          v-for="playlist in playlists"
          :key="playlist.id"
          :to="`/playlist/${playlist.id}`"
          class="flex items-center p-2 rounded-lg hover:bg-white/10 transition-colors group"
        >
          <img
            :src="playlist.images[0]?.url || '/placeholder-playlist.jpg'"
            :alt="playlist.name"
            class="w-12 h-12 rounded object-cover mr-3"
            loading="lazy"
            decoding="async"
            :width="48"
            :height="48"
          />
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm font-medium truncate group-hover:text-green-500">
              {{ playlist.name }}
            </p>
            <p class="text-white/60 text-xs">
              Playlist • {{ playlist.owner.display_name }}
            </p>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSpotifyStore } from '../store/spotifyStore'
import { useRouter } from 'vue-router'

const router = useRouter()
const spotifyStore = useSpotifyStore()
const playlists = ref([])
const isLoading = ref(false)
const error = ref('')

// Función para cargar las playlists
const loadPlaylists = async (forceUpdate = false) => {
  try {
    isLoading.value = true
    error.value = ''
    const playlistsData = await spotifyStore.getCurrentUserPlaylists(forceUpdate)
    playlists.value = playlistsData
  } catch (err) {
    console.error('Error al cargar las playlists:', err)
    error.value = err instanceof Error ? err.message : 'Error al cargar las playlists'
    // Si el error es de autenticación, redirigir al login
    if (err instanceof Error && err.message.includes('token')) {
      router.push('/login')
    }
  } finally {
    isLoading.value = false
  }
}

// Cargar playlists al montar el componente
onMounted(() => {
  loadPlaylists()
})

// Observar cambios en el store para actualizar las playlists
watch(() => spotifyStore.playlists, (newPlaylists) => {
  if (newPlaylists && newPlaylists.length > 0) {
    playlists.value = newPlaylists
    error.value = ''
  }
}, { immediate: true })
</script>
