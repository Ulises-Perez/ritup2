<template>
  <div class="pt-20">
    <div class="grid grid-cols-12 gap-2 px-2 h-full">
      <!-- Grid lateral izquierdo -->
      <Library />

      <!-- Grid central -->
      <div class="col-span-8 bg-[#181818] rounded-lg h-[calc(100vh-9rem)] overflow-y-auto">
        <!-- Contenido de búsqueda -->
        <div class="px-6 py-4 space-y-8">
          <!-- Sección principal: Resultado más relevante + Canciones -->
          <div v-if="exactMatch || tracks?.length > 0" class="grid grid-cols-12 gap-6 mb-8">
            <!-- Resultado más relevante -->
            <div v-if="exactMatch" class="col-span-4">
              <h2 class="text-2xl font-bold text-white mb-4">Resultado más relevante</h2>
              <router-link
                v-if="exactMatch.type !== 'track'"
                :to="getExactMatchLink"
                class="bg-[#282828] p-4 rounded-lg hover:bg-[#2a2a2a] transition-all duration-300 block group"
              >
                <div class="relative mb-4">
                  <img
                    :src="exactMatch?.images?.[0]?.url || exactMatch?.album?.images?.[0]?.url || '/placeholder.jpg'"
                    :alt="exactMatch?.name"
                    class="w-full aspect-square object-cover rounded-lg shadow-lg"
                    loading="lazy"
                    decoding="async"
                  />
                  <button class="absolute bottom-2 right-2 bg-green-500 rounded-full p-3 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                  </button>
                </div>
                <h3 class="text-lg font-bold text-white mb-1">{{ exactMatch?.name }}</h3>
                <p class="text-sm text-white/60">
                  {{ exactMatch?.type === 'track' ? exactMatch?.artists?.map(a => a?.name).join(', ') : getExactMatchType }}
                </p>
              </router-link>
              <div
                v-else
                @click="handleExactMatchClick"
                class="bg-[#282828] p-4 rounded-lg hover:bg-[#2a2a2a] transition-all duration-300 block group cursor-pointer"
              >
                <div class="relative mb-4">
                  <img
                    :src="exactMatch?.album?.images?.[0]?.url || '/placeholder.jpg'"
                    :alt="exactMatch?.name"
                    class="w-full aspect-square object-cover rounded-lg shadow-lg"
                    loading="lazy"
                    decoding="async"
                  />
                  <button class="absolute bottom-2 right-2 bg-green-500 rounded-full p-3 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                  </button>
                </div>
                <h3 class="text-lg font-bold text-white mb-1">{{ exactMatch?.name }}</h3>
                <p class="text-sm text-white/60">
                  {{ exactMatch?.artists?.map(a => a?.name).join(', ') }}
                </p>
              </div>
            </div>

            <!-- Canciones relevantes -->
            <div class="col-span-8">
              <h2 class="text-2xl font-bold text-white mb-4">Canciones</h2>
              <TrackList :tracks="tracks?.slice(0, 4)" :start-index="0" />
            </div>
          </div>

          <!-- Artistas -->
          <section v-if="artists?.length > 0" class="mb-8">
            <h2 class="text-2xl font-bold text-white mb-4">Artistas</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <router-link
                v-for="artist in artists"
                :key="artist?.id"
                :to="`/artist/${artist?.id}`"
                class="hover:bg-[#282828] p-4 rounded-lg transition-colors cursor-pointer group text-left"
              >
                <div class="relative">
                  <div
                    v-if="!artist?.images?.[0]?.url"
                    class="w-full aspect-square rounded-full mb-4 flex items-center justify-center"
                    :style="{ backgroundColor: getRandomColor() }"
                  >
                    <svg class="w-16 h-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <!-- Cabeza de la nota -->
                      <path d="M12 6c0-2.5 2-4 4-4s4 1.5 4 4c0 2.5-2 4-4 4s-4-1.5-4-4z" />
                      <!-- Palo de la nota -->
                      <path d="M12 6v12" />
                      <!-- Cola de la nota -->
                      <path d="M12 18c0 2.5-2 4-4 4s-4-1.5-4-4c0-2.5 2-4 4-4s4 1.5 4 4z" />
                    </svg>
                  </div>
                  <img
                    v-else
                    :src="artist?.images?.[0]?.url"
                    :alt="artist?.name"
                    class="w-full aspect-square object-cover rounded-full mb-4"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div class="space-y-1">
                  <h3 class="text-white font-medium text-center truncate">{{ artist?.name }}</h3>
                </div>
              </router-link>
            </div>
          </section>

          <!-- Álbumes -->
          <section v-if="albums?.length > 0" class="mb-8">
            <h2 class="text-2xl font-bold text-white mb-4">Álbumes</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <router-link
                v-for="album in albums"
                :key="album?.id"
                :to="`/album/${album?.id}`"
                class="bg-[#282828] p-4 rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer group"
              >
                <img
                  :src="album?.images?.[0]?.url"
                  :alt="album?.name"
                  class="w-full aspect-square object-cover rounded-lg mb-4"
                  loading="lazy"
                  decoding="async"
                />
                <h3 class="text-white font-medium truncate group-hover:text-green-500 transition-colors">
                  {{ album?.name }}
                </h3>
                <p class="text-white/60 text-sm mt-1">
                  {{ album?.artists?.map(a => a?.name).join(', ') }}
                </p>
              </router-link>
            </div>
          </section>

          <!-- Playlists -->
          <section v-if="playlists?.length > 0" class="mb-8">
            <h2 class="text-2xl font-bold text-white mb-4">Playlists</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <router-link
                v-for="playlist in playlists"
                :key="playlist?.id"
                :to="`/playlist/${playlist?.id}`"
                class="bg-[#282828] p-4 rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer group"
              >
                <img
                  :src="playlist?.images?.[0]?.url"
                  :alt="playlist?.name"
                  class="w-full aspect-square object-cover rounded-lg mb-4"
                  loading="lazy"
                  decoding="async"
                />
                <h3 class="text-white font-medium truncate group-hover:text-green-500 transition-colors">
                  {{ playlist?.name }}
                </h3>
                <p class="text-white/60 text-sm mt-1">
                  {{ playlist?.owner?.display_name }} • {{ playlist?.tracks?.total }} canciones
                </p>
              </router-link>
            </div>
          </section>

          <!-- Estado de carga -->
          <div v-if="isLoading" class="flex items-center justify-center h-[calc(100%-5rem)]">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>

          <!-- Mensaje cuando no hay resultados -->
          <div v-else-if="!isLoading && query && !hasResults" class="flex flex-col items-center justify-center py-12">
            <p class="text-white/60 text-lg">No se encontraron resultados para "{{ query }}"</p>
          </div>
        </div>
      </div>

      <!-- Grid lateral derecho -->
      <ActiveFriends />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSpotifyStore } from '../store/spotifyStore'
import { usePlayerStore } from '../store/playerStore'
import Library from '../components/Library.vue'
import ActiveFriends from '../components/ActiveFriends.vue'
import TrackList from '../components/TrackList.vue'

const route = useRoute()
const spotifyStore = useSpotifyStore()
const playerStore = usePlayerStore()

const query = computed(() => route.query.q as string || '')
const isLoading = ref(false)
const artists = ref([])
const albums = ref([])
const tracks = ref([])
const playlists = ref([])

// Encontrar la coincidencia exacta
const exactMatch = computed(() => {
  const searchTerm = query.value.toLowerCase()

  // Buscar primero en canciones
  const exactTrack = tracks.value?.find(track =>
    track?.name?.toLowerCase() === searchTerm ||
    track?.artists?.some(artist => artist?.name?.toLowerCase() === searchTerm)
  )
  if (exactTrack) return { ...exactTrack, type: 'track' }

  // Luego en artistas
  const exactArtist = artists.value?.find(artist =>
    artist?.name?.toLowerCase() === searchTerm
  )
  if (exactArtist) return { ...exactArtist, type: 'artist' }

  // Finalmente en álbumes
  const exactAlbum = albums.value?.find(album =>
    album?.name?.toLowerCase() === searchTerm ||
    album?.artists?.some(artist => artist?.name?.toLowerCase() === searchTerm)
  )
  if (exactAlbum) return { ...exactAlbum, type: 'album' }

  // Si no hay coincidencia exacta, usar el primer resultado más relevante
  if (tracks.value?.length > 0) return { ...tracks.value[0], type: 'track' }
  if (artists.value?.length > 0) return { ...artists.value[0], type: 'artist' }
  if (albums.value?.length > 0) return { ...albums.value[0], type: 'album' }
  if (playlists.value?.length > 0) return { ...playlists.value[0], type: 'playlist' }

  return null
})

// Obtener el tipo del resultado exacto
const getExactMatchType = computed(() => {
  if (!exactMatch.value) return ''
  switch (exactMatch.value.type) {
    case 'artist':
      return 'Artista'
    case 'track':
      return 'Canción'
    case 'album':
      return 'Álbum'
    default:
      return ''
  }
})

// Obtener el enlace para el resultado exacto
const getExactMatchLink = computed(() => {
  if (!exactMatch.value) return '/'
  switch (exactMatch.value.type) {
    case 'artist':
      return `/artist/${exactMatch.value.id}`
    case 'track':
      return `/track/${exactMatch.value.id}`
    case 'album':
      return `/album/${exactMatch.value.id}`
    default:
      return '/'
  }
})

const hasResults = computed(() => {
  return artists.value?.length > 0 ||
         albums.value?.length > 0 ||
         tracks.value?.length > 0 ||
         playlists.value?.length > 0
})

const formatDuration = (ms: number) => {
  if (!ms) return '0:00'
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(0)
  return `${minutes}:${seconds.padStart(2, '0')}`
}

const search = async (query: string) => {
  if (!query.trim()) {
    artists.value = []
    albums.value = []
    tracks.value = []
    playlists.value = []
    return
  }

  try {
    isLoading.value = true
    const results = await spotifyStore.search(query)

    artists.value = results?.artists?.items || []
    albums.value = results?.albums?.items || []
    tracks.value = results?.tracks?.items || []
    playlists.value = (results?.playlists?.items || []).filter(playlist =>
      playlist?.id &&
      playlist?.name &&
      playlist?.images?.[0]?.url &&
      playlist?.tracks?.total !== undefined &&
      playlist?.owner?.display_name
    )
  } catch (error) {
    console.error('Error en la búsqueda:', error)
  } finally {
    isLoading.value = false
  }
}

// Observar cambios en la query para realizar la búsqueda
watch(() => route.query.q, (newQuery) => {
  if (newQuery) {
    search(newQuery as string)
  }
}, { immediate: true })

// Realizar búsqueda inicial si hay una query
onMounted(() => {
  if (query.value) {
    search(query.value)
  }
})

const handleExactMatchClick = (event: Event) => {
  if (!exactMatch.value) return

  if (exactMatch.value.type === 'track') {
    event.preventDefault()
    playerStore.playTrack(exactMatch.value)
  }
}

// Función para generar un color aleatorio
const getRandomColor = () => {
  const colors = [
    '#1DB954', // Verde Spotify
    '#FF6B6B', // Rojo
    '#4ECDC4', // Turquesa
    '#45B7D1', // Azul claro
    '#96CEB4', // Verde claro
    '#FFEEAD', // Amarillo claro
    '#D4A5A5', // Rosa
    '#9B59B6', // Púrpura
    '#3498DB', // Azul
    '#E67E22', // Naranja
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// Función para obtener las iniciales del artista
const getArtistInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>
