<script setup lang="ts">
defineOptions({ name: 'TopBar' })

import { useRouter, RouterLink } from 'vue-router'
import { ChevronLeft, ChevronRight, Search } from '@lucide/vue'
import { useShell } from '@/composables/useShell'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const router = useRouter()
const { openPalette } = useShell()
</script>

<template>
  <header
    class="sticky top-0 z-30 grid h-16 grid-cols-3 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6"
  >
    <!-- Izquierda: navegación -->
    <div class="flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" title="Atrás" @click="router.back()">
        <ChevronLeft class="size-5" />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Adelante" @click="router.forward()">
        <ChevronRight class="size-5" />
      </Button>
    </div>

    <!-- Centro: barra de búsqueda centrada (abre la paleta ⌘K) -->
    <button
      class="group mx-auto flex h-9 w-full max-w-md items-center gap-2 rounded-full border bg-card px-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      @click="openPalette"
    >
      <Search class="size-4 shrink-0" />
      <span class="flex-1 truncate text-left">Buscar artistas, canciones, álbumes…</span>
      <kbd class="shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
    </button>

    <!-- Derecha: avatar (acceso al perfil) -->
    <div class="flex items-center justify-end gap-2">
      <RouterLink to="/profile" title="Perfil">
        <Avatar class="size-9 ring-2 ring-transparent transition hover:ring-primary/40">
          <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Perfil" />
          <AvatarFallback>RU</AvatarFallback>
        </Avatar>
      </RouterLink>
    </div>
  </header>
</template>
