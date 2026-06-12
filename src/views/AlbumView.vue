<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Play } from '@lucide/vue'
import { useDeezerStore } from '@/store/deezerStore'
import { usePlayerStore } from '@/store/playerStore'
import TrackList from '@/components/TrackList.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const route = useRoute()
const deezerStore = useDeezerStore()
const playerStore = usePlayerStore()

const album = ref<any>(null)
const albumTracks = ref<any[]>([])
const artistAlbums = ref<any[]>([])
const isLoading = ref(true)
const error = ref('')

const tracksWithAlbum = computed(() => albumTracks.value.map((t) => ({ ...t, album: album.value })))

const playAll = () => {
  const list = tracksWithAlbum.value
  if (!list.length) return
  playerStore.playFromContext(list[0], { type: 'album', name: album.value?.name, tracks: list })
}

const loadAlbumData = async () => {
  try {
    isLoading.value = true
    error.value = ''
    const albumId = route.params.id as string
    album.value = null
    albumTracks.value = []
    artistAlbums.value = []

    const [albumData, tracksData] = await Promise.all([
      deezerStore.getAlbum(albumId),
      deezerStore.getAlbumTracks(albumId),
    ])
    album.value = albumData
    albumTracks.value = tracksData.items

    if (albumData.artists[0]?.id) {
      const artistAlbumsData = await deezerStore.getArtistAlbums(albumData.artists[0].id)
      artistAlbums.value = artistAlbumsData.items.filter((a: any) => a.id !== albumId)
    }
  } catch (err) {
    console.error('Error al cargar datos del álbum:', err)
    error.value = err instanceof Error ? err.message : 'Error al cargar el álbum'
  } finally {
    isLoading.value = false
  }
}

watch(() => route.params.id, loadAlbumData)
onMounted(loadAlbumData)
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
      <Button variant="outline" @click="loadAlbumData">Intentar de nuevo</Button>
    </div>

    <!-- Contenido -->
    <div v-else-if="album" class="space-y-10">
      <!-- Cabecera -->
      <header class="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
        <img
          :src="album.images[0]?.url || '/placeholder-album.jpg'"
          :alt="album.name"
          class="size-48 shrink-0 rounded-xl object-cover shadow-2xl shadow-black/50"
        />
        <div class="min-w-0 text-center sm:text-left">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Álbum</p>
          <h1 class="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">{{ album.name }}</h1>
          <div
            class="mt-3 flex flex-wrap items-center justify-center gap-x-2 text-sm text-muted-foreground sm:justify-start"
          >
            <RouterLink
              v-for="artist in album.artists"
              :key="artist.id"
              :to="`/artist/${artist.id}`"
              class="font-semibold text-foreground hover:text-primary hover:underline"
            >
              {{ artist.name }}
            </RouterLink>
            <span>•</span>
            <span>{{ album.total_tracks }} canciones</span>
            <span v-if="album.release_date"
              >• {{ new Date(album.release_date).getFullYear() }}</span
            >
          </div>
          <div class="mt-5 flex justify-center sm:justify-start">
            <Button class="gap-2 rounded-full px-6" @click="playAll">
              <Play class="size-4 translate-x-px" />
              Reproducir
            </Button>
          </div>
        </div>
      </header>

      <!-- Canciones -->
      <section v-if="albumTracks.length" class="rounded-xl border bg-card/40 p-2 sm:p-3">
        <TrackList
          :tracks="tracksWithAlbum"
          :start-index="0"
          :context="{ type: 'album', name: album.name, id: String(route.params.id) }"
        />
      </section>

      <!-- Más del artista -->
      <section v-if="artistAlbums.length">
        <h2 class="mb-5 text-2xl font-bold tracking-tight">Más de {{ album.artists[0]?.name }}</h2>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <RouterLink
            v-for="other in artistAlbums"
            :key="other.id"
            :to="`/album/${other.id}`"
            class="group rounded-xl border bg-card p-3 transition-all hover:bg-accent"
          >
            <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
              <img
                :src="other.images[0]?.url || '/placeholder-album.jpg'"
                :alt="other.name"
                class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <span
                class="absolute bottom-2 right-2 flex size-10 translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg shadow-primary/40 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
              >
                <Play class="size-5 translate-x-px" />
              </span>
            </div>
            <h3 class="truncate text-sm font-semibold group-hover:text-primary">
              {{ other.name }}
            </h3>
            <p class="truncate text-xs text-muted-foreground">
              {{ new Date(other.release_date).getFullYear() }} • {{ other.total_tracks }} canciones
            </p>
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>
