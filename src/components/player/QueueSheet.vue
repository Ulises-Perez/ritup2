<script setup lang="ts">
defineOptions({ name: 'QueueSheet' })

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Play, ChevronUp, ChevronDown, X } from '@lucide/vue'
import { usePlayerStore } from '@/store/playerStore'
import { useShell } from '@/composables/useShell'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import SimilarTracks from '@/components/SimilarTracks.vue'

const { queueOpen } = useShell()
const playerStore = usePlayerStore()
const { currentTrack, queue, currentIndex } = storeToRefs(playerStore)

const artistsOf = (t: any) => t?.artists?.map((a: any) => a.name).join(', ') ?? ''

const hasQueue = computed(() => queue.value.length > 0)

const jumpTo = (i: number) => playerStore.playQueueIndex(i)
const removeAt = (i: number) => playerStore.removeFromQueue(i)
const moveUp = (i: number) => playerStore.moveInQueue(i, i - 1)
const moveDown = (i: number) => playerStore.moveInQueue(i, i + 1)
</script>

<template>
  <Sheet v-model:open="queueOpen">
    <SheetContent side="right" class="w-full gap-0 p-0 sm:max-w-md">
      <SheetHeader class="border-b px-5 py-4">
        <SheetTitle>En cola</SheetTitle>
        <SheetDescription class="sr-only"
          >Cola de reproducción y canciones similares</SheetDescription
        >
      </SheetHeader>

      <div class="flex-1 overflow-y-auto px-3 py-3">
        <!-- Sonando ahora -->
        <div v-if="currentTrack" class="mb-4 px-2">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sonando ahora
          </p>
          <div class="flex items-center gap-3 rounded-lg bg-primary/10 p-2">
            <img
              :src="currentTrack.album.images[0]?.url || '/placeholder-album.jpg'"
              :alt="currentTrack.name"
              class="size-11 rounded-md object-cover"
              loading="lazy"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-primary">{{ currentTrack.name }}</p>
              <p class="truncate text-xs text-muted-foreground">{{ artistsOf(currentTrack) }}</p>
            </div>
          </div>
        </div>

        <!-- Lista de la cola -->
        <div v-if="hasQueue" class="mb-6">
          <p class="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Siguiente ({{ queue.length }})
          </p>
          <div class="space-y-0.5">
            <div
              v-for="(t, i) in queue"
              :key="`${t.id}-${i}`"
              class="group flex items-center gap-3 rounded-lg p-2 transition-colors"
              :class="i === currentIndex ? 'bg-accent' : 'hover:bg-accent/60'"
            >
              <button
                class="relative size-10 shrink-0 overflow-hidden rounded-md"
                @click="jumpTo(i)"
              >
                <img
                  :src="t.album?.images?.[0]?.url || '/placeholder-album.jpg'"
                  :alt="t.name"
                  class="size-full object-cover"
                  loading="lazy"
                />
                <span
                  class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Play class="size-4 translate-x-px text-white" />
                </span>
              </button>
              <button class="min-w-0 flex-1 text-left" @click="jumpTo(i)">
                <p
                  class="truncate text-sm font-medium"
                  :class="i === currentIndex ? 'text-primary' : ''"
                >
                  {{ t.name }}
                </p>
                <p class="truncate text-xs text-muted-foreground">{{ artistsOf(t) }}</p>
              </button>
              <div
                class="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  :disabled="i === 0"
                  title="Subir"
                  @click="moveUp(i)"
                >
                  <ChevronUp class="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  :disabled="i === queue.length - 1"
                  title="Bajar"
                  @click="moveDown(i)"
                >
                  <ChevronDown class="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="text-muted-foreground hover:text-destructive"
                  title="Quitar"
                  @click="removeAt(i)"
                >
                  <X class="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="!currentTrack" class="px-2 py-12 text-center text-sm text-muted-foreground">
          No hay nada en la cola
        </div>

        <!-- Canciones similares -->
        <SimilarTracks v-if="currentTrack" />
      </div>
    </SheetContent>
  </Sheet>
</template>
