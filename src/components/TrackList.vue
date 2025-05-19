<template>
  <div class="space-y-2">
    <div
      v-for="(track, index) in tracks"
      :key="track.id"
      class="flex items-center p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
      @click="playTrack(track)"
    >
      <span class="text-white/60 w-8 text-center">{{ (startIndex || 0) + index + 1 }}</span>
      <img
        :src="track.album?.images?.[0]?.url || '/placeholder-album.jpg'"
        :alt="track.album?.name"
        class="w-10 h-10 rounded mr-4"
        loading="lazy"
        decoding="async"
        :width="40"
        :height="40"
      />
      <div class="flex-1 min-w-0">
        <p class="text-white text-sm truncate group-hover:text-green-500 transition-colors">
          {{ track.name }}
        </p>
        <div class="flex items-center text-white/60 text-xs">
          <router-link
            v-for="(artist, i) in track.artists"
            :key="artist.id"
            :to="`/artist/${artist.id}`"
            class="hover:underline hover:text-white transition-colors mr-1"
            @click.stop
          >
            {{ artist.name }}<span v-if="i < track.artists.length - 1">,</span>
          </router-link>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <span class="text-white/60 text-sm">{{ formatDuration(track.duration_ms) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '../store/playerStore'

const playerStore = usePlayerStore()

const props = withDefaults(defineProps<{
  tracks: any[]
  startIndex?: number
}>(), {
  startIndex: 0
})

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const playTrack = (track: any) => {
  playerStore.playTrack(track)
}
</script>
