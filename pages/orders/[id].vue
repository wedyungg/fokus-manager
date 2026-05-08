<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between mb-2">
      <div>
        <h2 class="text-2xl font-serif font-bold tracking-tight leading-tight">{{ order?.client_name || 'Loading...' }}</h2>
        <p class="text-sm text-muted-foreground">{{ order?.service_type }} • {{ formatDate(order?.event_date) }}</p>
        <div v-if="order?.location || order?.client_phone" class="flex flex-wrap gap-3 mt-2">
          <span v-if="order?.location" class="text-xs text-muted-foreground flex items-center">
            <IconMapPin class="w-3 h-3 mr-1" /> {{ order.location }}
          </span>
          <a v-if="order?.client_phone" :href="`https://wa.me/${order.client_phone.replace(/[^0-9]/g, '')}`" target="_blank" rel="noopener" class="text-xs text-green-600 dark:text-green-400 flex items-center hover:underline">
            <IconPhone class="w-3 h-3 mr-1" /> {{ order.client_phone }}
          </a>
        </div>
      </div>
      <div v-if="order?.status === 'done'" class="bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded-md tracking-wider uppercase">
        Selesai
      </div>
    </div>
    
    <!-- Link Selection Box for Client (Visible when done) -->
    <div v-if="order?.status === 'done' && order?.client_selection_link" class="bg-blue-50 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900 rounded-xl p-4 mb-4 shadow-subtle">
      <h3 class="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-2 flex items-center">
        <IconLink class="w-3.5 h-3.5 mr-1" /> Link Pemilihan Foto Klien
      </h3>
      <div class="flex items-center gap-2">
        <input type="text" readonly :value="order.client_selection_link" class="flex-1 bg-white dark:bg-black/20 border border-blue-200 dark:border-blue-800 text-xs px-3 py-2 rounded-lg text-muted-foreground outline-none cursor-text select-all" />
        <button @click="copyLink(order.client_selection_link)" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shadow-sm active:scale-95">
          {{ copied ? 'Tersalin!' : 'Copy' }}
        </button>
      </div>
      <p class="text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-2">Maksimal pilihan: {{ order.max_selections }} foto</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-4 border-muted-foreground/30 border-t-foreground rounded-full animate-spin"></div>
    </div>

    <template v-else-if="order">
      <!-- Actions / Nav inside Order -->
      <div class="flex gap-2 pb-2 overflow-x-auto snap-x hide-scrollbar">
        <button 
          @click="activeTab = 'shotlist'"
          class="snap-start whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all"
          :class="activeTab === 'shotlist' ? 'bg-foreground text-background shadow-subtle' : 'bg-muted text-muted-foreground hover:bg-muted/80'"
        >
          Shotlist
        </button>
        <button 
          @click="activeTab = 'finance'"
          class="snap-start whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center"
          :class="activeTab === 'finance' ? 'bg-foreground text-background shadow-subtle' : 'bg-muted text-muted-foreground hover:bg-muted/80'"
        >
          <IconDollarSign class="w-4 h-4 mr-1.5" /> Finansial
        </button>
        <NuxtLink 
          to="/references"
          class="snap-start whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all flex items-center"
        >
          <IconImage class="w-4 h-4 mr-1.5" /> Referensi
        </NuxtLink>
      </div>


      <div v-if="activeTab === 'shotlist'">
        <!-- Progress Bar -->
        <div class="bg-background border border-border p-5 rounded-2xl shadow-subtle mb-6">
          <div class="flex justify-between text-sm mb-3">
            <span class="font-medium">Progress Lapangan</span>
            <span class="font-medium">{{ progressPercentage }}%</span>
          </div>
          <div class="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div class="bg-foreground h-1.5 rounded-full transition-all duration-500 ease-out" :style="{ width: `${progressPercentage}%` }"></div>
          </div>
          <p class="text-xs text-muted-foreground mt-3">{{ completedTasksCount }} dari {{ tasks.length }} momen terekam</p>
        </div>

        <!-- Shotlist Categories -->
        <div class="space-y-6">
          <div v-for="category in ['Wajib', 'Secondary', 'Kreatif']" :key="category">
            <div v-if="tasksByCategory[category] && tasksByCategory[category].length > 0">
              <h3 class="font-serif text-lg font-semibold mb-3 flex items-center">
                <IconStar v-if="category === 'Wajib'" class="w-4 h-4 mr-2 text-foreground" />
                <IconCircle v-else-if="category === 'Secondary'" class="w-4 h-4 mr-2 text-muted-foreground" />
                <IconSparkles v-else-if="category === 'Kreatif'" class="w-4 h-4 mr-2 text-foreground" />
                {{ category }}
                <span class="ml-2 px-2 py-0.5 text-[10px] font-sans bg-muted text-muted-foreground rounded-full">
                  {{ tasksByCategory[category].filter(t => t.is_completed).length }}/{{ tasksByCategory[category].length }}
                </span>
              </h3>
              
              <div class="bg-background border border-border rounded-2xl overflow-hidden shadow-subtle">
                <div 
                  v-for="(task, index) in tasksByCategory[category]" 
                  :key="task.id"
                  @click="toggleTask(task)"
                  class="flex items-center p-4 cursor-pointer hover:bg-muted/30 transition-colors group"
                  :class="{ 'border-t border-border': index !== 0 }"
                >
                  <div class="mr-4 transition-transform group-hover:scale-110">
                    <IconCheckCircle2 v-if="task.is_completed" class="w-5 h-5 text-foreground transition-all" />
                    <IconCircle v-else class="w-5 h-5 text-muted-foreground transition-all group-hover:text-foreground" />
                  </div>
                  <div class="flex-1">
                    <span 
                      class="block text-sm font-medium transition-all"
                      :class="task.is_completed ? 'text-muted-foreground line-through opacity-60' : 'text-foreground'"
                    >
                      {{ task.task_name }}
                    </span>
                    <p v-if="task.technical_note && !task.is_completed" class="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {{ task.technical_note }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="activeTab === 'finance'" class="space-y-6">
        <div class="bg-background border border-border p-5 rounded-2xl shadow-subtle space-y-4">
          <div class="flex justify-between items-center border-b border-border pb-4 mb-4">
            <h3 class="font-serif text-lg font-semibold">Input Keuangan</h3>
            <div v-if="order" class="flex items-center bg-muted rounded-lg p-1 text-xs">
              <button 
                @click="updatePaymentStatus('dp')"
                class="px-3 py-1.5 rounded-md font-medium transition-all"
                :class="order.payment_status === 'dp' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
              >DP</button>
              <button 
                @click="updatePaymentStatus('lunas')"
                class="px-3 py-1.5 rounded-md font-medium transition-all"
                :class="order.payment_status === 'lunas' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
              >Lunas</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Total Nilai Kontrak (Bruto)</label>
            <div class="relative">
              <span class="absolute left-4 top-3 text-muted-foreground">Rp</span>
              <input 
                :value="formatCurrencyNumber(financeData.total_gross)"
                @input="handleGrossInput"
                type="text" 
                inputmode="numeric"
                class="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-all"
              />
            </div>
          </div>
          
          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="block text-sm font-medium">Biaya Operasional (Uang Keluar)</label>
              <button @click="addExpense" class="text-xs px-3 py-1.5 bg-foreground text-background rounded-lg font-medium shadow-subtle hover:bg-foreground/90 transition-colors flex items-center">
                <IconPlus class="w-3 h-3 mr-1" /> Tambah
              </button>
            </div>
            
            <div class="space-y-3 mb-3">
              <div v-for="(exp, idx) in financeData.expenses_list" :key="idx" class="flex gap-2 items-start group">
                <input 
                  v-model="exp.name" 
                  placeholder="Misal: Bensin" 
                  class="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-foreground transition-all" 
                />
                <div class="relative w-2/5">
                  <span class="absolute left-3 top-2.5 text-xs text-muted-foreground">Rp</span>
                  <input 
                    :value="formatCurrencyNumber(exp.amount)" 
                    @input="(e) => handleExpenseInput(e, idx)" 
                    type="text" 
                    inputmode="numeric"
                    placeholder="0"
                    class="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-red-500 font-mono" 
                  />
                </div>
                <button 
                  @click="removeExpense(idx)" 
                  class="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                  title="Hapus"
                >
                  <IconTrash2 class="w-4 h-4" />
                </button>
              </div>
              
              <div v-if="financeData.expenses_list.length === 0" class="text-center py-4 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
                Belum ada pengeluaran yang dicatat.
              </div>
            </div>
            
            <div class="flex justify-between items-center mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/50">
              <span class="text-sm font-medium text-red-600 dark:text-red-400">Total Pengeluaran</span>
              <span class="text-sm font-bold text-red-600 dark:text-red-400 font-mono">-{{ formatCurrency(financeData.expenses) }}</span>
            </div>
          </div>

          <div class="pt-2">
            <button 
              @click="saveFinance" 
              :disabled="savingFinance"
              class="w-full py-3 bg-foreground text-background rounded-xl font-medium hover:bg-foreground/90 transition-all flex justify-center items-center disabled:opacity-70"
            >
              <span v-if="savingFinance" class="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2"></span>
              {{ savingFinance ? 'Menyimpan...' : 'Simpan Data Keuangan' }}
            </button>
          </div>
        </div>

        <div class="bg-background border border-border p-6 rounded-2xl shadow-subtle relative overflow-hidden">
          <!-- "Receipt" Top Edge Decoration -->
          <div class="absolute top-0 left-0 right-0 h-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjQiPjxwYXRoIGQ9Ik0wIDRMNCBMMCAweiIgZmlsbD0iI2U1ZTVlNSIvPjwvc3ZnPg==')] repeat-x opacity-50 dark:opacity-20"></div>
          
          <div class="text-center mb-6 pt-2">
            <h3 class="font-serif text-xl font-bold uppercase tracking-widest text-foreground/80">Laporan Finansial</h3>
            <p class="text-xs text-muted-foreground mt-1 tracking-wider font-mono">FOKUS-MGR-{{ order.id.split('-')[0].toUpperCase() }}</p>
          </div>
          
          <!-- Bruto & Expenses Summary -->
          <div class="space-y-2 mb-4 font-mono text-sm border-b border-dashed border-border/60 pb-4">
            <div class="flex justify-between">
              <span class="text-muted-foreground">BRUTO</span>
              <span>{{ formatCurrency(financeData.total_gross) }}</span>
            </div>
            <div class="flex justify-between text-red-500/80">
              <span>BIAYA OPS.</span>
              <span>-{{ formatCurrency(financeData.expenses) }}</span>
            </div>
          </div>
          
          <!-- Nett Profit -->
          <div class="flex justify-between items-center mb-6 pb-6 border-b-2 border-border/80">
            <span class="text-sm font-bold uppercase tracking-wider">Nett Profit</span>
            <span class="font-bold text-xl font-mono">{{ formatCurrency(financeData.net_profit) }}</span>
          </div>
          
          <!-- Splits -->
          <div class="space-y-4">
            <div class="flex justify-between items-center group">
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center mr-3 border border-border/50 group-hover:bg-foreground group-hover:text-background transition-colors">
                  <IconUsers class="w-4 h-4" />
                </div>
                <div>
                  <div class="text-sm font-semibold">Pekerja</div>
                  <div class="text-[10px] text-muted-foreground uppercase tracking-widest">30% • Fee Tim</div>
                </div>
              </div>
              <span class="font-mono font-medium">{{ formatCurrency(splits.pekerja) }}</span>
            </div>
            
            <div class="flex justify-between items-center group">
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center mr-3 border border-border/50 group-hover:bg-foreground group-hover:text-background transition-colors">
                  <IconCamera class="w-4 h-4" />
                </div>
                <div>
                  <div class="text-sm font-semibold">Alat</div>
                  <div class="text-[10px] text-muted-foreground uppercase tracking-widest">30% • Maintenance</div>
                </div>
              </div>
              <span class="font-mono font-medium">{{ formatCurrency(splits.alat) }}</span>
            </div>
            
            <div class="flex justify-between items-center group">
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center mr-3 border border-border/50 group-hover:bg-foreground group-hover:text-background transition-colors">
                  <IconBriefcase class="w-4 h-4" />
                </div>
                <div>
                  <div class="text-sm font-semibold">Mitra</div>
                  <div class="text-[10px] text-muted-foreground uppercase tracking-widest">30% • Manajemen</div>
                </div>
              </div>
              <span class="font-mono font-medium">{{ formatCurrency(splits.mitra) }}</span>
            </div>
            
            <div class="flex justify-between items-center group">
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center mr-3 border border-border/50 group-hover:bg-foreground group-hover:text-background transition-colors">
                  <IconWallet class="w-4 h-4" />
                </div>
                <div>
                  <div class="text-sm font-semibold">Pemodal</div>
                  <div class="text-[10px] text-muted-foreground uppercase tracking-widest">10% • Investor</div>
                </div>
              </div>
              <span class="font-mono font-medium">{{ formatCurrency(splits.pemodal) }}</span>
            </div>
          </div>
          
          <div class="mt-8 text-center border-t border-dashed border-border/60 pt-4">
            <p class="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">=== TERIMA KASIH ===</p>
          </div>
        </div>
      </div>
      
      <!-- Complete Order Button -->
      <div v-if="order && order.status !== 'done'" class="mt-8 pt-4 border-t border-border">
        <button 
          @click="showCompleteModal = true"
          class="w-full py-4 bg-foreground text-background rounded-2xl font-bold tracking-wide hover:bg-foreground/90 transition-all flex justify-center items-center shadow-lg active:scale-[0.98]"
        >
          <IconCheckCircle2 class="w-5 h-5 mr-2" /> SELESAIKAN ORDER
        </button>
      </div>

    </template>
    
    <!-- Completion Modal -->
    <div v-if="showCompleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div class="bg-background border border-border rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="p-6">
          <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <IconCheckCircle2 class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 class="text-xl font-serif font-bold mb-1">Selesaikan Order</h3>
          <p class="text-sm text-muted-foreground mb-6">Masukkan link Google Drive hasil foto untuk men-generate link pemilihan klien via GAS.</p>
          
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Link Google Drive</label>
              <input v-model="completionForm.driveLink" type="text" placeholder="https://drive.google.com/drive/folders/..." class="w-full px-4 py-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-all" />
            </div>
            <div>
              <label class="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Kuota Pilih Foto</label>
              <input v-model.number="completionForm.maxSelections" type="number" placeholder="50" class="w-full px-4 py-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-all" />
            </div>
          </div>
          
          <div class="mt-8 flex gap-3">
            <button @click="showCompleteModal = false" class="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors">
              Batal
            </button>
            <button @click="submitCompletion" :disabled="completingOrder || !completionForm.driveLink || !completionForm.maxSelections" class="flex-1 py-3 bg-foreground text-background rounded-xl font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
              <span v-if="completingOrder" class="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2"></span>
              {{ completingOrder ? 'Proses...' : 'Selesai' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useSupabaseClient } from '#imports'
import { 
  ArrowLeft as IconArrowLeft, 
  DollarSign as IconDollarSign, 
  Image as IconImage,
  Star as IconStar,
  Circle as IconCircle,
  Sparkles as IconSparkles,
  CheckCircle2 as IconCheckCircle2,
  Camera as IconCamera,
  Users as IconUsers,
  Briefcase as IconBriefcase,
  Wallet as IconWallet,
  Plus as IconPlus,
  Trash2 as IconTrash2,
  Link as IconLink,
  MapPin as IconMapPin,
  Phone as IconPhone
} from 'lucide-vue-next'

const route = useRoute()
const supabase = useSupabaseClient()
const orderId = route.params.id

const order = ref(null)
const tasks = ref([])
const financeData = ref({ id: null, total_gross: 0, expenses: 0, net_profit: 0, expenses_list: [] })
const splits = ref({ alat: 0, mitra: 0, pekerja: 0, pemodal: 0 })

const loading = ref(true)
const savingFinance = ref(false)
const activeTab = ref('shotlist')

const showCompleteModal = ref(false)
const completingOrder = ref(false)
const completionForm = ref({
  driveLink: '',
  maxSelections: null
})
const copied = ref(false)

const fetchOrderDetails = async () => {
  try {
    loading.value = true
    
    // Fetch Order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
      
    if (orderError) throw orderError
    // Handle fallback for existing orders without payment_status
    if (!orderData.payment_status) orderData.payment_status = 'dp'
    order.value = orderData

    // Fetch Tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from('order_tasks')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      
    if (tasksError) throw tasksError
    tasks.value = tasksData || []

    // Fetch Finances
    const { data: financeDataResult, error: financeError } = await supabase
      .from('finances')
      .select('*')
      .eq('order_id', orderId)
      .single()
      
    if (financeError && financeError.code !== 'PGRST116') throw financeError // PGRST116 is not found
    
    if (financeDataResult) {
      financeData.value = {
        id: financeDataResult.id,
        total_gross: financeDataResult.total_gross || 0,
        expenses: financeDataResult.expenses || 0,
        net_profit: financeDataResult.net_profit || 0,
        expenses_list: financeDataResult.expenses_list || []
      }
      calculateFinance()
    }
    
  } catch (err) {
    console.error('Error fetching order:', err.message)
  } finally {
    loading.value = false
  }
}

const toggleTask = async (task) => {
  if (order.value?.status === 'done') return // Prevent toggle if done
  
  const newStatus = !task.is_completed
  task.is_completed = newStatus // Optimistic UI update
  
  try {
    const { error } = await supabase
      .from('order_tasks')
      .update({ is_completed: newStatus })
      .eq('id', task.id)
      
    if (error) {
      task.is_completed = !newStatus // Revert on failure
      throw error
    }
  } catch (err) {
    console.error('Error updating task:', err.message)
    alert('Gagal mengupdate tugas.')
  }
}

const tasksByCategory = computed(() => {
  const grouped = {}
  tasks.value.forEach(task => {
    if (!grouped[task.category]) {
      grouped[task.category] = []
    }
    grouped[task.category].push(task)
  })
  return grouped
})

const completedTasksCount = computed(() => tasks.value.filter(t => t.is_completed).length)
const progressPercentage = computed(() => {
  if (tasks.value.length === 0) return 0
  return Math.round((completedTasksCount.value / tasks.value.length) * 100)
})

const addExpense = () => {
  financeData.value.expenses_list.push({ name: '', amount: null })
}

const removeExpense = (index) => {
  financeData.value.expenses_list.splice(index, 1)
  calculateFinance()
}

const calculateFinance = () => {
  const bruto = Number(financeData.value.total_gross) || 0
  
  // Calculate total expenses from the list
  const totalExp = financeData.value.expenses_list.reduce((sum, item) => {
    return sum + (Number(item.amount) || 0)
  }, 0)
  
  financeData.value.expenses = totalExp
  const net = bruto - totalExp
  
  financeData.value.net_profit = net
  
  splits.value = {
    pekerja: net * 0.30,
    alat: net * 0.30,
    mitra: net * 0.30,
    pemodal: net * 0.10
  }
}

const updatePaymentStatus = async (status) => {
  if (!order.value || order.value.payment_status === status) return
  
  const oldStatus = order.value.payment_status
  order.value.payment_status = status // optimistic UI
  
  try {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: status })
      .eq('id', orderId)
      
    if (error) throw error
  } catch (err) {
    console.error('Error updating payment status:', err)
    order.value.payment_status = oldStatus
    alert('Gagal mengupdate status pembayaran.')
  }
}

const saveFinance = async () => {
  try {
    savingFinance.value = true
    
    const payload = {
      order_id: orderId,
      total_gross: financeData.value.total_gross,
      expenses: financeData.value.expenses,
      net_profit: financeData.value.net_profit,
      expenses_list: financeData.value.expenses_list
    }

    if (financeData.value.id) {
      const { error } = await supabase
        .from('finances')
        .update(payload)
        .eq('id', financeData.value.id)
      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('finances')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      financeData.value.id = data.id
    }
    
    alert('Data keuangan berhasil disimpan!')
  } catch (err) {
    console.error('Error saving finance:', err.message)
    alert('Gagal menyimpan data keuangan.')
  } finally {
    savingFinance.value = false
  }
}

const copyLink = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}

const submitCompletion = async () => {
  completingOrder.value = true
  try {
    // Extract Folder ID using Regex logic provided by user
    const link = completionForm.value.driveLink
    const match = link.match(/folders\/([^/?]+)/)
    const folderId = match ? match[1] : link
    
    const gasBaseUrl = 'https://script.google.com/macros/s/AKfycby76mKVOXxMrEBfqFjZF_bE1haxMB62JM52nnncW5n5iyFg6AZ6FIxUyHJZOyg5L2TX/exec'
    const finalGasLink = `${gasBaseUrl}?id=${folderId}&limit=${completionForm.value.maxSelections}`
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'done',
        drive_link: link,
        max_selections: completionForm.value.maxSelections,
        client_selection_link: finalGasLink
      })
      .eq('id', orderId)
      
    if (error) throw error
    
    // Update local state
    if (order.value) {
      order.value.status = 'done'
      order.value.drive_link = link
      order.value.max_selections = completionForm.value.maxSelections
      order.value.client_selection_link = finalGasLink
    }
    
    showCompleteModal.value = false
  } catch (e) {
    alert('Gagal menyelesaikan order: ' + e.message)
    console.error(e)
  } finally {
    completingOrder.value = false
  }
}

const formatCurrencyNumber = (val) => {
  if (!val && val !== 0) return ''
  return new Intl.NumberFormat('id-ID').format(val)
}

const handleGrossInput = (e) => {
  let val = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
  financeData.value.total_gross = val ? parseInt(val, 10) : 0
  e.target.value = formatCurrencyNumber(financeData.value.total_gross)
  calculateFinance()
}

const handleExpenseInput = (e, idx) => {
  let val = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
  financeData.value.expenses_list[idx].amount = val ? parseInt(val, 10) : null
  e.target.value = formatCurrencyNumber(financeData.value.expenses_list[idx].amount)
  calculateFinance()
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
}

onMounted(() => {
  fetchOrderDetails()
})
</script>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
