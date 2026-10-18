<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-serif font-bold tracking-tight mb-6">Profile</h2>
    
    <div v-if="user || profile" class="space-y-6">
      <!-- User Info Card -->
      <div class="bg-background border border-border p-6 md:p-8 rounded-2xl shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-6">
        <div class="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div class="w-16 h-16 md:w-20 md:h-20 bg-muted rounded-full flex items-center justify-center border border-border shrink-0">
            <IconUser class="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
          </div>
          <div>
            <h3 class="font-serif text-xl md:text-2xl font-bold">{{ user?.email }}</h3>
            <div class="mt-1.5">
              <span v-if="loading" class="text-xs text-muted-foreground uppercase tracking-wider font-semibold animate-pulse">Loading...</span>
              <span v-else-if="profile?.role === 'admin'" class="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full bg-foreground text-background">
                Administrator
              </span>
              <span v-else class="inline-block px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-full bg-muted text-muted-foreground border border-border">
                Staff / Editor
              </span>
            </div>
          </div>
        </div>

        <button 
          @click="handleLogout"
          class="w-full sm:w-auto px-6 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-foreground hover:text-background border border-border shrink-0"
        >
          Keluar (Logout)
        </button>
      </div>

      <!-- Admin All-Time Revenue & Monthly Chart Grid -->
      <div v-if="profile?.role === 'admin'" class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div class="lg:col-span-6 w-full bg-gradient-to-br from-neutral-900 to-black text-white dark:from-neutral-800/90 dark:to-neutral-950 rounded-3xl p-6 shadow-xl border border-neutral-800 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <p class="text-white/60 text-xs font-medium mb-1 tracking-widest uppercase">Total Pendapatan Bersih Keseluruhan</p>
            <h3 class="text-3xl md:text-4xl font-serif font-bold mb-6 tracking-tight text-white tabular-nums">
              {{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(revenue.net) }}
            </h3>
            
            <div class="grid grid-cols-2 gap-3.5 mb-6 tabular-nums">
              <div class="bg-white/5 rounded-xl p-3 border border-white/10">
                <p class="text-white/50 text-[10px] font-medium mb-1 uppercase tracking-wider">Pekerja (30%)</p>
                <p class="font-semibold text-white/90 text-sm">{{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(revenue.net * 0.30) }}</p>
              </div>
              <div class="bg-white/5 rounded-xl p-3 border border-white/10">
                <p class="text-white/50 text-[10px] font-medium mb-1 uppercase tracking-wider">Alat (30%)</p>
                <p class="font-semibold text-white/90 text-sm">{{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(revenue.net * 0.30) }}</p>
              </div>
              <div class="bg-white/5 rounded-xl p-3 border border-white/10">
                <p class="text-white/50 text-[10px] font-medium mb-1 uppercase tracking-wider">Mitra (30%)</p>
                <p class="font-semibold text-white/90 text-sm">{{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(revenue.net * 0.30) }}</p>
              </div>
              <div class="bg-white/5 rounded-xl p-3 border border-white/10">
                <p class="text-white/50 text-[10px] font-medium mb-1 uppercase tracking-wider">Pemodal (10%)</p>
                <p class="font-semibold text-white/90 text-sm">{{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(revenue.net * 0.10) }}</p>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-white/10 tabular-nums">
             <p class="text-white/50 text-xs font-medium mb-1">Total Omzet (Bruto)</p>
             <p class="font-semibold text-white/90">{{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(revenue.gross) }}</p>
          </div>
        </div>

        <div class="lg:col-span-6 w-full bg-background border border-border p-6 rounded-3xl shadow-subtle flex flex-col justify-between">
          <h3 class="font-serif text-lg font-bold mb-4">Tren Profit Bulanan</h3>
          <div class="h-56 lg:h-64 w-full">
            <Line :data="chartData" :options="chartOptions" v-if="chartData.labels.length > 0" />
            <div v-else class="h-full flex items-center justify-center text-muted-foreground text-sm">
              Tidak ada data grafik.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSupabaseClient, useSupabaseUser, useColorMode, navigateTo } from '#imports'
import { User as IconUser } from 'lucide-vue-next'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const colorMode = useColorMode()
const profile = ref(null)
const loading = ref(true)
const revenue = ref({ gross: 0, net: 0 })
const rawFinances = ref([])
const debugError = ref(null)

const fetchProfile = async () => {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (!authUser || !authUser.id) {
      debugError.value = "Failed to get auth user ID"
      navigateTo('/login', { replace: true })
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
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
      .select('total_gross, net_profit, orders!inner(status, event_date)')
      .eq('orders.status', 'done')
      
    if (data) {
      rawFinances.value = data
      const gross = data.reduce((sum, item) => sum + (Number(item.total_gross) || 0), 0)
      const net = data.reduce((sum, item) => sum + (Number(item.net_profit) || 0), 0)
      revenue.value = { gross, net }
    }
  } catch (e) {
    console.error('Failed to fetch revenue', e)
  }
}

const chartData = computed(() => {
  if (!rawFinances.value.length) return { labels: [], datasets: [] }

  const monthlyData = {}
  rawFinances.value.forEach(item => {
    const dateStr = item.orders?.event_date
    if (!dateStr) return
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const key = `${year}-${month}`
    
    if (!monthlyData[key]) monthlyData[key] = 0
    monthlyData[key] += Number(item.net_profit) || 0
  })

  const sortedKeys = Object.keys(monthlyData).sort()
  const labels = sortedKeys.map(key => {
    const [year, month] = key.split('-')
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
  })
  
  const dataPoints = sortedKeys.map(key => monthlyData[key])

  const isDark = colorMode.value === 'dark'
  const lineColor = isDark ? '#fafafa' : '#171717'
  const fillColor = isDark ? 'rgba(250, 250, 250, 0.08)' : 'rgba(23, 23, 23, 0.06)'

  return {
    labels,
    datasets: [{
      label: 'Net Profit',
      data: dataPoints,
      borderColor: lineColor,
      backgroundColor: fillColor,
      borderWidth: 2,
      tension: 0.3,
      fill: true,
      pointBackgroundColor: lineColor,
      pointRadius: 4
    }]
  }
})

const chartOptions = computed(() => {
  const isDark = colorMode.value === 'dark'
  const tickColor = isDark ? '#a3a3a3' : '#737373'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: tickColor,
          callback: value => 'Rp ' + (value / 1000) + 'k',
          font: { size: 10 }
        },
        grid: { color: gridColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: tickColor, font: { size: 10 } }
      }
    }
  }
})

onMounted(async () => {
  if (user.value) {
    fetchProfile()
    return
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    navigateTo('/login', { replace: true })
  } else {
    fetchProfile()
  }
})

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigateTo('/login', { replace: true })
}
</script>

