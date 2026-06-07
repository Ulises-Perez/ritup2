<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Play, Radio } from '@lucide/vue'
import { useDeezerStore } from '@/store/deezerStore'
import { usePlayerStore } from '@/store/playerStore'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const route = useRoute()
const deezerStore = useDeezerStore()
const playerStore = usePlayerStore()

const genre = ref<any>(null)
const artists = ref<any[]>([])
const radios = ref<any[]>([])
const isLoading = ref(true)
const error = ref('')
// Radio que se está resolviendo (mostramos spinner/disabled en su tarjeta).
const loadingRadioId = ref('')

const loadGenreData = async () => {
  try {
    isLoading.value = true
    error.value = ''
    const genreId = route.params.id as string
    genre.value = null
    artists.value = []
    radios.value = []

    const [genreData, artistsData, radiosData] = await Promise.all([
      deezerStore.getGenre(genreId),
      deezerStore.getGenreArtists(genreId),
      deezerStore.getGenreRadios(genreId).catch(() => []),
    ])
    if (!genreData) throw new Error('No se pudo cargar la categoría')
    genre.value = genreData
    artists.value = artistsData || []
    radios.value = radiosData || []
  } catch (err) {
    console.error('Error al cargar la categoría:', err)
    error.value = err instanceof Error ? err.message : 'Error al cargar la categoría'
  } finally {
    isLoading.value = false
  }
}

// Clic en una radio: resolvemos sus tracks y los reproducimos como una cola.
const playRadio = async (radio: any) => {
  if (loadingRadioId.value) return
  try {
    loadingRadioId.value = radio.id
    const tracks = await deezerStore.getRadioTracks(radio.id)
    if (!tracks.length) return
    playerStore.playFromContext(tracks[0], {
      type: 'playlist',
      name: radio.title,
      tracks,
    })
  } catch (err) {
    console.error('Error al reproducir la radio:', err)
  } finally {
    loadingRadioId.value = ''
  }
}

watch(() => route.params.id, loadGenreData)
onMounted(loadGenreData)
</script>

<template>
  <div class="pb-32">
    <!-- Carga -->
    <div v-if="isLoading" class="space-y-8">
      <Skeleton class="h-60 w-full rounded-none" />
      <div class="mx-auto max-w-7xl px-6">
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <div v-for="i in 12" :key="i" class="flex flex-col items-center gap-3 p-3">
            <Skeleton class="aspect-square w-full rounded-full" />
            <Skeleton class="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <p class="text-sm text-destructive">{{ error }}</p>
      <Button variant="outline" @click="loadGenreData">Intentar de nuevo</Button>
    </div>

    <!-- Contenido -->
    <div v-else-if="genre">
      <!-- Hero -->
      <div class="relative h-60 w-full sm:h-72">
        <img
          :src="genre.image || '/placeholder-album.jpg'"
          :alt="genre.name"
          class="size-full object-cover"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent"
        ></div>
        <div class="absolute bottom-0 left-0 w-full px-6 pb-6">
          <div class="mx-auto max-w-7xl">
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categoría
            </p>
            <h1 class="mt-1 text-5xl font-bold tracking-tight sm:text-6xl">{{ genre.name }}</h1>
          </div>
        </div>
      </div>

      <div class="mx-auto max-w-7xl space-y-10 px-6 pt-6">
        <!-- Artistas del género -->
        <section v-if="artists.length">
          <h2 class="mb-5 text-2xl font-bold tracking-tight">Artistas</h2>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            <RouterLink
              v-for="artist in artists"
              :key="artist.id"
              :to="`/artist/${artist.id}`"
              class="group flex flex-col items-center rounded-xl p-3 text-center transition-colors hover:bg-accent"
            >
              <div class="relative mb-3 w-full overflow-hidden rounded-full">
                <img
                  :src="artist?.images?.[0]?.url || '/placeholder-artist.jpg'"
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

        <!-- Radios del género -->
        <section v-if="radios.length">
          <h2 class="mb-5 text-2xl font-bold tracking-tight">Radios</h2>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <button
              v-for="radio in radios"
              :key="radio.id"
              type="button"
              class="group rounded-xl border bg-card p-3 text-left transition-all hover:bg-accent hover:shadow-lg hover:shadow-black/30"
              @click="playRadio(radio)"
            >
              <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
                <img
                  v-if="radio.image"
                  :src="radio.image"
                  :alt="radio.title"
                  class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div v-else class="flex size-full items-center justify-center bg-muted">
                  <Radio class="size-10 text-muted-foreground" />
                </div>
                <span
                  class="absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition-all duration-300"
                  :class="
                    loadingRadioId === radio.id
                      ? 'opacity-100'
                      : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
                  "
                >
                  <Radio v-if="loadingRadioId === radio.id" class="size-5 animate-pulse" />
                  <Play v-else class="size-5 translate-x-px" />
                </span>
              </div>
              <h3 class="truncate text-sm font-semibold group-hover:text-primary">
                {{ radio.title }}
              </h3>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
