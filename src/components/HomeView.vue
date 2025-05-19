<template>
  <div class="home-view">
    <section class="mb-8">
      <h2 class="text-xl font-bold text-white mb-4">Artistas Populares</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <router-link
          v-for="artist in topArtists"
          :key="artist.id"
          :to="`/artist/${artist.id}`"
          class="hover:bg-[#282828] p-4 rounded-lg transition-colors cursor-pointer group text-left"
        >
          <div class="relative">
            <img
              :src="artist?.images?.[0]?.url ?? '/placeholder-artist.jpg'"
              :alt="`Foto de ${artist?.name || 'Artista'}`"
              class="w-full aspect-square object-cover rounded-full mb-4"
              loading="lazy"
              decoding="async"
              :width="300"
              :height="300"
            />
          </div>
          <div class="space-y-1">
            <h3 class="text-white font-medium text-center truncate">{{ artist?.name || 'Artista Desconocido' }}</h3>
          </div>
        </router-link>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-xl font-bold text-white mb-6">Nuevos Lanzamientos</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <router-link
          v-for="album in newReleases"
          :key="album.id"
          :to="`/album/${album.id}`"
          class="bg-[#282828] p-4 rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer group"
        >
          <img
            :src="album?.images?.[0]?.url ?? '/placeholder-album.jpg'"
            :alt="album?.name || 'Álbum Desconocido'"
            class="w-full aspect-square object-cover rounded-lg mb-4"
            loading="lazy"
            decoding="async"
            :width="300"
            :height="300"
          />
          <h3 class="text-white font-medium truncate group-hover:text-green-500 transition-colors">
            {{ album?.name || 'Álbum Desconocido' }}
          </h3>
          <p class="text-white/60 text-sm mt-1 truncate">
            {{ album?.artists?.map(artist => artist?.name).filter(Boolean).join(', ') || 'Artista Desconocido' }}
          </p>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSpotifyStore } from '../store/spotifyStore'

const spotifyStore = useSpotifyStore()
const topArtists = ref([])
const newReleases = ref([])

onMounted(async () => {
  try {
    const [artists, releases] = await Promise.all([
      spotifyStore.getTopArtists(),
      spotifyStore.getNewReleases()
    ])
    topArtists.value = artists
    newReleases.value = releases
  } catch (error) {
    console.error('Error al cargar datos:', error)
  }
})
</script>
