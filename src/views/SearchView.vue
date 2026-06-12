<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Play, Search } from '@lucide/vue'
import { useDeezerStore } from '@/store/deezerStore'
import { usePlayerStore } from '@/store/playerStore'
import TrackList from '@/components/TrackList.vue'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const route = useRoute()
const deezerStore = useDeezerStore()
const playerStore = usePlayerStore()

const query = computed(() => (route.query.q as string) || '')
const isLoading = ref(false)
const artists = ref<any[]>([])
const albums = ref<any[]>([])
const tracks = ref<any[]>([])
const playlists = ref<any[]>([])

const exactMatch = computed(() => {
  const searchTerm = query.value.toLowerCase()
  const exactTrack = tracks.value?.find(
    (t) =>
      t?.name?.toLowerCase() === searchTerm ||
      t?.artists?.some((a: any) => a?.name?.toLowerCase() === searchTerm),
  )
  if (exactTrack) return { ...exactTrack, type: 'track' }
  const exactArtist = artists.value?.find((a: any) => a?.name?.toLowerCase() === searchTerm)
  if (exactArtist) return { ...exactArtist, type: 'artist' }
  const exactAlbum = albums.value?.find(
    (al) =>
      al?.name?.toLowerCase() === searchTerm ||
      al?.artists?.some((a: any) => a?.name?.toLowerCase() === searchTerm),
  )
  if (exactAlbum) return { ...exactAlbum, type: 'album' }
  if (tracks.value?.length) return { ...tracks.value[0], type: 'track' }
  if (artists.value?.length) return { ...artists.value[0], type: 'artist' }
  if (albums.value?.length) return { ...albums.value[0], type: 'album' }
  if (playlists.value?.length) return { ...playlists.value[0], type: 'playlist' }
  return null
})

const getExactMatchType = computed(() => {
  switch (exactMatch.value?.type) {
    case 'artist':
      return 'Artista'
    case 'track':
      return 'Canción'
    case 'album':
      return 'Álbum'
    case 'playlist':
      return 'Playlist'
    default:
      return ''
  }
})

const getExactMatchLink = computed(() => {
  if (!exactMatch.value) return '/'
  switch (exactMatch.value.type) {
    case 'artist':
      return `/artist/${exactMatch.value.id}`
    case 'album':
      return `/album/${exactMatch.value.id}`
    case 'playlist':
      return `/playlist/${exactMatch.value.id}`
    default:
      return '/'
  }
})

const exactImage = computed(
  () =>
    exactMatch.value?.images?.[0]?.url ||
    exactMatch.value?.album?.images?.[0]?.url ||
    '/placeholder-album.jpg',
)
const exactArtists = computed(() =>
  exactMatch.value?.type === 'artist'
    ? 'Artista'
    : (exactMatch.value?.artists?.map((a: any) => a?.name).join(', ') ?? ''),
)

const hasResults = computed(
  () =>
    artists.value.length || albums.value.length || tracks.value.length || playlists.value.length,
)

const getArtistInitials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

const search = async (q: string) => {
  if (!q.trim()) {
    artists.value = albums.value = tracks.value = playlists.value = []
    return
  }
  try {
    isLoading.value = true
    const results = await deezerStore.search(q)
    artists.value = results?.artists?.items || []
    albums.value = results?.albums?.items || []
    tracks.value = results?.tracks?.items || []
    playlists.value = (results?.playlists?.items || []).filter(
      (p: any) => p?.id && p?.name && p?.images?.[0]?.url && p?.owner?.display_name,
    )
  } catch (error) {
    console.error('Error en la búsqueda:', error)
  } finally {
    isLoading.value = false
  }
}

const handleExactMatchClick = () => {
  if (exactMatch.value?.type === 'track')
    playerStore.playFromContext(exactMatch.value, { type: 'search', tracks: tracks.value })
}

watch(
  () => route.query.q,
  (q) => q && search(q as string),
  { immediate: true },
)
onMounted(() => query.value && search(query.value))
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-8 pb-32">
    <!-- Carga -->
    <div v-if="isLoading" class="space-y-8">
      <Skeleton class="h-7 w-48" />
      <div class="grid gap-4 sm:grid-cols-3 md:grid-cols-5">
        <div v-for="i in 5" :key="i" class="rounded-xl border bg-card p-3">
          <Skeleton class="mb-3 aspect-square w-full rounded-lg" />
          <Skeleton class="h-4 w-3/4" />
        </div>
      </div>
    </div>

    <template v-else-if="hasResults">
      <!-- Resultado principal + canciones -->
      <div v-if="exactMatch || tracks.length" class="mb-10 grid gap-6 lg:grid-cols-5">
        <div v-if="exactMatch" class="lg:col-span-2">
          <h2 class="mb-4 text-xl font-bold tracking-tight">Resultado principal</h2>
          <component
            :is="exactMatch.type === 'track' ? 'div' : RouterLink"
            :to="exactMatch.type === 'track' ? undefined : getExactMatchLink"
            class="group relative block h-[calc(100%-2.75rem)] cursor-pointer overflow-hidden rounded-2xl border bg-card p-6"
            @click="exactMatch.type === 'track' ? handleExactMatchClick() : undefined"
          >
            <div class="absolute inset-0 -z-0 opacity-20 transition-opacity group-hover:opacity-30">
              <img
                :src="exactImage"
                class="size-full scale-150 object-cover blur-3xl"
                aria-hidden="true"
              />
            </div>
            <div class="relative z-10 flex h-full min-h-[220px] flex-col justify-between">
              <img
                :src="exactImage"
                :alt="exactMatch.name"
                class="size-28 object-cover shadow-2xl shadow-black/50 lg:size-32"
                :class="exactMatch.type === 'artist' ? 'rounded-full' : 'rounded-xl'"
                loading="lazy"
              />
              <div class="mt-6">
                <h3 class="mb-2 line-clamp-2 text-3xl font-bold tracking-tight">
                  {{ exactMatch.name }}
                </h3>
                <div class="flex items-center gap-3">
                  <Badge variant="secondary">{{ getExactMatchType }}</Badge>
                  <p class="truncate text-sm text-muted-foreground">{{ exactArtists }}</p>
                </div>
              </div>
            </div>
            <span
              class="absolute bottom-6 right-6 z-20 flex size-12 translate-y-4 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg shadow-primary/40 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
            >
              <Play class="size-5 translate-x-px" />
            </span>
          </component>
        </div>

        <div v-if="tracks.length" class="lg:col-span-3">
          <h2 class="mb-4 text-xl font-bold tracking-tight">Canciones</h2>
          <TrackList :tracks="tracks.slice(0, 5)" class="-mx-3" />
        </div>
      </div>

      <!-- Artistas -->
      <section v-if="artists.length" class="mb-10">
        <h2 class="mb-5 text-2xl font-bold tracking-tight">Artistas</h2>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <RouterLink
            v-for="artist in artists.slice(0, 6)"
            :key="artist?.id"
            :to="`/artist/${artist?.id}`"
            class="group flex flex-col items-center rounded-xl p-3 text-center transition-colors hover:bg-accent"
          >
            <div class="relative mb-3 aspect-square w-full overflow-hidden rounded-full">
              <img
                v-if="artist?.images?.[0]?.url"
                :src="artist.images[0].url"
                :alt="artist?.name"
                class="size-full rounded-full object-cover shadow-lg shadow-black/30 transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div
                v-else
                class="flex size-full items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground"
              >
                {{ getArtistInitials(artist?.name || '') }}
              </div>
            </div>
            <h3 class="w-full truncate text-sm font-semibold group-hover:text-primary">
              {{ artist?.name }}
            </h3>
            <p class="mt-1 text-xs text-muted-foreground">Artista</p>
          </RouterLink>
        </div>
      </section>

      <!-- Álbumes + Playlists -->
      <div class="grid gap-8 lg:grid-cols-2">
        <section v-if="albums.length">
          <h2 class="mb-5 text-2xl font-bold tracking-tight">Álbumes</h2>
          <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
            <RouterLink
              v-for="album in albums.slice(0, 6)"
              :key="album?.id"
              :to="`/album/${album?.id}`"
              class="group rounded-xl border bg-card p-3 transition-all hover:bg-accent"
            >
              <div class="mb-3 aspect-square overflow-hidden rounded-lg">
                <img
                  :src="album?.images?.[0]?.url || '/placeholder-album.jpg'"
                  :alt="album?.name"
                  class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <h3 class="truncate text-sm font-semibold group-hover:text-primary">
                {{ album?.name }}
              </h3>
              <p class="truncate text-xs text-muted-foreground">
                {{ album?.artists?.map((a: any) => a?.name).join(', ') }}
              </p>
            </RouterLink>
          </div>
        </section>

        <section v-if="playlists.length">
          <h2 class="mb-5 text-2xl font-bold tracking-tight">Playlists</h2>
          <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
            <RouterLink
              v-for="pl in playlists.slice(0, 6)"
              :key="pl?.id"
              :to="`/playlist/${pl?.id}`"
              class="group rounded-xl border bg-card p-3 transition-all hover:bg-accent"
            >
              <div class="mb-3 aspect-square overflow-hidden rounded-lg">
                <img
                  :src="pl?.images?.[0]?.url || '/placeholder-playlist.jpg'"
                  :alt="pl?.name"
                  class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <h3 class="truncate text-sm font-semibold group-hover:text-primary">
                {{ pl?.name }}
              </h3>
              <p class="truncate text-xs text-muted-foreground">De {{ pl?.owner?.display_name }}</p>
            </RouterLink>
          </div>
        </section>
      </div>
    </template>

    <!-- Sin resultados -->
    <div
      v-else-if="query && !hasResults"
      class="flex flex-col items-center justify-center py-20 text-center"
    >
      <span class="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
        <Search class="size-6 text-muted-foreground" />
      </span>
      <p class="font-medium">No se encontraron resultados para «{{ query }}»</p>
      <p class="mt-1 text-sm text-muted-foreground">Intenta con otra búsqueda</p>
    </div>
  </div>
</template>
