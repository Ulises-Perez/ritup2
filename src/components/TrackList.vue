<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Play, Plus } from '@lucide/vue'
import { usePlayerStore } from '@/store/playerStore'
import { Button } from '@/components/ui/button'
import AddToPlaylistMenu from '@/components/AddToPlaylistMenu.vue'

const playerStore = usePlayerStore()

const props = withDefaults(
  defineProps<{
    tracks: any[]
    startIndex?: number
  }>(),
  { startIndex: 0 },
)

const currentTrackId = computed(() => playerStore.currentTrack?.id)

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const playTrack = (track: any) => {
  playerStore.playFromContext(track, { type: 'search', tracks: props.tracks })
}
</script>

<template>
  <div class="space-y-0.5">
    <div
      v-for="(track, index) in tracks"
      :key="track.id"
      class="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
      :class="track.id === currentTrackId ? 'bg-accent/60' : ''"
      @click="playTrack(track)"
    >
      <!-- Número / play -->
      <div class="flex w-7 shrink-0 items-center justify-center">
        <span
          class="text-sm tabular-nums text-muted-foreground group-hover:hidden"
          :class="track.id === currentTrackId ? 'text-primary' : ''"
        >
          {{ (startIndex || 0) + index + 1 }}
        </span>
        <Play class="hidden size-4 translate-x-px text-primary group-hover:block" />
      </div>

      <img
        :src="track.album?.images?.[0]?.url || '/placeholder-album.jpg'"
        :alt="track.album?.name"
        class="size-10 shrink-0 rounded-md object-cover"
        loading="lazy"
      />

      <div class="min-w-0 flex-1">
        <p
          class="truncate text-sm font-medium"
          :class="track.id === currentTrackId ? 'text-primary' : 'group-hover:text-primary'"
        >
          {{ track.name }}
        </p>
        <div class="flex items-center truncate text-xs text-muted-foreground">
          <template v-for="(artist, i) in track.artists" :key="artist.id ?? i">
            <RouterLink
              v-if="artist.id"
              :to="`/artist/${artist.id}`"
              class="truncate hover:text-foreground hover:underline"
              @click.stop
            >
              {{ artist.name }}
            </RouterLink>
            <span v-else class="truncate">{{ artist.name }}</span>
            <span v-if="i < track.artists.length - 1" class="mr-1">,</span>
          </template>
        </div>
      </div>

      <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
        {{ formatDuration(track.duration_ms) }}
      </span>

      <AddToPlaylistMenu :track="track">
        <Button
          variant="ghost"
          size="icon-sm"
          class="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
          title="Añadir a playlist"
          @click.stop
        >
          <Plus class="size-4" />
        </Button>
      </AddToPlaylistMenu>
    </div>
  </div>
</template>
