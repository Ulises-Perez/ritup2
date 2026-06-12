<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Play, Shuffle, Radio, Share2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
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
const related = ref<any[]>([])
const appearsOn = ref<any[]>([])
const isLoading = ref(true)
const error = ref('')
const showAllTracks = ref(false)
const radioLoading = ref(false)

// Discografía separada por tipo (Deezer marca record_type).
const fullAlbums = computed(() => albums.value.filter((a) => a.album_type === 'album'))
const singlesEps = computed(() =>
  albums.value.filter((a) => a.album_type === 'single' || a.album_type === 'ep'),
)

const visibleTracks = computed(() =>
  showAllTracks.value ? topTracks.value : topTracks.value.slice(0, 5),
)

const fans = computed(() =>
  new Intl.NumberFormat('es-ES').format(artist.value?.followers?.total || 0),
)

const year = (date: string) => {
  const y = date ? new Date(date).getFullYear() : NaN
  return Number.isNaN(y) ? '' : y
}

const albumTypeLabel = (type: string) =>
  type === 'single' ? 'Sencillo' : type === 'ep' ? 'EP' : 'Álbum'

const playAll = () => {
  if (!topTracks.value.length) return
  playerStore.playFromContext(topTracks.value[0], {
    type: 'search',
    name: artist.value?.name,
    tracks: topTracks.value,
  })
}

const playShuffle = () => {
  if (!topTracks.value.length) return
  if (!playerStore.shuffle) playerStore.toggleShuffle()
  const start = topTracks.value[Math.floor(Math.random() * topTracks.value.length)]
  playerStore.playFromContext(start, {
    type: 'search',
    name: artist.value?.name,
    tracks: topTracks.value,
  })
}

const playRadio = async () => {
  if (radioLoading.value) return
  radioLoading.value = true
  try {
    const tracks = await deezerStore.getSimilarSongs(route.params.id as string)
    if (!tracks.length) {
      toast.error('No se pudo generar la radio de este artista')
      return
    }
    playerStore.playFromContext(tracks[0], {
      type: 'similar',
      name: `Radio de ${artist.value?.name}`,
      tracks,
    })
  } catch {
    toast.error('No se pudo generar la radio de este artista')
  } finally {
    radioLoading.value = false
  }
}

const share = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast.success('Enlace copiado al portapapeles')
  } catch {
    toast.error('No se pudo copiar el enlace')
  }
}

const loadArtistData = async () => {
  try {
    isLoading.value = true
    error.value = ''
    showAllTracks.value = false
    const artistId = route.params.id as string
    artist.value = null
    topTracks.value = []
    albums.value = []
    related.value = []
    appearsOn.value = []

    const artistData = await deezerStore.getArtist(artistId)
    if (!artistData) throw new Error('No se pudo cargar la información del artista')
    artist.value = artistData

    const [tracks, albumsData, relatedData, playlistsData] = await Promise.all([
      deezerStore.getArtistTopTracks(artistId),
      deezerStore.getArtistAlbums(artistId),
      deezerStore.getRelatedArtists(artistId).catch(() => []),
      deezerStore.getArtistPlaylists(artistData.name).catch(() => []),
    ])
    topTracks.value = tracks || []
    albums.value = albumsData?.items || []
    related.value = relatedData || []
    appearsOn.value = playlistsData || []
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
      <Skeleton class="h-80 w-full rounded-none" />
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
      <div class="relative h-80 w-full sm:h-[26rem]">
        <img
          :src="artist?.images?.[0]?.url || '/placeholder-artist.jpg'"
          :alt="artist?.name"
          class="size-full object-cover object-top"
        />
        <!-- Fade hacia el fondo (se conserva el degradado de la foto) -->
        <div
          class="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10"
        ></div>
        <div class="absolute bottom-0 left-0 w-full px-6 pb-8">
          <div class="mx-auto max-w-7xl">
            <p
              class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              <span
                class="flex size-5 items-center justify-center rounded-full bg-primary/20 text-primary"
              >
                <Play class="size-3 translate-x-px" />
              </span>
              Artista
            </p>
            <h1 class="text-5xl font-bold tracking-tight drop-shadow-sm sm:text-7xl">
              {{ artist?.name }}
            </h1>
            <p class="mt-3 text-sm text-muted-foreground">{{ fans }} fans</p>
          </div>
        </div>
      </div>

      <div class="mx-auto max-w-7xl space-y-12 px-6 pt-6">
        <!-- Barra de acciones -->
        <div class="flex flex-wrap items-center gap-3">
          <Button
            class="gap-2 rounded-full px-7 py-6 text-base"
            :disabled="!topTracks.length"
            @click="playAll"
          >
            <Play class="size-5 translate-x-px" />
            Reproducir
          </Button>
          <Button
            variant="outline"
            class="gap-2 rounded-full"
            :disabled="!topTracks.length"
            @click="playShuffle"
          >
            <Shuffle class="size-4" />
            Aleatorio
          </Button>
          <Button
            variant="outline"
            class="gap-2 rounded-full"
            :disabled="radioLoading"
            @click="playRadio"
          >
            <Radio class="size-4" />
            Radio de artista
          </Button>
          <Button variant="ghost" size="icon" class="rounded-full" title="Compartir" @click="share">
            <Share2 class="size-5" />
          </Button>
        </div>

        <!-- Canciones populares -->
        <section v-if="topTracks.length">
          <h2 class="mb-5 text-2xl font-bold tracking-tight">Populares</h2>
          <div class="rounded-xl border bg-card/40 p-2 sm:p-3">
            <TrackList :tracks="visibleTracks" :start-index="0" variant="table" />
          </div>
          <Button
            v-if="topTracks.length > 5"
            variant="ghost"
            size="sm"
            class="mt-3 text-muted-foreground"
            @click="showAllTracks = !showAllTracks"
          >
            {{ showAllTracks ? 'Mostrar menos' : 'Ver más' }}
          </Button>
        </section>

        <!-- Álbumes -->
        <section v-if="fullAlbums.length">
          <h2 class="mb-5 text-2xl font-bold tracking-tight">Álbumes</h2>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <RouterLink
              v-for="album in fullAlbums"
              :key="album.id"
              :to="`/album/${album.id}`"
              class="group rounded-xl border bg-card p-3 transition-all hover:bg-accent hover:shadow-lg hover:shadow-black/30"
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
              <h3 class="truncate text-sm font-semibold group-hover:text-primary">
                {{ album.name }}
              </h3>
              <p class="truncate text-xs text-muted-foreground">
                {{ year(album.release_date) }} • Álbum
              </p>
            </RouterLink>
          </div>
        </section>

        <!-- Sencillos y EPs -->
        <section v-if="singlesEps.length">
          <h2 class="mb-5 text-2xl font-bold tracking-tight">Sencillos y EPs</h2>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <RouterLink
              v-for="album in singlesEps"
              :key="album.id"
              :to="`/album/${album.id}`"
              class="group rounded-xl border bg-card p-3 transition-all hover:bg-accent hover:shadow-lg hover:shadow-black/30"
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
              <h3 class="truncate text-sm font-semibold group-hover:text-primary">
                {{ album.name }}
              </h3>
              <p class="truncate text-xs text-muted-foreground">
                {{ year(album.release_date) }} • {{ albumTypeLabel(album.album_type) }}
              </p>
            </RouterLink>
          </div>
        </section>

        <!-- Aparece en -->
        <section v-if="appearsOn.length">
          <h2 class="mb-5 text-2xl font-bold tracking-tight">Aparece en</h2>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <RouterLink
              v-for="pl in appearsOn"
              :key="pl.id"
              :to="`/playlist/${pl.id}`"
              class="group rounded-xl border bg-card p-3 transition-all hover:bg-accent hover:shadow-lg hover:shadow-black/30"
            >
              <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
                <img
                  :src="pl.images[0]?.url || '/placeholder-playlist.jpg'"
                  :alt="pl.name"
                  class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <h3 class="truncate text-sm font-semibold group-hover:text-primary">{{ pl.name }}</h3>
              <p class="truncate text-xs text-muted-foreground">
                {{ pl.owner?.display_name || 'Playlist' }}
              </p>
            </RouterLink>
          </div>
        </section>

        <!-- Artistas de referencia -->
        <section v-if="related.length">
          <h2 class="mb-5 text-2xl font-bold tracking-tight">Artistas de referencia</h2>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            <RouterLink
              v-for="rel in related"
              :key="rel.id"
              :to="`/artist/${rel.id}`"
              class="group flex flex-col items-center rounded-xl p-3 text-center transition-colors hover:bg-accent"
            >
              <div class="mb-3 w-full overflow-hidden rounded-full">
                <img
                  :src="rel.images?.[0]?.url || '/placeholder-artist.jpg'"
                  :alt="rel.name"
                  class="aspect-square w-full rounded-full object-cover shadow-lg shadow-black/30 transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <h3 class="w-full truncate text-sm font-semibold group-hover:text-primary">
                {{ rel.name }}
              </h3>
              <p class="text-xs text-muted-foreground">Artista</p>
            </RouterLink>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
