<template>
  <div class="col-span-2 bg-[#181818] overflow-y-auto rounded-lg">
    <div class="p-4">
      <h2 class="text-white font-bold mb-4">{{ title }}</h2>
      <div class="space-y-4">
        <div class="space-y-2">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full bg-[#282828] flex items-center justify-center">
              <span class="text-white/60">👤</span>
            </div>
            <div>
              <p class="text-white text-sm">Usuario 1</p>
              <p class="text-white/60 text-xs">Escuchando ahora</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Amigos activos'
})
</script>
