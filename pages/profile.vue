<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-serif font-bold tracking-tight mb-6">Profile</h2>
    
    <div v-if="user" class="bg-background border border-border p-6 rounded-2xl shadow-subtle flex flex-col items-center">
      <div class="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4 border border-border">
        <IconUser class="w-10 h-10 text-muted-foreground" />
      </div>
      
      <h3 class="font-serif text-xl font-bold">{{ user.email }}</h3>
      <p class="text-muted-foreground text-sm mb-6">Staff / Editor</p>
      
      <button 
        @click="handleLogout"
        class="w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors border border-red-100 dark:bg-red-950/30 dark:border-red-900"
      >
        Keluar (Logout)
      </button>
    </div>
  </div>
</template>

<script setup>
import { useSupabaseClient, useSupabaseUser, navigateTo } from '#imports'
import { User as IconUser } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>
