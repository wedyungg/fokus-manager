<template>
  <div class="flex flex-col justify-center min-h-[80vh] max-w-md mx-auto w-full">
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-serif font-bold mb-2">Fokus Manager</h1>
      <p class="text-muted-foreground text-sm">Masuk untuk mengelola alur kerja lapangan Anda.</p>
    </div>

    <div class="bg-background border border-border rounded-2xl p-6 md:p-8 shadow-subtle">
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="identifier" class="block text-sm font-medium mb-1.5">Username atau Email</label>
          <input 
            id="identifier" 
            v-model="identifier" 
            type="text" 
            required 
            placeholder="namauser atau email@anda.com"
            class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-[border-color,box-shadow] duration-150 ease-emil-out font-sans"
          />
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium mb-1.5">Password</label>
          <input 
            id="password" 
            v-model="password" 
            type="password" 
            required 
            placeholder="••••••••"
            class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-[border-color,box-shadow] duration-150 ease-emil-out"
          />
        </div>

        <Transition name="popover">
          <div v-if="errorMsg" class="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900">
            {{ errorMsg }}
          </div>
        </Transition>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full py-3 px-4 bg-foreground text-background rounded-xl font-medium hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground flex justify-center items-center mt-2 disabled:opacity-70"
        >
          <span v-if="loading" class="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2"></span>
          {{ loading ? 'Memproses...' : 'Masuk' }}
        </button>
      </form>
      
      <div class="mt-6 text-center text-sm text-muted-foreground">
        Belum punya akun? Hubungi Admin untuk pendaftaran.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSupabaseClient, useSupabaseUser, navigateTo } from '#imports'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const identifier = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

// Otomatis arahkan ke /orders jika sesi user sudah aktif / terdeteksi
watch(user, (newUser) => {
  if (newUser) {
    navigateTo('/orders', { replace: true })
  }
}, { immediate: true })

const handleLogin = async () => {
  loading.value = true
  errorMsg.value = ''
  
  try {
    let loginEmail = identifier.value.trim()

    // 1. Cek apakah identifier adalah email menggunakan regex
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)

    // 2. Jika bukan email → lookup username via server endpoint (bypass RLS)
    if (!isEmail) {
      const result = await $fetch('/api/auth/resolve-username', {
        method: 'POST',
        body: { username: loginEmail }
      })

      if (result.error || !result.email) {
        throw new Error(result.error || 'Username tidak ditemukan.')
      }
      
      loginEmail = result.email
    }

    // 3. Login dengan email yang sudah diketahui
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password.value,
    })
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Password salah. Periksa kembali dan coba lagi.')
      }
      throw error
    }
    
    // Pastikan sesi tersinkronisasi dan langsung navigasi ke /orders (beranda)
    if (authData?.session) {
      await navigateTo('/orders', { replace: true })
    }
  } catch (error) {
    errorMsg.value = error.message
    loading.value = false
  }
}
</script>

