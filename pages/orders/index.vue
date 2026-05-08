<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-serif font-bold tracking-tight">Daftar Order</h2>
      <NuxtLink to="/orders/create" class="bg-foreground text-background px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors flex items-center shadow-subtle">
        <IconPlus class="w-4 h-4 mr-2" /> Order Baru
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-4 border-muted-foreground/30 border-t-foreground rounded-full animate-spin"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm dark:bg-red-950/30 dark:border-red-900">
      {{ error }}
    </div>

    <!-- Empty State -->
    <div v-else-if="orders.length === 0" class="bg-background border border-border rounded-2xl p-10 text-center shadow-subtle">
      <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <IconBriefcase class="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 class="font-medium text-lg mb-1">Belum ada order</h3>
      <p class="text-muted-foreground text-sm mb-6">Mulai alur kerja Anda dengan membuat order pertama.</p>
      <NuxtLink to="/orders/create" class="inline-flex items-center text-sm font-medium bg-foreground text-background px-4 py-2 rounded-xl hover:bg-foreground/90 transition-colors">
        <IconPlus class="w-4 h-4 mr-2" /> Buat Order
      </NuxtLink>
    </div>

    <!-- Order List -->
    <div v-else class="grid gap-4">
      <NuxtLink 
        v-for="order in orders" 
        :key="order.id"
        :to="`/orders/${order.id}`"
        class="bg-background border border-border rounded-2xl p-5 hover:border-foreground/30 hover:shadow-subtle transition-all block group"
      >
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="font-serif text-lg font-semibold group-hover:text-muted-foreground transition-colors">{{ order.client_name }}</h3>
            <p class="text-sm text-muted-foreground">{{ order.service_type }}</p>
          </div>
          <span 
            class="px-2.5 py-1 text-xs font-medium rounded-full border"
            :class="order.status === 'done' ? 'bg-foreground text-background border-foreground' : 'bg-muted text-foreground border-border'"
          >
            {{ order.status === 'done' ? 'Selesai' : 'Aktif' }}
          </span>
        </div>
        
        <div class="flex items-center text-sm text-muted-foreground">
          <IconCalendar class="w-4 h-4 mr-2" />
          {{ formatDate(order.event_date) }}
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSupabaseClient, useSupabaseUser, navigateTo } from '#imports'
import { Plus as IconPlus, Briefcase as IconBriefcase, Calendar as IconCalendar } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const orders = ref([])
const loading = ref(true)
const error = ref('')

const fetchOrders = async () => {
  try {
    loading.value = true
    const { data, error: err } = await supabase
      .from('orders')
      .select('*')
      .or('status.neq.done,payment_status.neq.lunas')
      .order('created_at', { ascending: false })
      
    if (err) throw err
    
    orders.value = data || []
  } catch (err) {
    error.value = 'Gagal memuat order: ' + err.message
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  return new Date(dateString).toLocaleDateString('id-ID', options)
}

onMounted(() => {
  if (!user.value) {
    navigateTo('/login')
  } else {
    fetchOrders()
  }
})
</script>
