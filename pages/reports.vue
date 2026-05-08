<template>
  <div class="space-y-6 pb-6">
    <!-- Header & Filter -->
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sticky top-16 z-10 bg-background/90 backdrop-blur pt-2 pb-3 border-b border-border">
      <h2 class="text-2xl font-serif font-bold tracking-tight">Laporan Bulanan</h2>
      <div class="flex gap-2">
        <select v-model="selectedMonth" class="bg-muted text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-foreground transition-all font-medium">
          <option v-for="(m, i) in months" :key="i" :value="i">{{ m }}</option>
        </select>
        <select v-model="selectedYear" class="bg-muted text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-foreground transition-all font-medium">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-4 border-muted-foreground/30 border-t-foreground rounded-full animate-spin"></div>
    </div>

    <template v-else>
      <!-- Global Report Card -->
      <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 dark:from-neutral-800/80 dark:to-neutral-900/80 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-neutral-700/50">
        <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        <p class="text-white/60 text-sm font-medium mb-1">Total Net Profit</p>
        <h3 class="text-4xl font-serif font-bold mb-6 tracking-tight text-white">{{ formatCurrency(totals.netProfit) }}</h3>
        
        <div class="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
          <div>
            <p class="text-white/50 text-xs font-medium mb-1">Total Omzet (Bruto)</p>
            <p class="font-semibold text-white/90">{{ formatCurrency(totals.gross) }}</p>
          </div>
          <div>
            <p class="text-white/50 text-xs font-medium mb-1">Total Operasional</p>
            <p class="font-semibold text-white/90">{{ formatCurrency(totals.expenses) }}</p>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div class="bg-background border border-border p-5 rounded-3xl shadow-subtle">
        <h3 class="font-serif text-lg font-bold mb-4">Tren Profit Harian</h3>
        <div class="h-48">
          <Line :data="chartData" :options="chartOptions" v-if="chartData.labels.length > 0" />
          <div v-else class="h-full flex items-center justify-center text-muted-foreground text-sm">
            Tidak ada data untuk grafik bulan ini.
          </div>
        </div>
      </div>

      <!-- Akumulasi Bagi Hasil -->
      <div class="bg-background border border-border p-5 rounded-3xl shadow-subtle">
        <h3 class="font-serif text-lg font-bold mb-4">Akumulasi Bagi Hasil</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-muted p-4 rounded-2xl">
            <p class="text-xs text-muted-foreground font-medium mb-1">Pekerja (30%)</p>
            <p class="font-bold">{{ formatCurrency(totals.netProfit * 0.3) }}</p>
          </div>
          <div class="bg-muted p-4 rounded-2xl">
            <p class="text-xs text-muted-foreground font-medium mb-1">Alat (30%)</p>
            <p class="font-bold">{{ formatCurrency(totals.netProfit * 0.3) }}</p>
          </div>
          <div class="bg-muted p-4 rounded-2xl">
            <p class="text-xs text-muted-foreground font-medium mb-1">Mitra (30%)</p>
            <p class="font-bold">{{ formatCurrency(totals.netProfit * 0.3) }}</p>
          </div>
          <div class="bg-muted p-4 rounded-2xl">
            <p class="text-xs text-muted-foreground font-medium mb-1">Pemodal (10%)</p>
            <p class="font-bold">{{ formatCurrency(totals.netProfit * 0.1) }}</p>
          </div>
        </div>
      </div>

      <!-- Breakdown & Checklist Per Order -->
      <div class="space-y-4">
        <h3 class="font-serif text-lg font-bold pt-2">Breakdown Order & Pembayaran</h3>
        
        <div v-if="orders.length === 0" class="text-center py-10 bg-muted/50 rounded-2xl border border-dashed border-border">
          <p class="text-muted-foreground text-sm">Tidak ada order yang 'Selesai' & 'Lunas' di bulan ini.</p>
        </div>

        <div v-for="order in orders" :key="order.id" class="bg-background border border-border rounded-3xl p-5 shadow-subtle">
          <NuxtLink :to="`/orders/${order.id}`" class="flex justify-between items-start mb-4 group hover:bg-muted/50 p-2 -mx-2 rounded-xl transition-colors">
            <div>
              <h4 class="font-semibold text-base group-hover:text-muted-foreground transition-colors">{{ order.client_name }}</h4>
              <p class="text-xs text-muted-foreground">{{ formatDate(order.event_date) }} • {{ order.service_type }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-muted-foreground mb-0.5">Net Profit</p>
              <p class="font-bold text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">{{ formatCurrency(order.finance?.net_profit || 0) }}</p>
            </div>
          </NuxtLink>
          
          <!-- Checkboxes for Payment Tracking -->
          <div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
            <label class="flex items-center space-x-2 text-sm">
              <input type="checkbox" v-model="order.finance.is_paid_pekerja" @change="updatePayment(order.finance.id, 'is_paid_pekerja', order.finance.is_paid_pekerja)" :disabled="!isAdmin" class="rounded border-border text-foreground focus:ring-foreground bg-background disabled:opacity-50" />
              <span :class="{'text-muted-foreground': !isAdmin}">Pekerja <span class="text-xs opacity-70">({{formatCurrency((order.finance?.net_profit || 0)*0.3)}})</span></span>
            </label>
            <label class="flex items-center space-x-2 text-sm">
              <input type="checkbox" v-model="order.finance.is_paid_alat" @change="updatePayment(order.finance.id, 'is_paid_alat', order.finance.is_paid_alat)" :disabled="!isAdmin" class="rounded border-border text-foreground focus:ring-foreground bg-background disabled:opacity-50" />
              <span :class="{'text-muted-foreground': !isAdmin}">Alat <span class="text-xs opacity-70">({{formatCurrency((order.finance?.net_profit || 0)*0.3)}})</span></span>
            </label>
            <label class="flex items-center space-x-2 text-sm">
              <input type="checkbox" v-model="order.finance.is_paid_mitra" @change="updatePayment(order.finance.id, 'is_paid_mitra', order.finance.is_paid_mitra)" :disabled="!isAdmin" class="rounded border-border text-foreground focus:ring-foreground bg-background disabled:opacity-50" />
              <span :class="{'text-muted-foreground': !isAdmin}">Mitra <span class="text-xs opacity-70">({{formatCurrency((order.finance?.net_profit || 0)*0.3)}})</span></span>
            </label>
            <label class="flex items-center space-x-2 text-sm">
              <input type="checkbox" v-model="order.finance.is_paid_pemodal" @change="updatePayment(order.finance.id, 'is_paid_pemodal', order.finance.is_paid_pemodal)" :disabled="!isAdmin" class="rounded border-border text-foreground focus:ring-foreground bg-background disabled:opacity-50" />
              <span :class="{'text-muted-foreground': !isAdmin}">Pemodal <span class="text-xs opacity-70">({{formatCurrency((order.finance?.net_profit || 0)*0.1)}})</span></span>
            </label>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useSupabaseClient, useSupabaseUser, navigateTo } from '#imports'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const isAdmin = computed(() => user.value?.email === 'mziyan21@gmail.com' || user.value?.user_metadata?.role === 'admin')

const currentDate = new Date()
const selectedMonth = ref(currentDate.getMonth())
const selectedYear = ref(currentDate.getFullYear())

const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const years = computed(() => {
  const current = new Date().getFullYear()
  return [current - 1, current, current + 1]
})

const loading = ref(true)
const orders = ref([])

const totals = computed(() => {
  return orders.value.reduce((acc, order) => {
    const fin = order.finance || {}
    acc.gross += Number(fin.total_gross) || 0
    acc.expenses += Number(fin.expenses) || 0
    acc.netProfit += Number(fin.net_profit) || 0
    return acc
  }, { gross: 0, expenses: 0, netProfit: 0 })
})

const chartData = computed(() => {
  // Group net profit by day of the month
  const daysInMonth = new Date(selectedYear.value, selectedMonth.value + 1, 0).getDate()
  const dailyProfits = Array(daysInMonth).fill(0)
  
  orders.value.forEach(order => {
    const day = new Date(order.event_date).getDate()
    dailyProfits[day - 1] += Number(order.finance?.net_profit || 0)
  })
  
  // Only show chart if there's data
  if (dailyProfits.every(v => v === 0)) return { labels: [], datasets: [] }

  return {
    labels: Array.from({length: daysInMonth}, (_, i) => i + 1),
    datasets: [
      {
        label: 'Net Profit',
        data: dailyProfits,
        borderColor: '#171717', // Foreground color
        backgroundColor: 'rgba(23, 23, 23, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#171717',
        pointRadius: 3
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value) {
          return 'Rp ' + (value / 1000) + 'k'
        },
        font: { size: 10 }
      },
      grid: { color: 'rgba(0,0,0,0.05)' }
    },
    x: {
      grid: { display: false },
      ticks: { font: { size: 10 } }
    }
  }
}

const fetchReportData = async () => {
  loading.value = true
  try {
    // Start and end date for the selected month
    const startOfMonth = new Date(selectedYear.value, selectedMonth.value, 1).toISOString().split('T')[0]
    const endOfMonth = new Date(selectedYear.value, selectedMonth.value + 1, 0).toISOString().split('T')[0]

    // Fetch done & lunas orders within the month
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, client_name, service_type, event_date')
      .eq('status', 'done')
      .eq('payment_status', 'lunas')
      .gte('event_date', startOfMonth)
      .lte('event_date', endOfMonth)
      .order('event_date', { ascending: true })

    if (ordersError) throw ordersError

    if (ordersData.length === 0) {
      orders.value = []
      loading.value = false
      return
    }

    const orderIds = ordersData.map(o => o.id)

    // Fetch related finances
    const { data: financesData, error: financesError } = await supabase
      .from('finances')
      .select('*')
      .in('order_id', orderIds)

    if (financesError) throw financesError

    // Map finances to orders
    orders.value = ordersData.map(o => ({
      ...o,
      finance: financesData.find(f => f.order_id === o.id) || {
        id: null, total_gross: 0, expenses: 0, net_profit: 0, 
        is_paid_alat: false, is_paid_mitra: false, is_paid_pekerja: false, is_paid_pemodal: false
      }
    }))

  } catch (err) {
    console.error('Error fetching report:', err)
  } finally {
    loading.value = false
  }
}

const updatePayment = async (financeId, field, value) => {
  if (!financeId || !isAdmin.value) return
  
  try {
    const { error } = await supabase
      .from('finances')
      .update({ [field]: value })
      .eq('id', financeId)
      
    if (error) throw error
  } catch (err) {
    console.error('Failed to update payment status:', err)
    alert('Gagal mengupdate status pencairan.')
  }
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

watch([selectedMonth, selectedYear], () => {
  fetchReportData()
})

onMounted(() => {
  if (!user.value) {
    navigateTo('/login')
  } else {
    fetchReportData()
  }
})
</script>
