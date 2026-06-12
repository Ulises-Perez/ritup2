<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Play, Plus, Heart } from '@lucide/vue'
import { usePlayerStore } from '@/store/playerStore'
import { useLibraryStore } from '@/store/libraryStore'
import { Button } from '@/components/ui/button'
import AddToPlaylistMenu from '@/components/AddToPlaylistMenu.vue'

const playerStore = usePlayerStore()
const libraryStore = useLibraryStore()

const props = withDefaults(
  defineProps<{
    tracks: any[]
    startIndex?: number
    // 'list' = fila compacta (por defecto). 'table' = con cabecera y columna de álbum.
    variant?: 'list' | 'table'
    // Contexto de reproducción de esta lista. Determina cómo continúa la cola al
    // agotarse (p. ej. 'playlist'/'album' → radio de género). Por defecto 'search'.
    context?: { type?: 'playlist' | 'album' | 'search' | 'similar'; name?: string; id?: string }
  }>(),
  { startIndex: 0, variant: 'list', context: undefined },
)

const currentTrackId = computed(() => playerStore.currentTrack?.id)
const isTable = computed(() => props.variant === 'table')

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const playTrack = (track: any) => {
  playerStore.playFromContext(track, {
    type: props.context?.type ?? 'search',
    name: props.context?.name,
    id: props.context?.id,
    tracks: props.tracks,
  })
}
</script>

<template>
  <div class="space-y-0.5">
    <!-- Cabecera (solo variante tabla) -->
    <div
      v-if="isTable"
      class="grid grid-cols-[1.75rem_1fr_auto] items-center gap-3 border-b px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid-cols-[1.75rem_1fr_1fr_auto]"
    >
      <span class="text-center">#</span>
      <span>Título</span>
      <span class="hidden md:block">Álbum</span>
      <span class="pr-9 text-right">Dur.</span>
    </div>

    <div
      v-for="(track, index) in tracks"
      :key="track.id"
      class="group grid cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
      :class="[
        isTable
          ? 'grid-cols-[1.75rem_1fr_auto] md:grid-cols-[1.75rem_1fr_1fr_auto]'
          : 'grid-cols-[1.75rem_1fr_auto]',
        track.id === currentTrackId ? 'bg-accent/60' : '',
      ]"
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

      <!-- Título (imagen + nombre + artistas) -->
      <div class="flex min-w-0 items-center gap-3">
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
      </div>

      <!-- Álbum (solo variante tabla, desde md) -->
      <div v-if="isTable" class="hidden min-w-0 md:block">
        <RouterLink
          v-if="track.album?.id"
          :to="`/album/${track.album.id}`"
          class="truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
          @click.stop
        >
          {{ track.album?.name }}
        </RouterLink>
        <span v-else class="truncate text-xs text-muted-foreground">{{ track.album?.name }}</span>
      </div>

      <!-- Acciones: me gusta + añadir a playlist + duración -->
      <div class="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          class="shrink-0 transition-opacity"
          :class="
            libraryStore.isLiked(track.id)
              ? 'text-primary opacity-100'
              : 'text-muted-foreground opacity-0 hover:text-primary group-hover:opacity-100'
          "
          :title="libraryStore.isLiked(track.id) ? 'Quitar de Me gusta' : 'Añadir a Me gusta'"
          @click.stop="libraryStore.toggleLike(track)"
        >
          <Heart class="size-4" :class="libraryStore.isLiked(track.id) ? 'fill-current' : ''" />
        </Button>

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

        <span class="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {{ formatDuration(track.duration_ms) }}
        </span>
      </div>
    </div>
  </div>
</template>
