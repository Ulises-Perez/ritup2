<script setup lang="ts">
defineOptions({ name: 'AppSidebar' })

import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Music2, Home, Library, Plus, Trash2, PanelLeftOpen, PanelLeftClose } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useLibraryStore } from '@/store/libraryStore'
import { useShell } from '@/composables/useShell'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const route = useRoute()
const libraryStore = useLibraryStore()
const { playlists } = storeToRefs(libraryStore)
const { sidebarExpanded, toggleSidebar, openCreatePlaylist } = useShell()

const navItems = [
  { label: 'Inicio', icon: Home, to: '/' },
  { label: 'Biblioteca', icon: Library, to: '/library' },
]

const isActive = (to: string) =>
  to === '/' ? route.path === '/' : route.path.startsWith(to)

const expanded = computed(() => sidebarExpanded.value)

const createPlaylist = () => openCreatePlaylist()

const removePlaylist = (id: string, name: string) => {
  if (window.confirm(`¿Eliminar la playlist «${name}»?`)) {
    libraryStore.deletePlaylist(id)
    toast(`Playlist eliminada`)
  }
}
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <aside
      class="flex h-full shrink-0 flex-col border-r bg-sidebar transition-[width] duration-300 ease-in-out"
      :class="expanded ? 'w-64' : 'w-[4.5rem]'"
    >
      <!-- Logo + toggle -->
      <div class="flex h-16 items-center gap-2 px-3" :class="expanded ? 'justify-between' : 'justify-center'">
        <RouterLink to="/" class="flex items-center gap-2.5 overflow-hidden">
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          >
            <Music2 class="size-5" />
          </span>
          <span v-if="expanded" class="truncate text-lg font-bold tracking-tight">RitUp</span>
        </RouterLink>
        <Button
          v-if="expanded"
          variant="ghost"
          size="icon-sm"
          title="Contraer"
          @click="toggleSidebar"
        >
          <PanelLeftClose class="size-4" />
        </Button>
      </div>

      <!-- Expandir (cuando está colapsado) -->
      <div v-if="!expanded" class="flex justify-center pb-1">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon-sm" @click="toggleSidebar">
              <PanelLeftOpen class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expandir</TooltipContent>
        </Tooltip>
      </div>

      <!-- Navegación -->
      <nav class="flex flex-col gap-1 px-3 pt-2">
        <Tooltip v-for="item in navItems" :key="item.to">
          <TooltipTrigger as-child>
            <RouterLink
              :to="item.to"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="[
                isActive(item.to)
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                expanded ? '' : 'justify-center px-0',
              ]"
            >
              <component :is="item.icon" class="size-5 shrink-0" />
              <span v-if="expanded">{{ item.label }}</span>
            </RouterLink>
          </TooltipTrigger>
          <TooltipContent v-if="!expanded" side="right">{{ item.label }}</TooltipContent>
        </Tooltip>
      </nav>

      <!-- Biblioteca / playlists -->
      <div class="mt-4 flex min-h-0 flex-1 flex-col px-3">
        <div class="flex items-center justify-between px-3 pb-2" :class="expanded ? '' : 'justify-center'">
          <span v-if="expanded" class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tus playlists
          </span>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" title="Crear playlist" @click="createPlaylist">
                <Plus class="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Crear playlist</TooltipContent>
          </Tooltip>
        </div>

        <div class="-mr-1 flex-1 space-y-0.5 overflow-y-auto pr-1">
          <p
            v-if="expanded && !playlists.length"
            class="px-3 py-2 text-xs text-muted-foreground"
          >
            Aún no tienes playlists.
          </p>

          <Tooltip v-for="pl in playlists" :key="pl.id">
            <TooltipTrigger as-child>
              <RouterLink
                :to="`/library/${pl.id}`"
                class="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                :class="expanded ? '' : 'justify-center'"
              >
                <img
                  :src="pl.images[0]?.url || '/placeholder-playlist.jpg'"
                  :alt="pl.name"
                  class="size-10 shrink-0 rounded-md object-cover"
                  loading="lazy"
                />
                <template v-if="expanded">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">{{ pl.name }}</p>
                    <p class="truncate text-xs text-muted-foreground">
                      {{ pl.tracks.total }} canciones
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    title="Eliminar"
                    @click.prevent.stop="removePlaylist(pl.id, pl.name)"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </template>
              </RouterLink>
            </TooltipTrigger>
            <TooltipContent v-if="!expanded" side="right">{{ pl.name }}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  </TooltipProvider>
</template>
