<template>
  <div class="space-y-6">
    <div class="bg-background border border-border rounded-2xl p-6 shadow-subtle">
      <form @submit.prevent="submitOrder" class="space-y-5">
        <div>
          <label class="block text-sm font-medium mb-1">Nama Klien / Judul Order</label>
          <input 
            v-model="form.client_name" 
            type="text" 
            required 
            placeholder="Contoh: Wedding Syita & Ita"
            class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-all"
          />
        </div>

        <div class="relative">
          <label class="block text-sm font-medium mb-1">Tanggal Event</label>
          <div 
            @click="showDatePicker = true"
            class="w-full px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/50 focus:ring-2 focus:ring-foreground transition-all cursor-pointer flex justify-between items-center"
            :class="{ 'ring-2 ring-foreground': showDatePicker }"
          >
            <span :class="form.event_date ? 'text-foreground font-medium' : 'text-muted-foreground'">
              {{ form.event_date ? formatDate(form.event_date) : 'Pilih tanggal...' }}
            </span>
            <IconCalendar class="w-5 h-5 text-muted-foreground" />
          </div>
          
          <!-- Custom Date Picker Popover -->
          <div v-if="showDatePicker" class="absolute z-50 mt-2 left-0 right-0 sm:right-auto">
            <!-- Backdrop for closing -->
            <div class="fixed inset-0 z-40 bg-transparent" @click="showDatePicker = false"></div>
            <!-- Popover Content -->
            <div class="relative z-50">
              <UiDatePicker 
                v-model="parsedDate" 
                @select="handleDateSelect" 
                class="w-full sm:w-auto"
              />
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Jenis Layanan</label>
          <select 
            v-model="form.service_type" 
            required
            class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-all appearance-none"
          >
            <option value="" disabled>Pilih Jenis Layanan...</option>
            <option value="Wedding">Wedding</option>
            <option value="Graduation">Graduation</option>
            <option value="Family Portrait">Family Portrait</option>
            <option value="Corporate">Corporate</option>
            <option value="Event">Event</option>
          </select>
        </div>

        <!-- Conditional Sesi for Wedding -->
        <div v-if="form.service_type === 'Wedding'" class="space-y-2 p-4 bg-muted/50 rounded-xl border border-border">
          <label class="block text-sm font-medium mb-2">Sub-Sesi (Pilih minimal satu)</label>
          <div class="space-y-3">
            <label class="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" value="Akad" v-model="form.sessions" class="w-5 h-5 rounded border-border text-foreground focus:ring-foreground" />
              <span class="text-sm">Akad / Pemberkatan</span>
            </label>
            <label class="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" value="Resepsi" v-model="form.sessions" class="w-5 h-5 rounded border-border text-foreground focus:ring-foreground" />
              <span class="text-sm">Resepsi</span>
            </label>
            <label class="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" value="Ngunduh Mantu" v-model="form.sessions" class="w-5 h-5 rounded border-border text-foreground focus:ring-foreground" />
              <span class="text-sm">Ngunduh Mantu</span>
            </label>
          </div>
        </div>

        <!-- Nomor WA Klien -->
        <div>
          <label class="block text-sm font-medium mb-1">Nomor WhatsApp Klien</label>
          <div class="relative">
            <IconPhone class="w-4 h-4 absolute left-4 top-3.5 text-muted-foreground" />
            <input 
              v-model="form.client_phone" 
              type="tel" 
              inputmode="numeric"
              placeholder="6281234567890"
              class="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-all"
            />
          </div>
          <p class="text-[11px] text-muted-foreground mt-1">Format internasional tanpa tanda +. Contoh: 6281234567890</p>
        </div>

        <!-- Lokasi Acara -->
        <div>
          <label class="block text-sm font-medium mb-1">Lokasi Acara</label>
          <div class="relative">
            <IconMapPin class="w-4 h-4 absolute left-4 top-3.5 text-muted-foreground" />
            <input 
              v-model="form.location" 
              type="text" 
              placeholder="Gedung Sasana Kriya, Surabaya"
              class="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-all"
            />
          </div>
        </div>

        <div v-if="error" class="p-3 text-sm text-red-500 bg-red-50 rounded-lg border border-red-200 dark:bg-red-950/30 dark:border-red-900">
          {{ error }}
        </div>

        <button 
          type="submit" 
          :disabled="loading || (form.service_type === 'Wedding' && form.sessions.length === 0)"
          class="w-full py-3 px-4 bg-foreground text-background rounded-xl font-medium hover:bg-foreground/90 transition-colors flex justify-center items-center mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span v-if="loading" class="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin mr-2"></span>
          {{ loading ? 'Menyimpan...' : 'Simpan & Buat Shotlist' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSupabaseClient, useSupabaseUser, navigateTo } from '#imports'
import { Calendar as IconCalendar, Phone as IconPhone, MapPin as IconMapPin } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const form = ref({
  client_name: '',
  event_date: '',
  service_type: '',
  sessions: [],
  client_phone: '',
  location: ''
})

const showDatePicker = ref(false)
const parsedDate = ref(new Date())

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(d)
}

const handleDateSelect = (date) => {
  // Format to YYYY-MM-DD for form.event_date
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  form.value.event_date = `${year}-${month}-${day}`
  showDatePicker.value = false
}

const loading = ref(false)
const error = ref('')

const submitOrder = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // 1. Insert Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_name: form.value.client_name,
        service_type: form.value.service_type,
        event_date: form.value.event_date,
        user_id: user.value.id,
        client_phone: form.value.client_phone || null,
        location: form.value.location || null
      })
      .select()
      .single()
      
    if (orderError) throw orderError

    // 2. Insert Initial Finances Record
    const { error: financeError } = await supabase
      .from('finances')
      .insert({
        order_id: order.id
      })
      
    if (financeError) throw financeError

    // 3. Generate Tasks based on templates
    let templatesQuery = supabase.from('shotlist_templates').select('*').eq('service_type', form.value.service_type)
    
    // If it's a wedding, only fetch templates for selected sessions
    if (form.value.service_type === 'Wedding' && form.value.sessions.length > 0) {
       templatesQuery = templatesQuery.in('session_type', form.value.sessions)
    }

    const { data: templates, error: templatesError } = await templatesQuery
    
    if (templatesError) throw templatesError

    if (templates && templates.length > 0) {
      const tasksToInsert = templates.map(t => ({
        order_id: order.id,
        task_name: `${t.session_type ? t.session_type + ' - ' : ''}${t.item_name}`,
        category: t.category,
        session_type: t.session_type,
        technical_note: t.technical_note
      }))
      
      const { error: tasksError } = await supabase.from('order_tasks').insert(tasksToInsert)
      if (tasksError) throw tasksError
    }

    // 4. Send WA Notification (fire-and-forget, don't block navigation)
    $fetch('/api/wa/send-new-order', {
      method: 'POST',
      body: {
        client_name: form.value.client_name,
        service_type: form.value.service_type,
        event_date: form.value.event_date,
        client_phone: form.value.client_phone,
        location: form.value.location
      }
    }).then(async (waResult) => {
      if (waResult?.success) {
        // Mark wa_sent_instant as true
        await supabase.from('orders').update({ wa_sent_instant: true }).eq('id', order.id)
      } else {
        console.warn('WA notification failed:', waResult?.error)
      }
    }).catch(err => {
      console.warn('WA notification error (non-blocking):', err)
    })

    navigateTo(`/orders/${order.id}`)
  } catch (err) {
    error.value = 'Terjadi kesalahan: ' + err.message
  } finally {
    loading.value = false
  }
}
</script>
