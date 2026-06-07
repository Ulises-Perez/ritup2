<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Play, ListMusic, Plus, Check } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useDeezerStore } from '@/store/deezerStore'
import { useLibraryStore } from '@/store/libraryStore'
import { usePlayerStore } from '@/store/playerStore'
import TrackList from '@/components/TrackList.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const route = useRoute()
const deezerStore = useDeezerStore()
const libraryStore = useLibraryStore()
const playerStore = usePlayerStore()

const playlist = ref<any>(null)
const tracks = ref<any[]>([])
const isLoading = ref(true)
const error = ref('')

const isLocal = () => route.name === 'library-playlist'

const flatTracks = computed(() => tracks.value.map((item) => item.track))

const playAll = () => {
  const list = flatTracks.value
  if (!list.length) return
  playerStore.playFromContext(list[0], {
    type: 'playlist',
    name: playlist.value?.name,
    tracks: list,
  })
}

// ¿Esta playlist de Deezer ya está guardada en la biblioteca local?
const imported = computed(() => !isLocal() && libraryStore.hasImported(route.params.id as string))

// Guarda la playlist de Deezer en "tus playlists" copiando todos sus tracks.
const saveToLibrary = () => {
  if (!playlist.value || !flatTracks.value.length) return
  libraryStore.importPlaylist(playlist.value.name, flatTracks.value, route.params.id as string)
  toast.success(`«${playlist.value.name}» añadida a tus playlists`)
}

const loadPlaylistData = async () => {
  try {
    isLoading.value = true
    error.value = ''
    const playlistId = route.params.id as string
    playlist.value = null
    tracks.value = []

    if (isLocal()) {
      const data = libraryStore.getPlaylist(playlistId)
      if (!data) throw new Error('No se encontró la playlist')
      playlist.value = data
      tracks.value = libraryStore.getPlaylistTracks(playlistId).items
    } else {
      const [playlistData, tracksData] = await Promise.all([
        deezerStore.getPlaylist(playlistId),
        deezerStore.getPlaylistTracks(playlistId),
      ])
      tracks.value = tracksData.items
      // Portada = la de la primera canción con imagen, no la carátula-mosaico
      // que devuelve Deezer para la playlist.
      const firstCover = tracksData.items.find((it: any) => it?.track?.album?.images?.[0]?.url)
        ?.track?.album?.images?.[0]?.url
      playlist.value = firstCover
        ? { ...playlistData, images: [{ url: firstCover }] }
        : playlistData
    }
  } catch (err) {
    console.error('Error al cargar datos de la playlist:', err)
    error.value = err instanceof Error ? err.message : 'Error al cargar la playlist'
  } finally {
    isLoading.value = false
  }
}

watch(() => [route.params.id, route.name], loadPlaylistData)
onMounted(loadPlaylistData)
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-8 pb-32">
    <!-- Carga -->
    <div v-if="isLoading" class="space-y-8">
      <div class="flex items-end gap-6">
        <Skeleton class="size-48 rounded-xl" />
        <div class="space-y-3 pb-2">
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-12 w-80" />
          <Skeleton class="h-4 w-48" />
        </div>
      </div>
      <div class="space-y-2">
        <Skeleton v-for="i in 8" :key="i" class="h-14 w-full rounded-lg" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <p class="text-sm text-destructive">{{ error }}</p>
      <Button variant="outline" @click="loadPlaylistData">Intentar de nuevo</Button>
    </div>

    <!-- Contenido -->
    <div v-else-if="playlist" class="space-y-10">
      <!-- Cabecera -->
      <header class="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
        <div
          class="flex size-48 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted shadow-2xl shadow-black/50"
        >
          <img
            v-if="playlist.images[0]?.url"
            :src="playlist.images[0].url"
            :alt="playlist.name"
            class="size-full object-cover"
          />
          <ListMusic v-else class="size-16 text-muted-foreground" />
        </div>
        <div class="min-w-0 text-center sm:text-left">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Playlist
          </p>
          <h1 class="mt-1 truncate text-4xl font-bold tracking-tight sm:text-5xl">
            {{ playlist.name }}
          </h1>
          <p class="mt-3 text-sm text-muted-foreground">
            <span class="font-semibold text-foreground">{{ playlist.owner.display_name }}</span>
            • {{ playlist.tracks.total }} canciones
          </p>
          <div class="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
            <Button class="gap-2 rounded-full px-6" :disabled="!flatTracks.length" @click="playAll">
              <Play class="size-4 translate-x-px" />
              Reproducir
            </Button>
            <Button
              v-if="!isLocal()"
              variant="outline"
              class="gap-2 rounded-full px-6"
              :disabled="imported || !flatTracks.length"
              @click="saveToLibrary"
            >
              <Check v-if="imported" class="size-4" />
              <Plus v-else class="size-4" />
              {{ imported ? 'En tu biblioteca' : 'Añadir a tus playlists' }}
            </Button>
          </div>
        </div>
      </header>

      <!-- Canciones -->
      <section v-if="flatTracks.length" class="rounded-xl border bg-card/40 p-2 sm:p-3">
        <TrackList :tracks="flatTracks" :start-index="0" />
      </section>
      <div
        v-else
        class="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground"
      >
        Esta playlist aún no tiene canciones.
      </div>
    </div>
  </div>
</template>
