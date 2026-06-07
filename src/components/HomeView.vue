<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Play } from '@lucide/vue'
import { useDeezerStore } from '@/store/deezerStore'
import TrackList from '@/components/TrackList.vue'
import { Skeleton } from '@/components/ui/skeleton'

const deezerStore = useDeezerStore()
const topArtists = ref<any[]>([])
const topTracks = ref<any[]>([])
const genres = ref<any[]>([])
const newReleases = ref<any[]>([])
const topPlaylists = ref<any[]>([])
const editorial = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [charts, genresData, playlistsData, editorialData] = await Promise.all([
      deezerStore.getCharts(),
      deezerStore.getGenres(),
      deezerStore.getTopPlaylists(),
      deezerStore.getEditorialSelection(),
    ])
    topArtists.value = charts.artists
    topTracks.value = charts.tracks.slice(0, 10)
    genres.value = genresData
    newReleases.value = charts.albums
    topPlaylists.value = playlistsData
    editorial.value = editorialData
  } catch (error) {
    console.error('Error al cargar datos:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-12">
    <!-- Artistas populares -->
    <section>
      <h2 class="mb-5 text-2xl font-bold tracking-tight">Artistas populares</h2>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <template v-if="loading">
          <div v-for="i in 6" :key="i" class="flex flex-col items-center gap-3 p-3">
            <Skeleton class="aspect-square w-full rounded-full" />
            <Skeleton class="h-4 w-2/3" />
          </div>
        </template>
        <RouterLink
          v-for="artist in topArtists"
          v-else
          :key="artist.id"
          :to="`/artist/${artist.id}`"
          class="group flex flex-col items-center rounded-xl p-3 text-center transition-colors hover:bg-accent"
        >
          <div class="relative mb-3 w-full overflow-hidden rounded-full">
            <img
              :src="artist?.images?.[0]?.url ?? '/placeholder-artist.jpg'"
              :alt="artist?.name || 'Artista'"
              class="aspect-square w-full rounded-full object-cover shadow-lg shadow-black/30 transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
          <h3 class="w-full truncate text-sm font-semibold group-hover:text-primary">
            {{ artist?.name || 'Artista' }}
          </h3>
        </RouterLink>
      </div>
    </section>

    <!-- Top canciones -->
    <section>
      <h2 class="mb-5 text-2xl font-bold tracking-tight">Top canciones</h2>

      <div class="rounded-xl border bg-card/40 p-2 sm:p-3">
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 6" :key="i" class="h-14 w-full rounded-lg" />
        </div>
        <TrackList v-else :tracks="topTracks" :start-index="0" />
      </div>
    </section>

    <!-- Géneros -->
    <section>
      <h2 class="mb-5 text-2xl font-bold tracking-tight">Géneros</h2>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <template v-if="loading">
          <Skeleton v-for="i in 6" :key="i" class="aspect-[16/10] w-full rounded-xl" />
        </template>
        <RouterLink
          v-for="genre in genres"
          v-else
          :key="genre.id"
          :to="`/genre/${genre.id}`"
          class="group relative aspect-[16/10] overflow-hidden rounded-xl shadow-lg shadow-black/30"
        >
          <img
            :src="genre.image || '/placeholder-album.jpg'"
            :alt="genre.name"
            class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
          ></div>
          <span
            class="absolute bottom-2 left-3 right-3 truncate text-base font-bold text-white drop-shadow"
          >
            {{ genre.name }}
          </span>
        </RouterLink>
      </div>
    </section>

    <!-- Nuevos lanzamientos -->
    <section>
      <h2 class="mb-5 text-2xl font-bold tracking-tight">Nuevos lanzamientos</h2>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <template v-if="loading">
          <div v-for="i in 5" :key="i" class="rounded-xl border bg-card p-3">
            <Skeleton class="mb-3 aspect-square w-full rounded-lg" />
            <Skeleton class="mb-2 h-4 w-3/4" />
            <Skeleton class="h-3 w-1/2" />
          </div>
        </template>
        <RouterLink
          v-for="album in newReleases"
          v-else
          :key="album.id"
          :to="`/album/${album.id}`"
          class="group rounded-xl border bg-card p-3 transition-all hover:bg-accent hover:shadow-lg hover:shadow-black/30"
        >
          <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
            <img
              :src="album?.images?.[0]?.url ?? '/placeholder-album.jpg'"
              :alt="album?.name || 'Álbum'"
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
            {{ album?.name || 'Álbum' }}
          </h3>
          <p class="mt-0.5 truncate text-xs text-muted-foreground">
            {{
              album?.artists
                ?.map((a: any) => a?.name)
                .filter(Boolean)
                .join(', ') || 'Artista'
            }}
          </p>
        </RouterLink>
      </div>
    </section>

    <!-- Playlists destacadas -->
    <section v-if="loading || topPlaylists.length">
      <h2 class="mb-5 text-2xl font-bold tracking-tight">Playlists destacadas</h2>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <template v-if="loading">
          <div v-for="i in 5" :key="i" class="rounded-xl border bg-card p-3">
            <Skeleton class="mb-3 aspect-square w-full rounded-lg" />
            <Skeleton class="h-4 w-3/4" />
          </div>
        </template>
        <RouterLink
          v-for="playlist in topPlaylists"
          v-else
          :key="playlist.id"
          :to="`/playlist/${playlist.id}`"
          class="group rounded-xl border bg-card p-3 transition-all hover:bg-accent hover:shadow-lg hover:shadow-black/30"
        >
          <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
            <img
              :src="playlist?.images?.[0]?.url ?? '/placeholder-album.jpg'"
              :alt="playlist?.name || 'Playlist'"
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
            {{ playlist?.name || 'Playlist' }}
          </h3>
          <p class="mt-0.5 truncate text-xs text-muted-foreground">
            {{ playlist?.tracks?.total ?? 0 }} canciones
          </p>
        </RouterLink>
      </div>
    </section>

    <!-- Selección -->
    <section v-if="loading || editorial.length">
      <h2 class="mb-5 text-2xl font-bold tracking-tight">Selección</h2>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <template v-if="loading">
          <div v-for="i in 5" :key="i" class="rounded-xl border bg-card p-3">
            <Skeleton class="mb-3 aspect-square w-full rounded-lg" />
            <Skeleton class="mb-2 h-4 w-3/4" />
            <Skeleton class="h-3 w-1/2" />
          </div>
        </template>
        <RouterLink
          v-for="album in editorial"
          v-else
          :key="album.id"
          :to="`/album/${album.id}`"
          class="group rounded-xl border bg-card p-3 transition-all hover:bg-accent hover:shadow-lg hover:shadow-black/30"
        >
          <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
            <img
              :src="album?.images?.[0]?.url ?? '/placeholder-album.jpg'"
              :alt="album?.name || 'Álbum'"
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
            {{ album?.name || 'Álbum' }}
          </h3>
          <p class="mt-0.5 truncate text-xs text-muted-foreground">
            {{
              album?.artists
                ?.map((a: any) => a?.name)
                .filter(Boolean)
                .join(', ') || 'Artista'
            }}
          </p>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
