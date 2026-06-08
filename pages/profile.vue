<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-serif font-bold tracking-tight mb-6">Profile</h2>
    
    <div v-if="user" class="bg-background border border-border p-6 rounded-2xl shadow-subtle flex flex-col items-center">
      <div class="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4 border border-border">
        <IconUser class="w-10 h-10 text-muted-foreground" />
      </div>
      
      <h3 class="font-serif text-xl font-bold">{{ user.email }}</h3>
      <p class="text-muted-foreground text-sm mb-4 uppercase tracking-wider font-semibold">
        <span v-if="loading" class="animate-pulse">Loading...</span>
        <span v-else-if="profile?.role === 'admin'" class="text-amber-600 dark:text-amber-500">Administrator</span>
        <span v-else>Staff / Editor</span>
      </p>

      <div v-if="!loading && profile?.role !== 'admin'" class="bg-red-50 border border-red-100 p-3 rounded-lg mb-6 w-full text-center">
        <p class="text-xs text-red-600 font-mono">DB Role: {{ profile ? profile.role : 'NULL' }}</p>
        <p v-if="debugError" class="text-xs text-red-600 font-mono mt-1">Err: {{ debugError }}</p>
      </div>
      
      <div v-if="profile?.role === 'admin'" class="w-full bg-gradient-to-br from-neutral-900 to-black text-white dark:from-neutral-800 dark:to-neutral-900 rounded-3xl p-6 mb-8 shadow-xl border border-neutral-800 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <p class="text-white/60 text-xs font-medium mb-1 tracking-widest uppercase">Total Pendapatan Keseluruhan</p>
        <h3 class="text-3xl font-serif font-bold mb-4 tracking-tight text-amber-400">
          {{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(revenue.net) }}
        </h3>
        
        <div class="pt-4 border-t border-white/10">
           <p class="text-white/50 text-xs font-medium mb-1">Total Omzet (Bruto)</p>
           <p class="font-semibold text-white/90">{{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(revenue.gross) }}</p>
        </div>
      </div>

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
import { ref, onMounted } from 'vue'
import { useSupabaseClient, useSupabaseUser, navigateTo } from '#imports'
import { User as IconUser } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const profile = ref(null)
const loading = ref(true)
const revenue = ref({ gross: 0, net: 0 })
const debugError = ref(null)

const fetchProfile = async () => {
  if (!user.value) return
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.value.id)
      .single()
      
    if (error) {
      debugError.value = error.message
    }

    if (data) {
      profile.value = data
      if (data.role === 'admin') {
        fetchRevenue()
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchRevenue = async () => {
  try {
    const { data, error } = await supabase
      .from('finances')
      .select('total_gross, net_profit, orders!inner(status)')
      .eq('orders.status', 'done')
      
    if (data) {
      const gross = data.reduce((sum, item) => sum + (Number(item.total_gross) || 0), 0)
      const net = data.reduce((sum, item) => sum + (Number(item.net_profit) || 0), 0)
      revenue.value = { gross, net }
    }
  } catch (e) {
    console.error('Failed to fetch revenue', e)
  }
}

onMounted(() => {
  if (!user.value) {
    navigateTo('/login')
  } else {
    fetchProfile()
  }
})

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>
