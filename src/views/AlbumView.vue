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
            @click="loadAlbumData"
            class="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>

        <!-- Contenido del álbum -->
        <div v-else-if="album" class="px-6 py-4">
          <div class="space-y-8">
            <!-- Cabecera del álbum con efecto ambilight -->
            <div class="relative mb-12 overflow-visible">
              <div class="relative overflow-visible rounded-lg m-0 z-[1] transform-gpu">
                <img
                  :src="album.images[0]?.url || '/placeholder-album.jpg'"
                  :alt="album.name"
                  class="w-full h-64 object-cover rounded-lg shadow-xl filter-ambilight scale-100 relative z-[2]"
                />
              </div>
              <div class="absolute bottom-0 left-0 p-8 z-10 w-full bg-gradient-to-t from-black/80 to-transparent rounded-b-lg pt-20">
                <h1 class="text-white text-6xl font-bold drop-shadow-xl shadow-black mb-4">{{ album.name }}</h1>
                <div class="flex items-center mt-4">
                  <router-link
                    v-for="artist in album.artists"
                    :key="artist.id"
                    :to="`/artist/${artist.id}`"
                    class="text-white hover:underline drop-shadow-lg shadow-black"
                  >
                    {{ artist.name }}
                  </router-link>
                  <span class="text-white/60 mx-2 drop-shadow-lg shadow-black">•</span>
                  <p class="text-white/60 drop-shadow-lg shadow-black">
                    {{ album.total_tracks }} canciones • {{ new Date(album.release_date).getFullYear() }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Lista de canciones -->
            <section v-if="albumTracks.length > 0" class="mb-8">
              <TrackList
                :tracks="albumTracks.map(track => ({
                  ...track,
                  album: album
                }))"
                :start-index="0"
              />
            </section>

            <!-- Más álbumes del artista -->
            <section v-if="artistAlbums.length > 0" class="mb-12">
              <h2 class="text-2xl font-bold text-white mb-4">Más de {{ album.artists[0].name }}</h2>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <router-link
                  v-for="otherAlbum in artistAlbums"
                  :key="otherAlbum.id"
                  :to="`/album/${otherAlbum.id}`"
                  class="bg-[#282828] p-4 rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer group"
                >
                  <div class="relative mb-4">
                    <img
                      :src="otherAlbum.images[0]?.url || '/placeholder-album.jpg'"
                      :alt="otherAlbum.name"
                      class="w-full aspect-square object-cover rounded-lg"
                    />
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <button class="text-white p-3 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <h3 class="text-white font-medium truncate group-hover:text-green-500 transition-colors">
                      {{ otherAlbum.name }}
                    </h3>
                    <p class="text-white/60 text-sm">
                      {{ new Date(otherAlbum.release_date).getFullYear() }} • {{ otherAlbum.total_tracks }} canciones
                    </p>
                  </div>
                </router-link>
              </div>
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

const album = ref(null)
const albumTracks = ref([])
const artistAlbums = ref([])
const isLoading = ref(true)
const error = ref('')

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const playTrack = (track: any) => {
  playerStore.playTrack({
    ...track,
    album: album.value
  })
}

const loadAlbumData = async () => {
  try {
    isLoading.value = true
    error.value = ''
    const albumId = route.params.id as string

    // Limpiar datos anteriores
    album.value = null
    albumTracks.value = []
    artistAlbums.value = []

    // Cargar el álbum y sus canciones
    const [albumData, tracksData] = await Promise.all([
      spotifyStore.getAlbum(albumId),
      spotifyStore.getAlbumTracks(albumId)
    ])

    album.value = albumData
    albumTracks.value = tracksData.items

    // Cargar más álbumes del artista principal
    if (albumData.artists[0]) {
      const artistAlbumsData = await spotifyStore.getArtistAlbums(albumData.artists[0].id)
      artistAlbums.value = artistAlbumsData.items.filter(a => a.id !== albumId)
    }
  } catch (err) {
    console.error('Error al cargar datos del álbum:', err)
    error.value = err instanceof Error ? err.message : 'Error al cargar los datos del álbum'
    // Si el error es de autenticación, redirigir al login
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
    loadAlbumData()
  }
)

onMounted(() => {
  loadAlbumData()
})
</script>

<style>
/* Efecto ambilight */
.filter-ambilight {
  filter: url(#ambilight);
}

/* Definición del filtro SVG para el efecto ambilight */
.ambilight-filter {
  position: absolute;
  width: 0;
  height: 0;
}

.ambilight-filter svg {
  position: absolute;
  width: 0;
  height: 0;
}

.ambilight-filter svg filter {
  width: 500%;
  height: 500%;
  x: -2;
  y: -2;
  color-interpolation-filters: sRGB;
}
</style>
