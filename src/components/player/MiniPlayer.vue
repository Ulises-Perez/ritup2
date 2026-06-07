<script setup lang="ts">
defineOptions({ name: 'MiniPlayer' })

import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Volume2,
  Volume1,
  VolumeX,
  ChevronUp,
  Minus,
  Plus,
  MoreHorizontal,
  Disc3,
  Radio,
  Maximize2,
} from '@lucide/vue'
import { usePlayerStore } from '@/store/playerStore'
import { useApiStore } from '@/store/apiStore'
import { usePlayerControls } from '@/composables/usePlayerControls'
import { useShell } from '@/composables/useShell'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const playerStore = usePlayerStore()
const apiStore = useApiStore()
const router = useRouter()
const { openQueue, expandPlayer, sidebarExpanded } = useShell()

const {
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  autoplay,
  shuffle,
  repeat,
  artistNames,
  albumLink,
  repeatTitle,
  formatTime,
  togglePlay,
  prevTrack,
  nextTrack,
  toggleMute,
  toggleAutoplay,
  toggleShuffle,
  cycleRepeat,
  seekToMs,
  setVolumePct,
  seekBy,
  changeVolume,
} = usePlayerControls()

// Subtítulo estilo Apple Music: «Artista — Álbum».
const albumName = computed(
  () => (currentTrack.value?.album as { name?: string } | undefined)?.name ?? '',
)
const subtitle = computed(() =>
  albumName.value ? `${artistNames.value} — ${albumName.value}` : artistNames.value,
)

// --- Barra de progreso (seek con Slider) ---
const seeking = ref(false)
const seekValue = ref(0)
const sliderValue = computed(() => [seeking.value ? seekValue.value : currentTime.value])
const sliderMax = computed(() => Math.max(duration.value || 0, 1))

const onSeekInput = (val: number[] | undefined) => {
  if (!val) return
  seeking.value = true
  seekValue.value = val[0]
}
const onSeekCommit = (val: number[] | undefined) => {
  if (val) seekToMs(val[0])
  seeking.value = false
}

// --- Volumen ---
const volumeValue = computed(() => [(isMuted.value ? 0 : volume.value) * 100])
const onVolumeInput = (val: number[] | undefined) => {
  if (val) setVolumePct(val[0])
}

const goToAlbum = () => {
  if (albumLink.value) router.push(albumLink.value)
}

// --- Atajos de teclado (portados de Player.vue) ---
const onKeydown = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement | null
  if (
    target &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  ) {
    return
  }
  if (e.key === ' ' && target && (target.tagName === 'BUTTON' || target.tagName === 'A')) return

  switch (e.key) {
    case ' ':
      e.preventDefault()
      togglePlay()
      break
    case 'ArrowRight':
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) nextTrack()
      else seekBy(5000)
      break
    case 'ArrowLeft':
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) prevTrack()
      else seekBy(-5000)
      break
    case 'ArrowUp':
      e.preventDefault()
      changeVolume(0.05)
      break
    case 'ArrowDown':
      e.preventDefault()
      changeVolume(-0.05)
      break
    case 'm':
    case 'M':
      toggleMute()
      break
    case 's':
    case 'S':
      toggleShuffle()
      break
    case 'r':
    case 'R':
      cycleRepeat()
      break
  }
}

// --- Inicialización del backend (dueño ÚNICO) ---
onMounted(async () => {
  apiStore.initActivePlayer()
  window.addEventListener('keydown', onKeydown)

  const waitForReady = async () => {
    let attempts = 0
    const maxAttempts = 100
    while (!apiStore.currentStore.isReady && attempts < maxAttempts) {
      await new Promise((res) => setTimeout(res, 50))
      attempts++
    }
    if (playerStore.currentTime > 0) {
      await nextTick()
      playerStore.setCurrentTime(playerStore.currentTime)
    }
    if (playerStore.volume !== undefined) {
      await nextTick()
      playerStore.setVolume(playerStore.volume)
    }
  }
  waitForReady()
})

watch(
  () => currentTrack.value,
  async (newTrack, oldTrack) => {
    if (newTrack && (!oldTrack || newTrack.id !== oldTrack.id)) {
      const trackYouTubeId = newTrack.youtube_id
      const loadedYouTubeId = apiStore.currentStore.currentYouTubeId
      if (!loadedYouTubeId || trackYouTubeId !== loadedYouTubeId) {
        // El watch solo se dispara al cambiar a una canción DISTINTA, así que
        // siempre empieza desde 0 (no heredar la posición de la canción anterior).
        await apiStore.playTrack(newTrack, {
          autoplay: isPlaying.value,
          startTimeMs: 0,
        })
      }
    }
  },
)

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  apiStore.cleanup()
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-6 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-6 opacity-0"
  >
    <div
      v-if="currentTrack"
      class="fixed bottom-4 z-40 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 transition-[left] duration-300 ease-in-out"
      :class="sidebarExpanded ? 'left-[calc(50%+8rem)]' : 'left-[calc(50%+2.25rem)]'"
    >
      <div
        class="rounded-2xl border bg-card/85 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl"
      >
        <div class="flex items-center gap-2">
          <!-- ░░ Controles de reproducción (izquierda) ░░ -->
          <div class="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              class="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
              :class="shuffle && 'text-primary hover:text-primary'"
              title="Aleatorio"
              aria-label="Aleatorio"
              :aria-pressed="shuffle"
              @click="toggleShuffle"
            >
              <Shuffle class="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Anterior"
              aria-label="Anterior"
              @click="prevTrack"
            >
              <SkipBack class="size-5 fill-current" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              :title="isPlaying ? 'Pausar' : 'Reproducir'"
              :aria-label="isPlaying ? 'Pausar' : 'Reproducir'"
              @click="togglePlay"
            >
              <Pause v-if="isPlaying" class="size-6 fill-current" />
              <Play v-else class="size-6 translate-x-px fill-current" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Siguiente"
              aria-label="Siguiente"
              @click="nextTrack"
            >
              <SkipForward class="size-5 fill-current" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              class="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
              :class="repeat !== 'off' && 'text-primary hover:text-primary'"
              :title="repeatTitle"
              aria-label="Repetir"
              :aria-pressed="repeat !== 'off'"
              @click="cycleRepeat"
            >
              <Repeat1 v-if="repeat === 'one'" class="size-4" />
              <Repeat v-else class="size-4" />
            </Button>
          </div>

          <!-- ░░ Carátula + info (centro) ░░ -->
          <div class="flex min-w-0 flex-1 items-center gap-2.5 px-1">
            <button
              class="group relative size-10 shrink-0 overflow-hidden rounded-md ring-1 ring-white/10"
              title="Abrir reproductor"
              @click="expandPlayer"
            >
              <img
                :src="currentTrack.album.images[0]?.url || '/placeholder-album.jpg'"
                :alt="currentTrack.name"
                class="size-full object-cover"
                loading="lazy"
              />
              <span
                class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <ChevronUp class="size-4 text-white" />
              </span>
            </button>

            <div class="min-w-0 flex-1 text-center sm:text-left">
              <component
                :is="albumLink ? RouterLink : 'span'"
                :to="albumLink || undefined"
                class="block truncate text-sm font-semibold leading-tight hover:underline"
              >
                {{ currentTrack.name }}
              </component>
              <p class="truncate text-xs leading-tight text-muted-foreground">{{ subtitle }}</p>
            </div>
          </div>

          <!-- ░░ Acciones (derecha) ░░ -->
          <div class="flex shrink-0 items-center gap-0.5">
            <!-- Más opciones -->
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="text-muted-foreground hover:text-foreground"
                  title="Más opciones"
                  aria-label="Más opciones"
                >
                  <MoreHorizontal class="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" :side-offset="8" class="w-52">
                <DropdownMenuItem class="gap-2" @click="expandPlayer">
                  <Maximize2 class="size-4" />
                  Reproduciendo ahora
                </DropdownMenuItem>
                <DropdownMenuItem v-if="albumLink" class="gap-2" @click="goToAlbum">
                  <Disc3 class="size-4" />
                  Ir al álbum
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem class="gap-2" @click="toggleAutoplay">
                  <Radio class="size-4" :class="autoplay && 'text-primary'" />
                  Autoplay
                  <span
                    class="ml-auto text-xs"
                    :class="autoplay ? 'text-primary' : 'text-muted-foreground'"
                  >
                    {{ autoplay ? 'On' : 'Off' }}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <!-- Cola -->
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-muted-foreground hover:text-foreground"
              title="Cola de reproducción"
              aria-label="Cola de reproducción"
              @click="openQueue"
            >
              <ListMusic class="size-5" />
            </Button>

            <!-- Volumen -->
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
                  title="Volumen"
                  aria-label="Volumen"
                >
                  <VolumeX v-if="isMuted || volume === 0" class="size-5" />
                  <Volume1 v-else-if="volume < 0.5" class="size-5" />
                  <Volume2 v-else class="size-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent class="flex w-64 items-center gap-1 p-2" :side-offset="12">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  :title="isMuted ? 'Activar sonido' : 'Silenciar'"
                  :aria-label="isMuted ? 'Activar sonido' : 'Silenciar'"
                  :aria-pressed="isMuted"
                  @click="toggleMute"
                >
                  <VolumeX v-if="isMuted || volume === 0" class="size-4" />
                  <Volume2 v-else class="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Bajar volumen"
                  aria-label="Bajar volumen"
                  @click="changeVolume(-0.1)"
                >
                  <Minus class="size-4" />
                </Button>
                <Slider
                  :model-value="volumeValue"
                  :max="100"
                  :step="1"
                  class="flex-1"
                  aria-label="Volumen"
                  @update:model-value="onVolumeInput"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Subir volumen"
                  aria-label="Subir volumen"
                  @click="changeVolume(0.1)"
                >
                  <Plus class="size-4" />
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <!-- ░░ Progreso ░░ -->
        <div class="mt-1.5 flex items-center gap-2">
          <span class="w-9 text-right text-[10px] tabular-nums text-muted-foreground">
            {{ formatTime(currentTime) }}
          </span>
          <Slider
            :model-value="sliderValue"
            :max="sliderMax"
            :step="1000"
            class="flex-1"
            aria-label="Progreso de la canción"
            @update:model-value="onSeekInput"
            @value-commit="onSeekCommit"
          />
          <span class="w-9 text-[10px] tabular-nums text-muted-foreground">
            {{ formatTime(duration) }}
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>
