<script setup lang="ts">
defineOptions({ name: 'CommandPalette' })

import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import debounce from 'lodash/debounce'
import {
  Search,
  Music2,
  Disc3,
  ListMusic,
  Mic2,
  Home,
  Library,
  User,
  CornerDownLeft,
  Loader2,
} from '@lucide/vue'
import { useDeezerStore } from '@/store/deezerStore'
import { usePlayerStore } from '@/store/playerStore'
import { useLibraryStore } from '@/store/libraryStore'
import { useShell } from '@/composables/useShell'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const router = useRouter()
const deezerStore = useDeezerStore()
const playerStore = usePlayerStore()
const libraryStore = useLibraryStore()
const { playlists } = storeToRefs(libraryStore)
const { paletteOpen } = useShell()

const query = ref('')
const loading = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)

const tracks = ref<any[]>([])
const artists = ref<any[]>([])
const albums = ref<any[]>([])
const resultPlaylists = ref<any[]>([])

const navItems = [
  { label: 'Inicio', icon: Home, to: '/' },
  { label: 'Biblioteca', icon: Library, to: '/library' },
  { label: 'Perfil', icon: User, to: '/profile' },
]

const clearResults = () => {
  tracks.value = []
  artists.value = []
  albums.value = []
  resultPlaylists.value = []
}

const runSearch = debounce(async (q: string) => {
  if (!q.trim()) {
    clearResults()
    loading.value = false
    return
  }
  try {
    loading.value = true
    const res = await deezerStore.search(q)
    tracks.value = (res?.tracks?.items ?? []).slice(0, 5)
    artists.value = (res?.artists?.items ?? []).slice(0, 4)
    albums.value = (res?.albums?.items ?? []).slice(0, 4)
    resultPlaylists.value = (res?.playlists?.items ?? []).slice(0, 3)
  } catch (e) {
    console.error('Error en búsqueda:', e)
    clearResults()
  } finally {
    loading.value = false
  }
}, 280)

watch(query, (q) => {
  if (q.trim()) loading.value = true
  runSearch(q)
})

watch(paletteOpen, async (open) => {
  if (open) {
    await nextTick()
    inputEl.value?.focus()
  }
})

const close = () => (paletteOpen.value = false)

const artistsOf = (t: any) => t?.artists?.map((a: any) => a.name).join(', ') ?? ''

const playTrack = (t: any) => {
  playerStore.playFromContext(t, { type: 'search', tracks: tracks.value })
  close()
}
const goTo = (path: string) => {
  router.push(path)
  close()
}
const seeAll = () => {
  if (query.value.trim()) router.push({ path: '/search', query: { q: query.value } })
  close()
}

const onGlobalKey = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    paletteOpen.value = !paletteOpen.value
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKey))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKey))
</script>

<template>
  <Dialog v-model:open="paletteOpen">
    <DialogContent
      class="top-[12%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
      :show-close-button="false"
    >
      <DialogTitle class="sr-only">Buscar</DialogTitle>
      <DialogDescription class="sr-only"
        >Busca artistas, canciones, álbumes y navega por la app</DialogDescription
      >

      <!-- Input -->
      <div class="flex items-center gap-3 border-b px-4">
        <Search class="size-4 shrink-0 text-muted-foreground" />
        <input
          ref="inputEl"
          v-model="query"
          type="text"
          placeholder="Buscar artistas, canciones, álbumes…"
          class="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          @keydown.enter="seeAll"
        />
        <Loader2 v-if="loading" class="size-4 shrink-0 animate-spin text-muted-foreground" />
      </div>

      <!-- Resultados -->
      <div class="max-h-[60vh] overflow-y-auto p-2">
        <!-- Estado inicial: navegación + playlists -->
        <template v-if="!query.trim()">
          <p class="px-2 py-1.5 text-xs font-medium text-muted-foreground">Ir a</p>
          <button
            v-for="item in navItems"
            :key="item.to"
            class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent"
            @click="goTo(item.to)"
          >
            <component :is="item.icon" class="size-4 text-muted-foreground" />
            {{ item.label }}
          </button>

          <template v-if="playlists.length">
            <p class="px-2 pb-1.5 pt-3 text-xs font-medium text-muted-foreground">Tus playlists</p>
            <button
              v-for="pl in playlists.slice(0, 6)"
              :key="pl.id"
              class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent"
              @click="goTo(`/library/${pl.id}`)"
            >
              <img
                :src="pl.images[0]?.url || '/placeholder-playlist.jpg'"
                class="size-8 rounded object-cover"
              />
              <span class="truncate">{{ pl.name }}</span>
            </button>
          </template>
        </template>

        <!-- Resultados de búsqueda -->
        <template v-else>
          <div
            v-if="
              !loading &&
              !tracks.length &&
              !artists.length &&
              !albums.length &&
              !resultPlaylists.length
            "
            class="px-2 py-8 text-center text-sm text-muted-foreground"
          >
            Sin resultados para «{{ query }}»
          </div>

          <template v-if="tracks.length">
            <p class="px-2 py-1.5 text-xs font-medium text-muted-foreground">Canciones</p>
            <button
              v-for="t in tracks"
              :key="t.id"
              class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
              @click="playTrack(t)"
            >
              <img
                :src="t.album?.images?.[0]?.url || '/placeholder-album.jpg'"
                class="size-9 rounded object-cover"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ t.name }}</span>
                <span class="block truncate text-xs text-muted-foreground">{{ artistsOf(t) }}</span>
              </span>
              <Music2 class="size-4 shrink-0 text-muted-foreground" />
            </button>
          </template>

          <template v-if="artists.length">
            <p class="px-2 pb-1.5 pt-3 text-xs font-medium text-muted-foreground">Artistas</p>
            <button
              v-for="a in artists"
              :key="a.id"
              class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
              @click="goTo(`/artist/${a.id}`)"
            >
              <img
                :src="a.images?.[0]?.url || '/placeholder-artist.jpg'"
                class="size-9 rounded-full object-cover"
              />
              <span class="min-w-0 flex-1 truncate font-medium">{{ a.name }}</span>
              <Mic2 class="size-4 shrink-0 text-muted-foreground" />
            </button>
          </template>

          <template v-if="albums.length">
            <p class="px-2 pb-1.5 pt-3 text-xs font-medium text-muted-foreground">Álbumes</p>
            <button
              v-for="al in albums"
              :key="al.id"
              class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
              @click="goTo(`/album/${al.id}`)"
            >
              <img
                :src="al.images?.[0]?.url || '/placeholder-album.jpg'"
                class="size-9 rounded object-cover"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ al.name }}</span>
                <span class="block truncate text-xs text-muted-foreground">{{
                  artistsOf(al)
                }}</span>
              </span>
              <Disc3 class="size-4 shrink-0 text-muted-foreground" />
            </button>
          </template>

          <template v-if="resultPlaylists.length">
            <p class="px-2 pb-1.5 pt-3 text-xs font-medium text-muted-foreground">Playlists</p>
            <button
              v-for="pl in resultPlaylists"
              :key="pl.id"
              class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
              @click="goTo(`/playlist/${pl.id}`)"
            >
              <img
                :src="pl.images?.[0]?.url || '/placeholder-playlist.jpg'"
                class="size-9 rounded object-cover"
              />
              <span class="min-w-0 flex-1 truncate font-medium">{{ pl.name }}</span>
              <ListMusic class="size-4 shrink-0 text-muted-foreground" />
            </button>
          </template>

          <button
            class="mt-2 flex w-full items-center gap-2 rounded-md border-t px-2 py-2.5 text-sm text-primary hover:bg-accent"
            @click="seeAll"
          >
            <CornerDownLeft class="size-4" />
            Ver todos los resultados para «{{ query }}»
          </button>
        </template>
      </div>
    </DialogContent>
  </Dialog>
</template>
