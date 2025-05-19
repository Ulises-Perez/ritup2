<script setup lang="ts">
import Library from '../components/Library.vue'
import HomeView from '../components/HomeView.vue'
import ActiveFriends from '../components/ActiveFriends.vue'
</script>

<template>
  <div class="pt-20">
    <div class="grid grid-cols-12 gap-2 px-2 h-full">
      <!-- Grid lateral izquierdo -->
      <Library />

      <!-- Grid central -->
      <div class="col-span-8 bg-[#181818] rounded-lg h-[calc(100vh-9rem)] overflow-y-auto">
        <div class="px-6 py-4">
          <HomeView />
        </div>
      </div>

      <!-- Grid lateral derecho -->
      <ActiveFriends />
    </div>
  </div>
</template>

<style>
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #ffffff20;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #ffffff30;
}
</style>
