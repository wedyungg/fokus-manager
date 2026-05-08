<template>
  <div class="flex items-center justify-center min-h-[70vh]">
    <div class="animate-pulse flex flex-col items-center">
      <div class="w-8 h-8 border-4 border-foreground border-t-transparent rounded-full animate-spin mb-4"></div>
      <p class="text-sm text-muted-foreground">Memuat aplikasi...</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSupabaseUser, navigateTo } from '#imports'

const user = useSupabaseUser()

onMounted(() => {
  if (user.value) {
    navigateTo('/orders')
  } else {
    navigateTo('/login')
  }
})
</script>
