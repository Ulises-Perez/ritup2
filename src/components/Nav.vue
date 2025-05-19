<template>
  <header class="fixed top-0 left-0 right-0 z-50">
    <nav class="mx-auto px-4 py-2">
      <div class="flex h-16 items-center justify-between px-6">
        <!-- Logo -->
        <div class="flex items-center">
          <router-link to="/" class="flex items-center text-white hover:text-white/80 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </router-link>
        </div>

        <!-- Barra de búsqueda -->
        <div class="flex-1 max-w-xl mx-8 relative">
          <div class="relative">
            <input
              v-model="searchQuery"
              @input="handleSearch"
              @keydown="handleKeydown"
              type="text"
              placeholder="¿Qué quieres reproducir?"
              class="w-full px-4 py-2 bg-[#242424] text-white rounded-full border border-white/10 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 placeholder:text-white/60"
            />
            <button @click="performSearch" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Navegación -->
        <div class="flex items-center space-x-6">
          <router-link to="/" class="text-white/60 hover:text-white transition-colors flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span class="text-xs mt-1">Inicio</span>
          </router-link>
          <router-link to="/profile" class="text-white/60 hover:text-white transition-colors flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span class="text-xs mt-1">Perfil</span>
          </router-link>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import debounce from 'lodash/debounce'

const router = useRouter()
const route = useRoute()
const searchQuery = ref('')

// Limpiar búsqueda cuando cambie la ruta
watch(() => route.fullPath, (newPath) => {
  // Solo limpiar si no estamos en la página de búsqueda o si estamos pero sin query
  if (!newPath.startsWith('/search') || !route.query.q) {
    searchQuery.value = ''
  }
})

// Actualizar searchQuery cuando se accede directamente a la página de búsqueda
watch(() => route.query.q, (newQuery) => {
  if (route.path === '/search' && newQuery) {
    searchQuery.value = newQuery as string
  }
}, { immediate: true })

const handleSearch = debounce(() => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value } })
  } else {
    // Si la búsqueda está vacía y estamos en la página de búsqueda, volver al inicio
    if (route.path === '/search') {
      router.push('/')
    }
  }
}, 300)

const performSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value } })
  } else {
    // Si la búsqueda está vacía y estamos en la página de búsqueda, volver al inicio
    if (route.path === '/search') {
      router.push('/')
    }
  }
}

// Manejar la tecla Escape para limpiar la búsqueda
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    searchQuery.value = ''
    if (route.path === '/search') {
      router.push('/')
    }
  }
}
</script>
