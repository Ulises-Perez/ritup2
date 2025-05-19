<template>
  <div class="pt-20">
    <div class="grid grid-cols-12 gap-2 px-2 h-full">
      <!-- Grid lateral izquierdo -->
      <Library />

      <!-- Grid central -->
      <div class="col-span-8 bg-[#181818] rounded-lg h-[calc(100vh-9rem)] overflow-y-auto">
        <!-- Estado de carga -->
        <div v-if="isLoading" class="flex items-center justify-center h-full">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>

        <!-- Estado de error -->
        <div v-else-if="error" class="flex flex-col items-center justify-center h-full p-8">
          <p class="text-red-400 text-lg mb-4">{{ error }}</p>
          <button
            @click="loadPlaylistData"
            class="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>

        <!-- Contenido de la playlist -->
        <div v-else-if="playlist" class="px-6 py-4">
          <div class="space-y-8">
            <!-- Cabecera de la playlist con efecto ambilight -->
            <div class="relative mb-12 overflow-visible">
              <div class="relative overflow-visible rounded-lg m-0 z-[1] transform-gpu">
                <img
                  :src="playlist.images[0]?.url || '/placeholder-playlist.jpg'"
                  :alt="playlist.name"
                  class="w-full h-64 object-cover rounded-lg shadow-xl filter-ambilight scale-100 relative z-[2]"
                />
              </div>
              <div class="absolute bottom-0 left-0 p-8 z-10 w-full bg-gradient-to-t from-black/80 to-transparent rounded-b-lg pt-20">
                <p class="text-white/60 text-sm mb-2">Playlist</p>
                <h1 class="text-white text-6xl font-bold drop-shadow-xl shadow-black mb-4 truncate">{{ playlist.name }}</h1>
                <div class="flex items-center mt-2">
                  <router-link
                    :to="`/user/${playlist.owner.id}`"
                    class="text-white hover:underline drop-shadow-lg shadow-black"
                  >
                    {{ playlist.owner.display_name }}
                  </router-link>
                  <span class="text-white/60 mx-2 drop-shadow-lg shadow-black">•</span>
                  <p class="text-white/60 drop-shadow-lg shadow-black">
                    {{ playlist.tracks.total }} canciones
                  </p>
                </div>
              </div>
            </div>

            <!-- Lista de canciones -->
            <section v-if="tracks.length > 0" class="mb-8">
              <TrackList :tracks="tracks.map(item => item.track)" :start-index="0" />
            </section>
          </div>
        </div>
      </div>

      <!-- Grid lateral derecho -->
      <ActiveFriends />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSpotifyStore } from '../store/spotifyStore'
import { usePlayerStore } from '../store/playerStore'
import Library from '../components/Library.vue'
import ActiveFriends from '../components/ActiveFriends.vue'
import TrackList from '../components/TrackList.vue'

const route = useRoute()
const router = useRouter()
const spotifyStore = useSpotifyStore()
const playerStore = usePlayerStore()

const playlist = ref(null)
const tracks = ref([])
const isLoading = ref(true)
const error = ref('')

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const playTrack = (track: any) => {
  playerStore.playTrack(track)
}

const loadPlaylistData = async () => {
  try {
    isLoading.value = true
    error.value = ''
    const playlistId = route.params.id as string

    // Limpiar datos anteriores
    playlist.value = null
    tracks.value = []

    // Cargar la playlist y sus canciones en paralelo
    const [playlistData, tracksData] = await Promise.all([
      spotifyStore.getPlaylist(playlistId),
      spotifyStore.getPlaylistTracks(playlistId)
    ])

    playlist.value = playlistData
    tracks.value = tracksData.items
  } catch (err) {
    console.error('Error al cargar datos de la playlist:', err)
    error.value = err instanceof Error ? err.message : 'Error al cargar los datos de la playlist'
    if (err instanceof Error && err.message.includes('token')) {
      router.push('/login')
    }
  } finally {
    isLoading.value = false
  }
}

// Observar cambios en la ruta
watch(
  () => route.params.id,
  () => {
    loadPlaylistData()
  }
)

onMounted(() => {
  loadPlaylistData()
})
</script>

<style>
/* Efecto ambilight */
.filter-ambilight {
  filter: url(#ambilight);
}
</style>
