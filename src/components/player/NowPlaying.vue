<script setup lang="ts">
defineOptions({ name: 'NowPlaying' })

import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Radio,
  ListMusic,
  Volume2,
  VolumeX,
  Minus,
  Plus,
} from '@lucide/vue'
import { usePlayerControls } from '@/composables/usePlayerControls'
import { useShell } from '@/composables/useShell'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

const { nowPlayingExpanded, openQueue } = useShell()

const {
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  autoplay,
  shuffle,
  repeat,
  artistNames,
  albumLink,
  formatTime,
  togglePlay,
  prevTrack,
  nextTrack,
  toggleMute,
  toggleAutoplay,
  toggleShuffle,
  cycleRepeat,
  seekToMs,
  setVolumePct,
  changeVolume,
} = usePlayerControls()

const seeking = ref(false)
const seekValue = ref(0)
const sliderValue = computed(() => [seeking.value ? seekValue.value : currentTime.value])
const sliderMax = computed(() => Math.max(duration.value || 0, 1))
const onSeekInput = (val: number[] | undefined) => {
  if (!val) return
  seeking.value = true
  seekValue.value = val[0]
}
const onSeekCommit = (val: number[] | undefined) => {
  if (val) seekToMs(val[0])
  seeking.value = false
}

const volumeValue = computed(() => [(isMuted.value ? 0 : volume.value) * 100])
const onVolumeInput = (val: number[] | undefined) => {
  if (val) setVolumePct(val[0])
}

const openQueueFromHere = () => {
  nowPlayingExpanded.value = false
  openQueue()
}
</script>

<template>
  <Sheet v-model:open="nowPlayingExpanded">
    <SheetContent side="bottom" class="h-[min(90vh,640px)] gap-0 border-t p-0">
      <SheetHeader class="sr-only">
        <SheetTitle>Reproduciendo ahora</SheetTitle>
        <SheetDescription>Controles del reproductor: progreso, volumen y cola</SheetDescription>
      </SheetHeader>
      <div
        v-if="currentTrack"
        class="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-10"
      >
        <!-- Carátula + glow -->
        <div class="relative">
          <img
            :src="currentTrack.album.images[0]?.url || '/placeholder-album.jpg'"
            :alt="currentTrack.name"
            class="size-44 rounded-2xl object-cover shadow-2xl shadow-black/60 sm:size-52"
          />
          <img
            :src="currentTrack.album.images[0]?.url || '/placeholder-album.jpg'"
            alt=""
            aria-hidden="true"
            class="absolute inset-0 -z-10 size-full scale-110 rounded-2xl object-cover opacity-40 blur-3xl"
          />
        </div>

        <!-- Título -->
        <div class="w-full text-center">
          <component
            :is="albumLink ? RouterLink : 'h2'"
            :to="albumLink || undefined"
            class="block truncate text-2xl font-bold hover:underline"
            @click="nowPlayingExpanded = false"
          >
            {{ currentTrack.name }}
          </component>
          <p class="mt-1 truncate text-muted-foreground">{{ artistNames }}</p>
        </div>

        <!-- Progreso -->
        <div class="flex w-full max-w-xl items-center gap-3">
          <span class="w-10 text-right text-xs tabular-nums text-muted-foreground">
            {{ formatTime(currentTime) }}
          </span>
          <Slider
            :model-value="sliderValue"
            :max="sliderMax"
            :step="1000"
            class="flex-1"
            aria-label="Progreso de la canción"
            @update:model-value="onSeekInput"
            @value-commit="onSeekCommit"
          />
          <span class="w-10 text-xs tabular-nums text-muted-foreground">
            {{ formatTime(duration) }}
          </span>
        </div>

        <!-- Controles principales -->
        <div class="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            :class="shuffle ? 'text-primary' : 'text-muted-foreground'"
            title="Aleatorio"
            aria-label="Aleatorio"
            :aria-pressed="shuffle"
            @click="toggleShuffle"
          >
            <Shuffle class="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            title="Anterior"
            aria-label="Anterior"
            @click="prevTrack"
          >
            <SkipBack class="size-6" />
          </Button>
          <Button
            size="icon-lg"
            class="size-14 rounded-full"
            :title="isPlaying ? 'Pausar' : 'Reproducir'"
            :aria-label="isPlaying ? 'Pausar' : 'Reproducir'"
            @click="togglePlay"
          >
            <Pause v-if="isPlaying" class="size-6" />
            <Play v-else class="size-6 translate-x-px" />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            title="Siguiente"
            aria-label="Siguiente"
            @click="nextTrack"
          >
            <SkipForward class="size-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            :class="repeat !== 'off' ? 'text-primary' : 'text-muted-foreground'"
            title="Repetir"
            aria-label="Repetir"
            :aria-pressed="repeat !== 'off'"
            @click="cycleRepeat"
          >
            <Repeat1 v-if="repeat === 'one'" class="size-5" />
            <Repeat v-else class="size-5" />
          </Button>
        </div>

        <!-- Controles secundarios -->
        <div class="flex w-full max-w-md items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            :class="autoplay ? 'text-primary' : 'text-muted-foreground'"
            @click="toggleAutoplay"
          >
            <Radio class="size-4" />
            Autoplay
          </Button>

          <div class="flex flex-1 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              :title="isMuted ? 'Activar sonido' : 'Silenciar'"
              :aria-label="isMuted ? 'Activar sonido' : 'Silenciar'"
              :aria-pressed="isMuted"
              @click="toggleMute"
            >
              <VolumeX v-if="isMuted || volume === 0" class="size-4" />
              <Volume2 v-else class="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Bajar volumen"
              aria-label="Bajar volumen"
              @click="changeVolume(-0.1)"
            >
              <Minus class="size-4" />
            </Button>
            <Slider
              :model-value="volumeValue"
              :max="100"
              :step="1"
              class="flex-1"
              aria-label="Volumen"
              @update:model-value="onVolumeInput"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              title="Subir volumen"
              aria-label="Subir volumen"
              @click="changeVolume(0.1)"
            >
              <Plus class="size-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            class="text-muted-foreground"
            @click="openQueueFromHere"
          >
            <ListMusic class="size-4" />
            Cola
          </Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
