<template>
  <div class="flex items-center justify-center min-h-[70vh]">
    <div class="flex flex-col items-center">
      <div class="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-3"></div>
      <p class="text-sm text-muted-foreground">Memuat aplikasi...</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSupabaseClient, useSupabaseUser, navigateTo } from '#imports'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

onMounted(async () => {
  if (user.value) {
    return navigateTo('/orders', { replace: true })
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    navigateTo('/orders', { replace: true })
  } else {
    navigateTo('/login', { replace: true })
  }
})
</script>

