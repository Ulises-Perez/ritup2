<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { Plus, ListMusic, Music2 } from '@lucide/vue'
import { useLibraryStore } from '@/store/libraryStore'
import { useShell } from '@/composables/useShell'
import { Button } from '@/components/ui/button'

const libraryStore = useLibraryStore()
const { playlists } = storeToRefs(libraryStore)
const { openCreatePlaylist } = useShell()

const createPlaylist = () => openCreatePlaylist()
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-8 pb-32">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Tu biblioteca</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ playlists.length }} {{ playlists.length === 1 ? 'playlist' : 'playlists' }}
        </p>
      </div>
      <Button class="gap-2" @click="createPlaylist">
        <Plus class="size-4" />
        Nueva playlist
      </Button>
    </div>

    <!-- Estado vacío -->
    <div
      v-if="!playlists.length"
      class="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center"
    >
      <span class="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
        <ListMusic class="size-6 text-muted-foreground" />
      </span>
      <p class="font-medium">Aún no tienes playlists</p>
      <p class="mb-4 text-sm text-muted-foreground">Crea tu primera playlist para empezar.</p>
      <Button variant="outline" class="gap-2" @click="createPlaylist">
        <Plus class="size-4" />
        Crear playlist
      </Button>
    </div>

    <!-- Grid de playlists -->
    <div
      v-else
      class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    >
      <RouterLink
        v-for="pl in playlists"
        :key="pl.id"
        :to="`/library/${pl.id}`"
        class="group rounded-xl border bg-card p-3 transition-all hover:bg-accent hover:shadow-lg hover:shadow-black/30"
      >
        <div class="relative mb-3 aspect-square overflow-hidden rounded-lg bg-muted">
          <img
            v-if="pl.images[0]?.url"
            :src="pl.images[0].url"
            :alt="pl.name"
            class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <span v-else class="flex size-full items-center justify-center">
            <Music2 class="size-10 text-muted-foreground" />
          </span>
        </div>
        <p class="truncate text-sm font-semibold">{{ pl.name }}</p>
        <p class="truncate text-xs text-muted-foreground">{{ pl.tracks.total }} canciones</p>
      </RouterLink>
    </div>
  </div>
</template>
