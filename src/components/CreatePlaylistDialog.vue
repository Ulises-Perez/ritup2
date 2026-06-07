<script setup lang="ts">
defineOptions({ name: 'CreatePlaylistDialog' })

import { ref, computed, watch, nextTick } from 'vue'
import { ListMusic } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useLibraryStore } from '@/store/libraryStore'
import { useShell } from '@/composables/useShell'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const libraryStore = useLibraryStore()
const { createPlaylistOpen, pendingTrack } = useShell()

const name = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
const canCreate = computed(() => name.value.trim().length > 0)

// Solo fijamos el nombre por defecto al abrir. `pendingTrack` lo gestiona
// openCreatePlaylist (se fija fresco en cada apertura), por eso NO lo anulamos
// aquí al cerrar: así evitamos el parpadeo de la descripción durante la
// animación de salida.
watch(createPlaylistOpen, (open) => {
  if (open) name.value = 'Mi playlist'
})

const submit = () => {
  // Guarda contra doble activación: tras crear cerramos el diálogo, y una
  // segunda invocación (doble clic / Enter repetido) encuentra el diálogo ya
  // cerrado y sale sin crear una segunda playlist.
  if (!canCreate.value || !createPlaylistOpen.value) return
  const playlistName = name.value.trim()
  const id = libraryStore.createPlaylist(playlistName)
  if (pendingTrack.value) {
    libraryStore.addTrack(id, pendingTrack.value)
    toast.success(`Playlist «${playlistName}» creada · canción añadida`)
  } else {
    toast.success(`Playlist «${playlistName}» creada`)
  }
  createPlaylistOpen.value = false
}

// Único mecanismo de foco: el evento de reka-ui al abrir el contenido.
// Prevenimos el foco por defecto (botón cerrar) y enfocamos/seleccionamos el input.
const onContentOpenAutoFocus = (e: Event) => {
  e.preventDefault()
  nextTick(() => {
    inputEl.value?.focus()
    inputEl.value?.select()
  })
}
</script>

<template>
  <Dialog v-model:open="createPlaylistOpen">
    <DialogContent class="max-w-md" @open-auto-focus="onContentOpenAutoFocus">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <ListMusic class="size-5 text-primary" />
          Nueva playlist
        </DialogTitle>
        <DialogDescription>
          {{
            pendingTrack
              ? 'Crea una playlist y añade esta canción.'
              : 'Ponle un nombre a tu nueva playlist.'
          }}
        </DialogDescription>
      </DialogHeader>

      <input
        ref="inputEl"
        v-model="name"
        type="text"
        aria-label="Nombre de la playlist"
        placeholder="Nombre de la playlist"
        maxlength="80"
        class="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-10 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-3"
        @keydown.enter="submit"
      />

      <DialogFooter>
        <Button variant="ghost" @click="createPlaylistOpen = false">Cancelar</Button>
        <Button :disabled="!canCreate" @click="submit">Crear playlist</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
