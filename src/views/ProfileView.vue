<template>
  <div class="pt-20">
    <div class="grid grid-cols-12 gap-2 px-2 h-full">
      <!-- Grid lateral izquierdo -->
      <Library />

      <!-- Grid central -->
      <div
        class="col-span-8 bg-[#181818] dark:bg-[#121212] rounded-lg h-[calc(100vh-9rem)] overflow-y-auto"
      >
        <div class="px-6 py-4">
          <div v-if="profile" class="space-y-8">
            <!-- Información del perfil -->
            <div class="flex items-end space-x-6">
              <div
                class="w-48 h-48 rounded-full overflow-hidden relative flex items-center justify-center"
                :style="{ backgroundColor: profileBgColor }"
              >
                <template v-if="profile.images[0]?.url">
                  <img
                    :src="profile.images[0].url"
                    :alt="profile.display_name"
                    class="w-full h-full object-cover"
                  />
                </template>
                <template v-else>
                  <div class="flex flex-col items-center justify-center">
                    <i class="fas fa-user text-white/80 mb-2"></i>
                    <span class="text-white/80 text-8xl">{{
                      profile.display_name.charAt(0).toUpperCase()
                    }}</span>
                  </div>
                </template>
              </div>
              <div>
                <p class="text-sm text-white/60 mb-1">Perfil</p>
                <h1 class="text-4xl font-bold text-white mb-2">{{ profile.display_name }}</h1>
                <div class="flex items-center space-x-2 mt-2">
                  <span class="text-white/60">{{ playlists.length }} playlists</span>
                </div>
              </div>
            </div>

            <!-- Configuraciones -->
            <section class="bg-[#282828] dark:bg-[#1a1a1a] p-6 rounded-xl">
              <h2 class="text-2xl font-bold text-white mb-6">Configuraciones</h2>

              <div class="space-y-6">
                <!-- Tema -->
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-white font-medium">Tema</h3>
                    <p class="text-white/60 text-sm">Cambia entre modo claro y oscuro</p>
                  </div>
                  <button
                    @click="configStore.toggleTheme()"
                    class="px-4 py-2 rounded-full bg-green-500 hover:bg-green-600 transition-colors text-white font-medium flex items-center space-x-2"
                  >
                    <span v-if="configStore.isDarkMode">
                      <i class="fas fa-sun"></i> Modo Claro
                    </span>
                    <span v-else> <i class="fas fa-moon"></i> Modo Oscuro </span>
                  </button>
                </div>

                <!-- API de Videos -->
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-white font-medium">API de Videos</h3>
                    <p class="text-white/60 text-sm">
                      Cambia entre la API oficial de YouTube e Invidious
                    </p>
                  </div>
                  <button
                    @click="toggleAPI"
                    class="px-4 py-2 rounded-full bg-green-500 hover:bg-green-600 transition-colors text-white font-medium flex items-center space-x-2"
                  >
                    <span v-if="configStore.useInvidious">
                      <i class="fas fa-play"></i> Usar YouTube
                    </span>
                    <span v-else> <i class="fas fa-play-circle"></i> Usar Invidious </span>
                  </button>
                </div>

                <!-- Indicador de API actual -->
                <div class="mt-4 p-3 bg-[#222222] rounded-lg text-white/70 text-sm">
                  <p class="font-medium">
                    API actual:
                    <span v-if="configStore.useInvidious" class="text-green-400">Invidious</span>
                    <span v-else class="text-red-400">YouTube Oficial</span>
                  </p>
                  <p v-if="configStore.useInvidious" class="mt-1 text-xs">
                    Servidor:
                    <a :href="invidiousUrl" target="_blank" class="text-blue-400 hover:underline">{{
                      invidiousUrl
                    }}</a>
                    <span
                      v-if="invidiousStatus"
                      class="ml-2 px-1.5 py-0.5 text-[10px] rounded"
                      :class="invidiousStatus === 'ok' ? 'bg-green-500' : 'bg-yellow-500'"
                    >
                      {{ invidiousStatus }}
                    </span>
                  </p>
                  <p v-else class="mt-1 text-xs">
                    Servidor: <span class="text-white/50">API de YouTube local en puerto 8000</span>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <!-- Grid lateral derecho -->
      <ActiveFriends />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSpotifyStore } from '../store/spotifyStore'
import { useConfigStore } from '../store/configStore'
import { useApiStore } from '../store/apiStore'
import Library from '../components/Library.vue'
import ActiveFriends from '../components/ActiveFriends.vue'

const spotifyStore = useSpotifyStore()
const configStore = useConfigStore()
const apiStore = useApiStore()

const profile = ref(null)
const playlists = ref([])
const followedArtists = ref([])
const invidiousUrl = ref(localStorage.getItem('invidious-instance') || 'https://vid.puffyan.us')
const invidiousStatus = ref('') // puede ser 'ok', 'error', o vacío

// Función para verificar el estado de la instancia de Invidious
const checkInvidiousStatus = async () => {
  if (!configStore.useInvidious) return

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    console.log(`Verificando estado de Invidious en: ${invidiousUrl.value}/api/v1/stats`)
    const response = await fetch(`${invidiousUrl.value}/api/v1/stats`, {
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-cache',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      console.log('Respuesta OK de Invidious.')
      invidiousStatus.value = 'ok'
    } else {
      console.warn('Respuesta no OK de Invidious:', response.status)
      invidiousStatus.value = 'error'
    }
  } catch (error) {
    console.error('Error detallado al verificar estado de Invidious:', error)
    invidiousStatus.value = 'error'
  }
}

// Función para cambiar entre APIs y reiniciar el reproductor
const toggleAPI = async () => {
  configStore.toggleAPI()

  // Después de cambiar a Invidious, verificar su estado
  if (configStore.useInvidious) {
    // Leer la instancia guardada (podría haber cambiado si usamos apiStore)
    invidiousUrl.value = localStorage.getItem('invidious-instance') || 'https://vid.puffyan.us'
    await checkInvidiousStatus()
  }

  // Después de cambiar la API, inicializar el reproductor correspondiente
  apiStore.initActivePlayer()
}

// Función para generar un color aleatorio
const getRandomColor = () => {
  const colors = [
    '#1DB954', // Verde Spotify
    '#FF6B6B', // Rojo
    '#4ECDC4', // Turquesa
    '#45B7D1', // Azul claro
    '#96CEB4', // Verde claro
    '#FFEEAD', // Amarillo claro
    '#D4A5A5', // Rosa
    '#9B59B6', // Púrpura
    '#3498DB', // Azul
    '#E67E22', // Naranja
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// Color de fondo aleatorio para el perfil
const profileBgColor = computed(() => {
  if (!profile.value?.images[0]?.url) {
    return getRandomColor()
  }
  return 'transparent'
})

onMounted(async () => {
  // Inicializar configuraciones
  configStore.init()

  // Inicializar el reproductor con la API configurada
  apiStore.initActivePlayer()

  // Verificar estado de Invidious si está activado
  if (configStore.useInvidious) {
    await checkInvidiousStatus()
  }

  try {
    // Obtener el perfil del usuario actual
    const currentUser = await spotifyStore.getCurrentUser()
    const [profileData, playlistsData, artistsData] = await Promise.all([
      spotifyStore.getUserProfile(currentUser.id),
      spotifyStore.getUserPlaylists(currentUser.id),
      spotifyStore.getFollowedArtists(),
    ])

    profile.value = profileData
    playlists.value = playlistsData
    followedArtists.value = artistsData
  } catch (error) {
    console.error('Error al cargar datos del perfil:', error)
  }
})
</script>
