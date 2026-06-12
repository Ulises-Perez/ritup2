<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Music2, Moon, Sun, Server } from '@lucide/vue'
import { useConfigStore } from '@/store/configStore'
import { useApiStore } from '@/store/apiStore'
import { useLibraryStore } from '@/store/libraryStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const configStore = useConfigStore()
const apiStore = useApiStore()
const libraryStore = useLibraryStore()
const { playlists } = storeToRefs(libraryStore)
const { isDarkMode, useInvidious } = storeToRefs(configStore)

const invidiousUrl = ref(localStorage.getItem('invidious-instance') || 'https://inv.nadeko.net')
const invidiousStatus = ref('')

const checkInvidiousStatus = async () => {
  if (!configStore.useInvidious) return
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const response = await fetch(`${invidiousUrl.value}/api/v1/stats`, {
      method: 'HEAD',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    invidiousStatus.value = response.ok ? 'ok' : 'error'
  } catch (error) {
    console.warn('Error al verificar estado de Invidious:', error)
    invidiousStatus.value = 'error'
  }
}

const toggleAPI = async () => {
  configStore.toggleAPI()
  if (configStore.useInvidious) {
    invidiousUrl.value = localStorage.getItem('invidious-instance') || 'https://inv.nadeko.net'
    await checkInvidiousStatus()
  }
  apiStore.initActivePlayer()
}

onMounted(async () => {
  configStore.init()
  apiStore.initActivePlayer()
  if (configStore.useInvidious) await checkInvidiousStatus()
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-8 pb-32">
    <!-- Cabecera -->
    <div class="mb-8 flex items-center gap-5">
      <Avatar class="size-20">
        <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Perfil" />
        <AvatarFallback>RU</AvatarFallback>
      </Avatar>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perfil</p>
        <h1 class="text-3xl font-bold tracking-tight">Mi biblioteca</h1>
        <p class="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Music2 class="size-4" />
          {{ playlists.length }} {{ playlists.length === 1 ? 'playlist' : 'playlists' }}
        </p>
      </div>
    </div>

    <Tabs default-value="appearance">
      <TabsList class="mb-6">
        <TabsTrigger value="appearance">Apariencia</TabsTrigger>
        <TabsTrigger value="playback">Reproducción</TabsTrigger>
      </TabsList>

      <!-- Apariencia -->
      <TabsContent value="appearance">
        <Card>
          <CardHeader>
            <CardTitle>Tema</CardTitle>
            <CardDescription>Cambia entre modo claro y oscuro.</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex items-center justify-between rounded-lg border p-4">
              <div class="flex items-center gap-3">
                <span class="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Moon v-if="isDarkMode" class="size-5" />
                  <Sun v-else class="size-5" />
                </span>
                <div>
                  <p class="text-sm font-medium">{{ isDarkMode ? 'Modo oscuro' : 'Modo claro' }}</p>
                  <p class="text-xs text-muted-foreground">Aplica al instante a toda la app.</p>
                </div>
              </div>
              <Switch :model-value="isDarkMode" @update:model-value="configStore.toggleTheme()" />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Reproducción -->
      <TabsContent value="playback">
        <Card>
          <CardHeader>
            <CardTitle>Fuente de video</CardTitle>
            <CardDescription>Elige entre la API oficial de YouTube e Invidious.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between rounded-lg border p-4">
              <div class="flex items-center gap-3">
                <span class="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Server class="size-5" />
                </span>
                <div>
                  <p class="text-sm font-medium">Usar Invidious</p>
                  <p class="text-xs text-muted-foreground">Alternativa de privacidad a YouTube.</p>
                </div>
              </div>
              <Switch :model-value="useInvidious" @update:model-value="toggleAPI" />
            </div>

            <!-- Estado -->
            <div class="rounded-lg bg-muted/50 p-4 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground">Fuente actual:</span>
                <Badge :variant="useInvidious ? 'default' : 'secondary'">
                  {{ useInvidious ? 'Invidious' : 'YouTube' }}
                </Badge>
                <Badge
                  v-if="useInvidious && invidiousStatus"
                  :variant="invidiousStatus === 'ok' ? 'default' : 'destructive'"
                >
                  {{ invidiousStatus === 'ok' ? 'En línea' : 'Sin conexión' }}
                </Badge>
              </div>
              <p v-if="useInvidious" class="mt-2 text-xs text-muted-foreground">
                Servidor:
                <a :href="invidiousUrl" target="_blank" class="text-primary hover:underline">
                  {{ invidiousUrl }}
                </a>
              </p>
              <p v-else class="mt-2 text-xs text-muted-foreground">
                Servidor: API de YouTube local
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
