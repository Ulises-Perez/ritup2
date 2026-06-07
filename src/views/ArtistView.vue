<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
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

const artist = ref<any>(null)
const topTracks = ref<any[]>([])
const albums = ref<any[]>([])
const playlists = ref<any[]>([])
const isLoading = ref(true)
const error = ref('')

const playAll = () => {
  if (!topTracks.value.length) return
  playerStore.playFromContext(topTracks.value[0], {
    type: 'search',
    name: artist.value?.name,
    tracks: topTracks.value,
  })
}

const loadArtistData = async () => {
  try {
    isLoading.value = true
    error.value = ''
    const artistId = route.params.id as string
    artist.value = null
    topTracks.value = []
    albums.value = []
    playlists.value = []

    const artistData = await deezerStore.getArtist(artistId)
    if (!artistData) throw new Error('No se pudo cargar la información del artista')
    artist.value = artistData

    const [tracks, albumsData] = await Promise.all([
      deezerStore.getArtistTopTracks(artistId),
      deezerStore.getArtistAlbums(artistId),
    ])
    topTracks.value = tracks || []
    albums.value = albumsData?.items || []
  } catch (err) {
    console.error('Error al cargar datos del artista:', err)
    error.value = err instanceof Error ? err.message : 'Error al cargar el artista'
  } finally {
    isLoading.value = false
  }
}

watch(() => route.params.id, loadArtistData)
onMounted(loadArtistData)
</script>

<template>
  <div class="pb-32">
    <!-- Carga -->
    <div v-if="isLoading" class="space-y-8">
      <Skeleton class="h-72 w-full rounded-none" />
      <div class="mx-auto max-w-7xl space-y-2 px-6">
        <Skeleton v-for="i in 6" :key="i" class="h-14 w-full rounded-lg" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <p class="text-sm text-destructive">{{ error }}</p>
      <Button variant="outline" @click="loadArtistData">Intentar de nuevo</Button>
    </div>

    <!-- Contenido -->
    <div v-else-if="artist">
      <!-- Hero -->
      <div class="relative h-72 w-full sm:h-80">
        <img
          :src="artist?.images?.[0]?.url || '/placeholder-artist.jpg'"
          :alt="artist?.name"
          class="size-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent"></div>
        <div class="absolute bottom-0 left-0 w-full px-6 pb-6">
          <div class="mx-auto max-w-7xl">
            <h1 class="text-5xl font-bold tracking-tight sm:text-6xl">{{ artist?.name }}</h1>
            <p class="mt-2 text-sm text-muted-foreground">
              {{ new Intl.NumberFormat('es-ES').format(artist?.followers?.total || 0) }} seguidores
            </p>
          </div>
        </div>
      </div>

      <div class="mx-auto max-w-7xl space-y-10 px-6 pt-6">
        <Button v-if="topTracks.length" class="gap-2 rounded-full px-6" @click="playAll">
          <Play class="size-4 translate-x-px" />
          Reproducir
        </Button>

        <!-- Populares -->
        <section v-if="topTracks.length">
          <h2 class="mb-5 text-2xl font-bold tracking-tight">Canciones populares</h2>
          <div class="rounded-xl border bg-card/40 p-2 sm:p-3">
            <TrackList :tracks="topTracks" :start-index="0" />
          </div>
        </section>

        <!-- Discografía -->
        <section v-if="albums.length">
          <h2 class="mb-5 text-2xl font-bold tracking-tight">Discografía</h2>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <RouterLink
              v-for="album in albums"
              :key="album.id"
              :to="`/album/${album.id}`"
              class="group rounded-xl border bg-card p-3 transition-all hover:bg-accent"
            >
              <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
                <img
                  :src="album.images[0]?.url || '/placeholder-album.jpg'"
                  :alt="album.name"
                  class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <span
                  class="absolute bottom-2 right-2 flex size-10 translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg shadow-primary/40 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                >
                  <Play class="size-5 translate-x-px" />
                </span>
              </div>
              <h3 class="truncate text-sm font-semibold group-hover:text-primary">{{ album.name }}</h3>
              <p class="truncate text-xs text-muted-foreground">
                {{ new Date(album.release_date).getFullYear() }} • {{ album.total_tracks }} canciones
              </p>
            </RouterLink>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
