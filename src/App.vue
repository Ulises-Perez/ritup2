<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import Nav from './components/Nav.vue'
import Player from './components/Player.vue'
import { useConfigStore } from './store/configStore'

const configStore = useConfigStore()

onMounted(() => {
  // Inicializar configuraciones
  configStore.init()
})
</script>

<template>
  <div class="h-screen flex flex-col bg-background">
    <!-- Filtro SVG ambilight global -->
    <svg width="0" height="0" class="hidden">
      <filter
        id="ambilight"
        width="500%"
        height="500%"
        x="-2"
        y="-2"
        color-interpolation-filters="sRGB"
      >
        <feOffset in="SourceGraphic" result="source-copy"></feOffset>
        <feColorMatrix
          in="source-copy"
          type="saturate"
          values="1.8"
          result="saturated-copy"
        ></feColorMatrix>
        <feColorMatrix
          in="saturated-copy"
          type="matrix"
          values="1 0 0 0 0
                                  0 1 0 0 0
                                  0 0 1 0 0
                                  33 33 33 101 -80"
          result="bright-colors"
        ></feColorMatrix>
        <feMorphology
          in="bright-colors"
          operator="dilate"
          radius="12"
          result="spread"
        ></feMorphology>
        <feGaussianBlur in="spread" stdDeviation="50" result="ambilight-light"></feGaussianBlur>
        <feOffset in="SourceGraphic" result="source"></feOffset>
        <feComposite in="source" in2="ambilight-light" operator="over"></feComposite>
      </filter>
    </svg>

    <!-- Navegación -->
    <Nav />

    <!-- Contenido principal -->
    <div class="content-wrapper flex-1">
      <RouterView />
    </div>

    <!-- Reproductor persistente -->
    <div id="youtube-player"></div>
    <Player />
  </div>
</template>

<style scoped>
.content-wrapper {
  @apply flex-1;
}
</style>
