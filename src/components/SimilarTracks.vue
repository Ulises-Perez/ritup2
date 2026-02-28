<template>
  <div
    v-if="!isLoading && tracks?.length > 0"
    class="bg-[#282828]/50 rounded-xl p-6 backdrop-blur-sm"
  >
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold text-white flex items-center">
        <svg class="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
        {{ title }}
      </h3>
      <div class="flex items-center space-x-2">
        <button
          @click="toggleAutoplay"
          class="flex items-center space-x-2 px-3 py-1 rounded-full text-xs transition-all"
          :class="
            autoplay ? 'bg-green-500 text-white' : 'bg-[#3e3e3e] text-white/70 hover:bg-[#4a4a4a]'
          "
        >
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 5v10l7-5-7-5z" />
          </svg>
          <span>Autoplay</span>
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <div
        v-for="track in displayTracks"
        :key="track.id"
        @click="handleTrackClick(track)"
        class="group flex items-center space-x-3 p-3 rounded-lg hover:bg-[#3e3e3e] transition-all duration-200 cursor-pointer"
      >
        <div class="relative">
          <img
            :src="track.album?.images?.[0]?.url || '/placeholder-album.jpg'"
            :alt="track.name"
            class="w-12 h-12 rounded-lg shadow-md"
            loading="lazy"
          />
          <div
            class="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 5v10l7-5-7-5z" />
            </svg>
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <p
            class="text-white text-sm font-medium truncate group-hover:text-green-500 transition-colors"
          >
            {{ track.name }}
          </p>
          <p class="text-white/60 text-xs truncate">
            {{ track.artists?.map((a) => a.name).join(', ') }}
          </p>
        </div>

        <div class="flex items-center space-x-2">
          <span class="text-white/40 text-xs">
            {{ formatDuration(track.duration_ms) }}
          </span>
          <button
            @click.stop="addToQueue(track)"
            class="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-[#4a4a4a] transition-all"
            title="Añadir a la cola"
          >
            <svg
              class="w-4 h-4 text-white/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Mostrar más/menos -->
      <div v-if="hasMoreTracks" class="pt-2">
        <button
          @click="showMore = !showMore"
          class="w-full text-white/60 hover:text-white text-sm py-2 transition-colors"
        >
          {{ showMore ? 'Mostrar menos' : `Ver ${remainingTracksCount} más` }}
        </button>
      </div>
    </div>
  </div>

  <!-- Estado de carga -->
  <div v-else-if="isLoading" class="bg-[#282828]/50 rounded-xl p-6 backdrop-blur-sm">
    <div class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
    </div>
  </div>

  <!-- Estado vacío -->
  <div v-else class="bg-[#282828]/50 rounded-xl p-6 backdrop-blur-sm">
    <div class="text-center py-8">
      <div
        class="w-12 h-12 mx-auto mb-4 bg-[#3e3e3e] rounded-full flex items-center justify-center"
      >
        <svg class="w-6 h-6 text-white/40" fill="currentColor" viewBox="0 0 20 20">
          <path
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      </div>
      <p class="text-white/60 text-sm">{{ loadingMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePlayerStore } from '../store/playerStore'
import { useSpotifyStore } from '../store/spotifyStore'

interface Props {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Más del artista',
})

const playerStore = usePlayerStore()
const spotifyStore = useSpotifyStore()

// Estados locales
const showMore = ref(false)
const maxInitialTracks = 8
const isLoading = ref(false)
const loadingMessage = ref('Buscando canciones del artista...')

// Datos computados
const tracks = computed(() => playerStore.similarTracks || [])
const autoplay = computed(() => playerStore.autoplay)

const displayTracks = computed(() => {
  if (!showMore.value && tracks.value?.length > maxInitialTracks) {
    return tracks.value.slice(0, maxInitialTracks)
  }
  return tracks.value
})

const hasMoreTracks = computed(() => {
  return (tracks.value?.length || 0) > maxInitialTracks
})

const remainingTracksCount = computed(() => {
  return Math.max(0, (tracks.value?.length || 0) - maxInitialTracks)
})

// Métodos
const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

interface Track {
  id: string
  name: string
  duration_ms: number
  preview_url: string
  album: {
    images: Array<{ url: string }>
    name?: string
  }
  artists: Array<{ id?: string; name: string }>
  youtube_id?: string
}

const handleTrackClick = (track: Track) => {
  const context = {
    type: 'similar' as const,
    name: 'Más del artista',
    tracks: tracks.value,
  }

  playerStore.playFromContext(track, context)
}

const addToQueue = (track: Track) => {
  playerStore.addToQueue(track)
}

const toggleAutoplay = () => {
  playerStore.setAutoplay(!autoplay.value)
}

// Observar cambios en la canción actual para cargar canciones similares
watch(
  () => playerStore.currentTrack,
  async (newTrack: Track | null) => {
    if (newTrack?.artists?.[0]?.id) {
      try {
        isLoading.value = true
        loadingMessage.value = 'Buscando canciones del artista...'

        const similarTracks = await spotifyStore.getSimilarSongs(newTrack.artists[0].id)

        if (similarTracks?.length) {
          playerStore.setSimilarTracks(similarTracks)
        } else {
          loadingMessage.value = 'No se encontraron canciones del artista'
          playerStore.setSimilarTracks([])
        }
      } catch (error) {
        console.error('Error al cargar canciones del artista:', error)
        loadingMessage.value = 'No se pudieron cargar las canciones'
        playerStore.setSimilarTracks([])
      } finally {
        isLoading.value = false
      }
    } else {
      playerStore.setSimilarTracks([])
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
</style>
