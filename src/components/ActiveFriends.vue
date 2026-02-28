<template>
  <div class="col-span-2 bg-[#181818] rounded-lg h-[calc(100vh-9rem)] overflow-y-auto pb-12">
    <div class="p-4 flex-none">
      <!-- Información de la canción actual -->
      <div v-if="currentTrack">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-white font-bold text-xl leading-tight">Reproduciendo ahora</h2>
        </div>

        <!-- Imagen de la canción -->
        <div class="w-full aspect-square rounded-lg overflow-hidden mb-4">
          <img
            :src="currentTrack.album.images[0]?.url || '/placeholder-album.jpg'"
            :alt="currentTrack.name"
            class="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <div class="px-1">
          <h3 class="text-white font-bold text-2xl leading-tight mb-2 line-clamp-2">
            {{ currentTrack.name }}
          </h3>
          <p class="text-white/80 text-lg mb-4 line-clamp-1">
            {{ artistNames }}
          </p>
        </div>
      </div>
    </div>

    <!-- Contenido con scroll -->
    <div class="flex-1 overflow-y-auto px-4 pb-4">
      <!-- Lista de canciones en cola -->
      <div v-if="shouldShowQueue" class="mb-6">
        <h2 class="text-white font-bold mb-4 flex items-center sticky top-0 bg-[#181818] py-2 z-10">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            />
          </svg>
          {{ queueTitle }}
        </h2>
        <div class="space-y-2">
          <div
            v-for="track in displayTracks"
            :key="track.id"
            @click="handleTrackClick(track)"
            class="group flex items-center space-x-3 p-3 rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer"
            :class="{ 'bg-[#2a2a2a]/50': track.id === currentTrack?.id }"
          >
            <div class="relative">
              <img
                :src="track.album?.images?.[0]?.url || '/placeholder-album.jpg'"
                :alt="track.name"
                class="w-12 h-12 rounded-lg shadow-md"
                loading="lazy"
              />
              <div
                v-if="track.id === currentTrack?.id"
                class="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center"
              >
                <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 5v10l7-5-7-5z" />
                </svg>
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <p
                class="text-white text-sm font-medium truncate group-hover:text-white transition-colors"
              >
                {{ track.name }}
              </p>
              <p class="text-white/60 text-xs truncate">
                {{ track.artists?.map((a) => a.name).join(', ') }}
              </p>
            </div>

            <div class="text-white/40 text-xs flex-shrink-0">
              {{ formatDuration(track.duration_ms) }}
            </div>
          </div>

          <!-- Mostrar más botón -->
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

      <!-- Canciones similares -->
      <SimilarTracks v-if="currentTrack" />

      <!-- Estado vacío -->
      <div v-if="!currentTrack" class="text-center py-8">
        <div
          class="w-16 h-16 mx-auto mb-4 bg-[#282828] rounded-full flex items-center justify-center"
        >
          <svg class="w-8 h-8 text-white/40" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 5v10l7-5-7-5z" />
          </svg>
        </div>
        <p class="text-white/60 text-sm">No hay música reproduciéndose</p>
        <p class="text-white/40 text-xs mt-1">Selecciona una canción para comenzar</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerStore } from '../store/playerStore'
import SimilarTracks from './SimilarTracks.vue'

const playerStore = usePlayerStore()

// Estados locales
const showMore = ref(false)
const maxInitialTracks = 5
const isSeekingProgress = ref(false)
const progressBar = ref<HTMLElement | null>(null)

// Datos del player
const currentTrack = computed(() => playerStore.currentTrack)
const currentTime = computed(() => playerStore.currentTime)
const duration = computed(() => playerStore.duration)
const queue = computed(() => playerStore.queue)

// Información de la canción actual
const artistNames = computed(() => {
  if (!currentTrack.value?.artists) return ''
  return currentTrack.value.artists.map((artist) => artist.name).join(', ')
})

const progressPercentage = computed(() => {
  if (!duration.value || duration.value === 0) return 0
  return Math.min(100, (currentTime.value / duration.value) * 100)
})

// Lógica de la cola/lista
const shouldShowQueue = computed(() => {
  return queue.value.length > 0
})

const queueTitle = computed(() => {
  if (queue.value.length > 1) {
    return `Cola de reproducción (${queue.value.length})`
  }
  return 'Siguiente en cola'
})

const displayTracks = computed(() => {
  let tracks = queue.value

  if (!showMore.value && tracks.length > maxInitialTracks) {
    tracks = tracks.slice(0, maxInitialTracks)
  }

  return tracks
})

const hasMoreTracks = computed(() => {
  return queue.value.length > maxInitialTracks
})

const remainingTracksCount = computed(() => {
  return Math.max(0, queue.value.length - maxInitialTracks)
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
  artists: Array<{ name: string }>
  youtube_id?: string
}

const handleTrackClick = (track: Track) => {
  // Si es una canción de la cola, actualizar el índice
  if (queue.value.includes(track)) {
    const queueIndex = queue.value.findIndex((t) => t.id === track.id)
    if (queueIndex !== -1) {
      playerStore.currentIndex = queueIndex
      playerStore.playTrack(track)
    }
  } else {
    // Si no está en la cola, reproducir directamente
    playerStore.playTrack(track)
  }
}

// Métodos para el control de progreso
const calculateProgress = (event: MouseEvent): number => {
  if (!progressBar.value) return 0
  const rect = progressBar.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  return Math.max(0, Math.min(100, (x / rect.width) * 100))
}

const startSeeking = () => {
  isSeekingProgress.value = true
  // No hacer nada más aquí, solo marcar que empezamos el seek
}

const seeking = () => {
  if (!isSeekingProgress.value) return
  // Durante el arrastre, no cambiar el tiempo real, solo actualizar la vista
  // (esta función podría usarse para mostrar una vista previa, pero por ahora la dejamos vacía)
}

const endSeeking = (event: MouseEvent) => {
  if (!isSeekingProgress.value) return
  isSeekingProgress.value = false

  const progress = calculateProgress(event)
  const newTime = (progress / 100) * (duration.value || 0)

  // Solo cuando termina el arrastre, cambiar realmente la posición
  playerStore.seekTo(newTime)
}

// Formato de tiempo
const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
