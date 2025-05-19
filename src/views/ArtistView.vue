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
            @click="loadArtistData"
            class="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>

        <!-- Contenido del artista -->
        <div v-else-if="artist" class="relative">
          <div class="relative mb-8">
            <div class="absolute inset-0 bg-gradient-to-t from-[#181818] to-transparent z-10"></div>
            <img
              :src="artist?.images?.[0]?.url || '/placeholder-artist.jpg'"
              :alt="artist?.name"
              class="w-full h-[400px] object-cover rounded-t-lg"
            />
            <div class="absolute bottom-0 left-0 p-8 z-20">
              <h1 class="text-6xl font-bold text-white mb-4">{{ artist?.name }}</h1>
              <p class="text-white/60">
                {{ new Intl.NumberFormat('es-ES').format(artist?.followers?.total || 0) }} seguidores
              </p>
            </div>
          </div>

          <div class="px-8">
            <!-- Canciones populares -->
            <section v-if="topTracks.length > 0" class="mb-8">
              <h2 class="text-2xl font-bold text-white mb-4">Canciones populares</h2>
              <TrackList :tracks="topTracks" :start-index="0" />
            </section>

            <!-- Playlists -->
            <section v-if="playlists?.length > 0" class="mb-12">
              <h2 class="text-2xl font-bold text-white mb-4">Playlists destacadas</h2>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <router-link
                  v-for="playlist in playlists"
                  :key="playlist.id"
                  :to="`/playlist/${playlist.id}`"
                  class="bg-[#282828] p-4 rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer group"
                >
                  <div class="relative mb-4">
                    <img
                      :src="playlist.images[0]?.url || '/placeholder-playlist.jpg'"
                      :alt="playlist.name"
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
                      {{ playlist.name }}
                    </h3>
                    <p class="text-white/60 text-sm">
                      {{ playlist.tracks.total }} canciones
                    </p>
                  </div>
                </router-link>
              </div>
            </section>

            <!-- Álbumes -->
            <section v-if="albums?.items?.length > 0" class="mb-12">
              <h2 class="text-2xl font-bold text-white mb-4">Discografía</h2>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <router-link
                  v-for="album in albums.items"
                  :key="album.id"
                  :to="`/album/${album.id}`"
                  class="bg-[#282828] p-4 rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer group"
                >
                  <div class="relative mb-4">
                    <img
                      :src="album.images[0]?.url || '/placeholder-album.jpg'"
                      :alt="album.name"
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
                      {{ album.name }}
                    </h3>
                    <p class="text-white/60 text-sm">
                      {{ new Date(album.release_date).getFullYear() }} • {{ album.total_tracks }} canciones
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

const artist = ref(null)
const topTracks = ref([])
const albums = ref([])
const playlists = ref([])
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

const loadArtistData = async () => {
  try {
    isLoading.value = true
    error.value = ''
    const artistId = route.params.id as string

    // Limpiar datos anteriores
    artist.value = null
    topTracks.value = []
    albums.value = []
    playlists.value = []

    // Primero obtenemos los datos del artista
    const artistData = await spotifyStore.getArtist(artistId)
    if (!artistData) {
      throw new Error('No se pudo cargar la información del artista')
    }
    artist.value = artistData

    // Luego cargamos el resto de la información en paralelo
    const [tracks, albumsData] = await Promise.all([
      spotifyStore.getArtistTopTracks(artistId),
      spotifyStore.getArtistAlbums(artistId)
    ])

    topTracks.value = tracks || []
    albums.value = albumsData || []

    // Búsqueda de playlists de forma segura
    try {
      const playlistsData = await spotifyStore.searchArtistPlaylists(artistData.name)
      if (playlistsData?.items) {
        playlists.value = playlistsData.items.filter(playlist => {
          if (!playlist || !playlist.name || !playlist.description) return false
          return playlist.name.toLowerCase().includes(artistData.name.toLowerCase()) ||
            playlist.description.toLowerCase().includes(artistData.name.toLowerCase())
        })
      }
    } catch (playlistError) {
      console.warn('Error al cargar playlists del artista:', playlistError)
      playlists.value = []
    }
  } catch (err) {
    console.error('Error al cargar datos del artista:', err)
    error.value = err instanceof Error ? err.message : 'Error al cargar los datos del artista'
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
    loadArtistData()
  }
)

onMounted(() => {
  loadArtistData()
})
</script>
