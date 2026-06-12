<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Check, Plus } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useLibraryStore } from '@/store/libraryStore'
import { useShell } from '@/composables/useShell'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const props = defineProps<{
  track: any
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
}>()

const libraryStore = useLibraryStore()
const { playlists } = storeToRefs(libraryStore)
const { openCreatePlaylist } = useShell()

// "Me gusta" se gestiona con el corazón de cada canción, no desde este menú.
const targets = computed(() => playlists.value.filter((p) => p.kind !== 'liked'))

const hasTrack = (playlistId: string) =>
  props.track ? libraryStore.hasTrack(playlistId, props.track.id) : false

const add = (playlistId: string) => {
  if (!props.track) return
  const pl = playlists.value.find((p) => p.id === playlistId)
  libraryStore.addTrack(playlistId, props.track)
  toast.success(`Añadida a «${pl?.name ?? 'playlist'}»`)
}

const addToNew = () => {
  if (!props.track) return
  openCreatePlaylist(props.track)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <slot />
    </DropdownMenuTrigger>
    <DropdownMenuContent :align="align ?? 'end'" :side="side ?? 'bottom'" class="w-60">
      <DropdownMenuLabel class="text-muted-foreground text-xs">Añadir a playlist</DropdownMenuLabel>
      <DropdownMenuItem class="gap-2" @click="addToNew">
        <Plus class="size-4 text-primary" />
        Nueva playlist
      </DropdownMenuItem>
      <DropdownMenuSeparator v-if="targets.length" />
      <div class="max-h-56 overflow-y-auto">
        <DropdownMenuItem v-for="pl in targets" :key="pl.id" class="gap-2" @click="add(pl.id)">
          <span class="truncate">{{ pl.name }}</span>
          <Check v-if="hasTrack(pl.id)" class="ml-auto size-4 text-primary" />
        </DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
