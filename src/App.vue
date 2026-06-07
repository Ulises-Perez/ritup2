<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from './components/layout/AppSidebar.vue'
import TopBar from './components/layout/TopBar.vue'
import MiniPlayer from './components/player/MiniPlayer.vue'
import NowPlaying from './components/player/NowPlaying.vue'
import QueueSheet from './components/player/QueueSheet.vue'
import CommandPalette from './components/search/CommandPalette.vue'
import CreatePlaylistDialog from './components/CreatePlaylistDialog.vue'
import { Toaster } from './components/ui/sonner'
import { useConfigStore } from './store/configStore'

const configStore = useConfigStore()

onMounted(() => {
  configStore.init()
  // configStore.init() solo aplica `.dark` si hay tema guardado; con el default
  // `isDarkMode = true` hay que aplicarlo a mano para arrancar en oscuro.
  document.documentElement.classList.toggle('dark', configStore.isDarkMode)
})
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden bg-background text-foreground">
    <!-- Rail de navegación -->
    <AppSidebar />

    <!-- Contenido principal -->
    <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <TopBar />
      <div class="flex-1 overflow-y-auto">
        <RouterView />
      </div>
    </main>

    <!-- Reproductor (dock pequeño) + overlays -->
    <MiniPlayer />
    <NowPlaying />
    <QueueSheet />
    <CommandPalette />
    <CreatePlaylistDialog />
    <Toaster position="bottom-center" rich-colors />

    <!-- Backend de reproducción: el iframe de YouTube se monta aquí por id.
         NO debe ir dentro de un v-if ni desmontarse. -->
    <div id="youtube-player" class="hidden"></div>
  </div>
</template>
