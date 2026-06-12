<script setup lang="ts">
import { computed, ref } from 'vue'
import { Sparkles, Play, Plus } from '@lucide/vue'
import { usePlayerStore } from '@/store/playerStore'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Más del artista',
})

const playerStore = usePlayerStore()

const showMore = ref(false)
const maxInitialTracks = 8

// La carga de similares vive en el store (playerStore.loadSimilarForCurrent),
// para que la radio anticipada funcione aunque este panel no esté montado.
const tracks = computed(() => playerStore.similarTracks || [])
const isLoading = computed(() => playerStore.similarLoading)
const loadingMessage = computed(() =>
  playerStore.currentTrack ? 'No se encontraron canciones del artista' : 'Buscando canciones...',
)
const autoplay = computed(() => playerStore.autoplay)

const displayTracks = computed(() => {
  if (!showMore.value && tracks.value?.length > maxInitialTracks) {
    return tracks.value.slice(0, maxInitialTracks)
  }
  return tracks.value
})

const hasMoreTracks = computed(() => (tracks.value?.length || 0) > maxInitialTracks)
const remainingTracksCount = computed(() =>
  Math.max(0, (tracks.value?.length || 0) - maxInitialTracks),
)

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
  album: { images: Array<{ url: string }>; name?: string }
  artists: Array<{ id?: string; name: string }>
  youtube_id?: string
}

const handleTrackClick = (track: Track) => {
  playerStore.playFromContext(track, {
    type: 'similar' as const,
    name: 'Más del artista',
    tracks: tracks.value,
  })
}

const addToQueue = (track: Track) => playerStore.addToQueue(track)
const setAutoplay = (val: boolean) => playerStore.setAutoplay(val)
</script>

<template>
  <div class="px-2">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="flex items-center gap-2 text-sm font-semibold">
        <Sparkles class="size-4 text-primary" />
        {{ title }}
      </h3>
      <label class="flex items-center gap-2 text-xs text-muted-foreground">
        Autoplay
        <Switch :model-value="autoplay" @update:model-value="setAutoplay" />
      </label>
    </div>

    <!-- Carga -->
    <div v-if="isLoading" class="space-y-1">
      <div v-for="i in 4" :key="i" class="flex items-center gap-3 p-2">
        <Skeleton class="size-10 rounded-md" />
        <div class="flex-1 space-y-1.5">
          <Skeleton class="h-3.5 w-3/4" />
          <Skeleton class="h-3 w-1/2" />
        </div>
      </div>
    </div>

    <!-- Lista -->
    <div v-else-if="tracks?.length" class="space-y-0.5">
      <div
        v-for="track in displayTracks"
        :key="track.id"
        class="group flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
        @click="handleTrackClick(track)"
      >
        <div class="relative size-10 shrink-0 overflow-hidden rounded-md">
          <img
            :src="track.album?.images?.[0]?.url || '/placeholder-album.jpg'"
            :alt="track.name"
            class="size-full object-cover"
            loading="lazy"
          />
          <span
            class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Play class="size-4 translate-x-px text-white" />
          </span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium group-hover:text-primary">{{ track.name }}</p>
          <p class="truncate text-xs text-muted-foreground">
            {{ track.artists?.map((a) => a.name).join(', ') }}
          </p>
        </div>
        <span class="text-xs tabular-nums text-muted-foreground">
          {{ formatDuration(track.duration_ms) }}
        </span>
        <button
          class="text-muted-foreground opacity-0 transition-all hover:text-primary group-hover:opacity-100"
          title="Añadir a la cola"
          @click.stop="addToQueue(track)"
        >
          <Plus class="size-4" />
        </button>
      </div>

      <button
        v-if="hasMoreTracks"
        class="w-full py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        @click="showMore = !showMore"
      >
        {{ showMore ? 'Mostrar menos' : `Ver ${remainingTracksCount} más` }}
      </button>
    </div>

    <!-- Vacío -->
    <p v-else class="py-6 text-center text-xs text-muted-foreground">{{ loadingMessage }}</p>
  </div>
</template>
