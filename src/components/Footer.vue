<template>
  <footer class="fixed bottom-0 left-0 right-0 bg-[#181818]/95 backdrop-blur-sm border-t border-[#282828] z-50 h-24">
    <div class="mx-auto px-4 py-4 h-full">
      <div class="flex items-center justify-between w-full h-full">
        <!-- Info de la canción -->
        <div class="flex items-center w-1/4">
          <div v-if="currentTrack" class="flex items-center w-full">
            <img
              :src="currentTrack.album.images[0]?.url || '/placeholder-album.jpg'"
              :alt="currentTrack.name"
              class="h-14 w-14 rounded shadow-lg flex-shrink-0"
              loading="lazy"
              decoding="async"
              :width="56"
              :height="56"
            />
            <div class="ml-3 flex-1 min-w-0">
              <p class="text-white text-sm font-medium truncate">{{ currentTrack.name }}</p>
              <div class="overflow-hidden w-64">
                <p class="text-white/60 text-xs whitespace-nowrap">{{ artistNames }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Controles de reproducción -->
        <div class="flex flex-col items-center justify-center max-w-md w-full">
          <!-- Botones de control -->
          <div class="flex items-center justify-center mb-2">
            <button
              @click="prevTrack"
              class="mx-2 p-2 text-white/70 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!currentTrack"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2.5L13 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M2 8L10 2.5V13.5L2 8Z" fill="currentColor"/>
              </svg>
            </button>
            <button
              @click="togglePlay"
              class="mx-3 p-3 bg-white rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              :disabled="!currentTrack"
            >
              <svg v-if="!isPlaying" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 2.5L13 8L3 13.5V2.5Z" fill="black"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 2.5H6V13.5H3V2.5Z" fill="black"/>
                <path d="M10 2.5H13V13.5H10V2.5Z" fill="black"/>
              </svg>
            </button>
            <button
              @click="nextTrack"
              class="mx-2 p-2 text-white/70 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!currentTrack"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 2.5L3 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M14 8L6 2.5V13.5L14 8Z" fill="currentColor"/>
              </svg>
            </button>
          </div>

          <!-- Barra de progreso -->
          <div class="flex items-center w-full">
            <span class="text-white/60 text-xs mr-2 w-10 text-right">{{ formatTime(currentTime) }}</span>
            <div
              class="flex-1 relative h-3 cursor-pointer group"
              @mousedown="startProgressDrag"
              @mousemove="updateProgressDrag"
              @mouseup="endProgressDrag"
              @mouseleave="endProgressDrag"
            >
              <div class="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 rounded-full"></div>
              <div
                class="absolute top-1/2 -translate-y-1/2 h-1 bg-white group-hover:bg-green-500 rounded-full transition-colors"
                :style="{ width: `${progressPercentage}%` }"
              ></div>
              <div
                class="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full -ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                :style="{ left: `${progressPercentage}%` }"
              ></div>
            </div>
            <span class="text-white/60 text-xs ml-2 w-10">{{ formatTime(duration) }}</span>
          </div>
        </div>

        <!-- Controles adicionales -->
        <div class="flex items-center justify-end w-1/4">
          <div class="flex items-center">
            <button
              @click="toggleMute"
              class="mx-2 p-2 text-white/70 hover:text-white transition-colors"
            >
              <svg v-if="isMuted" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
            </button>
            <div
              class="w-24 h-1 bg-white/10 rounded-full relative group cursor-pointer"
              @mousedown="startVolumeDrag"
              @mousemove="updateVolumeDrag"
              @mouseup="endVolumeDrag"
              @mouseleave="endVolumeDrag"
            >
              <div
                class="h-full bg-white group-hover:bg-green-500 rounded-full transition-colors"
                :style="{ width: `${volume * 100}%` }"
              ></div>
              <div
                class="absolute h-3 w-3 bg-white rounded-full -top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                :style="{ left: `${volume * 100}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../store/playerStore'

const playerStore = usePlayerStore()

// Estado del reproductor
const currentTrack = computed(() => playerStore.currentTrack)
const isPlaying = computed(() => playerStore.isPlaying)
const currentTime = computed(() => playerStore.currentTime)
const duration = computed(() => playerStore.duration)
const volume = computed(() => playerStore.volume)
const isMuted = computed(() => playerStore.isMuted)

// Nombres de artistas
const artistNames = computed(() => {
  if (!currentTrack.value) return ''
  return currentTrack.value.artists.map(a => a.name).join(', ')
})

// Porcentaje de progreso
const progressPercentage = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

// Formatear tiempo
const formatTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Control de progreso
let isDraggingProgress = false
let progressDragStartX = 0
let progressDragStartTime = 0

const startProgressDrag = (e: MouseEvent) => {
  isDraggingProgress = true
  progressDragStartX = e.clientX
  progressDragStartTime = currentTime.value
}

const updateProgressDrag = (e: MouseEvent) => {
  if (!isDraggingProgress) return

  const progressBar = e.currentTarget as HTMLElement
  const rect = progressBar.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percentage = Math.max(0, Math.min(1, x / rect.width))
  const newTime = percentage * duration.value

  playerStore.setCurrentTime(newTime)
}

const endProgressDrag = () => {
  isDraggingProgress = false
}

// Control de volumen
let isDraggingVolume = false

const startVolumeDrag = (e: MouseEvent) => {
  isDraggingVolume = true
  updateVolumeDrag(e)
}

const updateVolumeDrag = (e: MouseEvent) => {
  if (!isDraggingVolume) return

  const volumeBar = e.currentTarget as HTMLElement
  const rect = volumeBar.getBoundingClientRect()
  const x = e.clientX - rect.left
  const newVolume = Math.max(0, Math.min(1, x / rect.width))

  playerStore.setVolume(newVolume)
}

const endVolumeDrag = () => {
  isDraggingVolume = false
}

// Acciones del reproductor
const togglePlay = () => {
  if (isPlaying.value) {
    playerStore.pause()
  } else {
    playerStore.resume()
  }
}

const prevTrack = () => {
  // Implementar lógica para canción anterior
}

const nextTrack = () => {
  // Implementar lógica para siguiente canción
}

const toggleMute = () => {
  playerStore.setMuted(!isMuted.value)
}

// Limpiar eventos al desmontar
onUnmounted(() => {
  isDraggingProgress = false
  isDraggingVolume = false
})
</script>

<style scoped>
@keyframes scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(-100% - 2rem));
  }
}

.needs-animation {
  animation: scroll 15s linear infinite;
  padding-right: 2rem;
}

.artist-link {
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: all 0.2s;
}

.artist-link:hover {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: underline;
}
</style>
