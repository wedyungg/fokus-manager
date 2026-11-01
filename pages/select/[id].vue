<template>
  <div class="pb-40">
    <div v-if="loading" class="py-24 flex flex-col items-center justify-center text-center">
      <div class="w-6 h-6 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin mb-3"></div>
      <p class="text-sm text-muted-foreground">Menyiapkan galeri foto dari Google Drive...</p>
    </div>

    <div v-else-if="errorMsg" class="my-12 p-6 bg-background border border-border rounded-2xl text-center max-w-md mx-auto shadow-subtle">
      <h2 class="text-xl font-serif font-bold mb-2">Galeri Belum Tersedia</h2>
      <p class="text-sm text-muted-foreground mb-5">{{ errorMsg }}</p>
      <button
        @click="fetchGallery"
        class="px-5 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium hover:bg-foreground/90"
      >
        Muat Ulang Galeri
      </button>
    </div>

    <template v-else-if="order">
      <section class="mb-6 pb-5 border-b border-border flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {{ order.service_type }} <span v-if="order.event_date">• {{ formatDate(order.event_date) }}</span>
          </p>
          <h2 class="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            {{ order.client_name }}
          </h2>
          <p class="text-sm text-muted-foreground mt-1">
            <template v-if="isLocked">
              Pilihan foto telah dikonfirmasi dan tersimpan ({{ selectedPhotos.length }} foto).
            </template>
            <template v-else>
              Pilih tepat <strong class="text-foreground font-semibold tabular-nums">{{ limitPilihan }}</strong> foto terbaik untuk proses editing.
            </template>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex bg-muted p-1 rounded-xl border border-border/60 text-xs">
            <button
              type="button"
              @click="filterMode = 'all'"
              class="px-3 py-1.5 rounded-lg font-medium min-h-[34px]"
              :class="filterMode === 'all' ? 'bg-background text-foreground shadow-subtle' : 'text-muted-foreground hover:text-foreground'"
            >
              Semua ({{ allPhotos.length }})
            </button>
            <button
              type="button"
              @click="filterMode = 'selected'"
              class="px-3 py-1.5 rounded-lg font-medium min-h-[34px] tabular-nums"
              :class="filterMode === 'selected' ? 'bg-background text-foreground shadow-subtle' : 'text-muted-foreground hover:text-foreground'"
            >
              Terpilih ({{ selectedPhotos.length }})
            </button>
          </div>

          <div class="relative flex-1 sm:w-48">
            <IconSearch class="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari nama file..."
              aria-label="Cari nama file foto"
              class="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground"
            />
          </div>
        </div>
      </section>

      <div
        v-if="isLocked"
        class="mb-6 p-4 rounded-2xl bg-muted/60 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div class="flex items-start sm:items-center gap-3">
          <IconCheckCircle2 class="w-5 h-5 text-foreground shrink-0 mt-0.5 sm:mt-0" />
          <div class="text-xs sm:text-sm">
            <p class="font-semibold text-foreground">Daftar seleksi foto sudah terkirim ke tim fokuskesini.</p>
            <p class="text-muted-foreground">Anda tetap dapat melihat pratinjau atau mengunduh foto pilihan Anda di bawah ini.</p>
          </div>
        </div>
        <button
          type="button"
          @click="filterMode = filterMode === 'selected' ? 'all' : 'selected'"
          class="px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-medium hover:bg-muted shrink-0 min-h-[40px]"
        >
          {{ filterMode === 'selected' ? 'Lihat Semua Foto' : 'Lihat Foto Terpilih Saja' }}
        </button>
      </div>

      <div
        v-if="displayedPhotos.length === 0"
        class="py-16 px-4 text-center bg-background border border-border rounded-2xl shadow-subtle"
      >
        <IconImage class="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p class="text-sm font-medium text-foreground mb-1">
          {{ filterMode === 'selected' ? 'Belum ada foto yang dipilih.' : 'Tidak ada foto yang cocok dengan pencarian.' }}
        </p>
        <p class="text-xs text-muted-foreground mb-4">
          {{ filterMode === 'selected' ? 'Ketuk lingkaran pada foto di tab Semua untuk mulai memilih.' : 'Coba kata kunci nama file yang berbeda.' }}
        </p>
        <button
          v-if="filterMode === 'selected' || searchQuery"
          type="button"
          @click="resetFilter"
          class="px-4 py-2 bg-foreground text-background rounded-xl text-xs font-medium"
        >
          Tampilkan Semua Foto
        </button>
      </div>

      <div v-else class="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
        <div
          v-for="(photo, idx) in displayedPhotos"
          :key="photo.id"
          class="group relative aspect-square bg-muted rounded-xl sm:rounded-2xl overflow-hidden border transition-all duration-150 select-none"
          :class="isSelected(photo.id) ? 'border-foreground ring-2 ring-foreground' : 'border-border'"
        >
          <img
            :src="photo.url"
            :alt="photo.name"
            loading="lazy"
            referrerpolicy="no-referrer"
            @click="handleCardClick(photo, idx)"
            class="w-full h-full object-cover cursor-pointer transition-all duration-200"
            :class="isSelected(photo.id) ? 'scale-[0.97] rounded-lg opacity-75' : 'group-hover:scale-[1.02]'"
          />

          <button
            type="button"
            :disabled="isLocked"
            @click.stop="togglePhotoSelection(photo)"
            :aria-label="isSelected(photo.id) ? `Batal pilih ${photo.name}` : `Pilih ${photo.name}`"
            class="absolute top-0 right-0 w-11 h-11 flex items-center justify-center z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground rounded-bl-xl disabled:cursor-default"
          >
            <span
              class="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold transition-all duration-150 shadow-sm"
              :class="
                isSelected(photo.id)
                  ? 'bg-foreground text-background border-2 border-foreground scale-105'
                  : 'bg-black/45 text-white border-2 border-white/90 hover:bg-black/65'
              "
            >
              <span v-if="isSelected(photo.id)" class="tabular-nums">{{ getSelectionOrder(photo.id) }}</span>
            </span>
          </button>

          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent pt-5 pb-1.5 pl-2 pr-9 pointer-events-none">
            <p class="text-[10px] sm:text-[11px] font-mono text-white truncate">{{ photo.name }}</p>
          </div>

          <button
            type="button"
            @click.stop="openPreview(idx)"
            :aria-label="`Pratinjau ukuran penuh ${photo.name}`"
            class="absolute bottom-0 right-0 w-11 h-11 flex items-center justify-center z-10 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-tl-xl"
          >
            <span class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-black/55 backdrop-blur-sm hover:bg-black/80 flex items-center justify-center transition-colors">
              <IconMaximize2 class="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </div>
    </template>

    <Transition name="popover">
      <div
        v-if="toastMsg"
        role="status"
        aria-live="polite"
        class="fixed top-20 left-1/2 -translate-x-1/2 z-[120] bg-foreground text-background px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg border border-border/20 max-w-xs text-center"
      >
        {{ toastMsg }}
      </div>
    </Transition>

    <Transition name="popover">
      <div
        v-if="downloadState.active"
        class="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-background text-foreground border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="font-serif text-lg font-bold">{{ downloadState.title }}</h3>
            <span class="text-xs font-mono font-bold tabular-nums">{{ downloadPercent }}%</span>
          </div>

          <div class="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              class="bg-foreground h-2 rounded-full transition-[width] duration-200 ease-out"
              :style="{ width: `${downloadPercent}%` }"
            ></div>
          </div>

          <div class="flex justify-between items-center text-xs text-muted-foreground font-mono">
            <span class="truncate max-w-[200px]">{{ downloadState.currentFile }}</span>
            <span class="tabular-nums shrink-0">{{ downloadState.completed }} / {{ downloadState.total }} foto</span>
          </div>

          <button
            type="button"
            @click="cancelDownload"
            class="w-full py-2.5 rounded-xl border border-border text-xs font-medium hover:bg-muted min-h-[44px]"
          >
            Batalkan Unduhan
          </button>
        </div>
      </div>
    </Transition>

    <Transition name="popover">
      <div
        v-if="previewIndex !== null && currentPreviewPhoto"
        class="fixed inset-0 z-[110] bg-black/95 flex flex-col justify-between select-none"
        @click="closePreview"
      >
        <div class="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10" @click.stop>
          <div class="flex items-center gap-2.5 min-w-0">
            <span
              v-if="isSelected(currentPreviewPhoto.id)"
              class="px-2 py-0.5 rounded-md bg-white text-black text-xs font-bold font-mono tabular-nums"
            >
              #{{ getSelectionOrder(currentPreviewPhoto.id) }}
            </span>
            <p class="text-white text-xs sm:text-sm font-mono truncate">{{ currentPreviewPhoto.name }}</p>
          </div>

          <button
            type="button"
            @click="closePreview"
            aria-label="Tutup Pratinjau"
            class="w-11 h-11 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10"
          >
            <IconX class="w-6 h-6" />
          </button>
        </div>

        <div
          class="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden"
          @touchstart.passive="onTouchStart"
          @touchend.passive="onTouchEnd"
        >
          <button
            v-if="previewIndex > 0"
            type="button"
            @click.stop="prevPhoto"
            aria-label="Foto Sebelumnya"
            class="hidden sm:flex absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center z-20"
          >
            <IconChevronLeft class="w-6 h-6" />
          </button>

          <img
            :src="currentPreviewPhoto.previewUrl || currentPreviewPhoto.url"
            :alt="currentPreviewPhoto.name"
            referrerpolicy="no-referrer"
            @click.stop
            class="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
          />

          <button
            v-if="previewIndex < displayedPhotos.length - 1"
            type="button"
            @click.stop="nextPhoto"
            aria-label="Foto Berikutnya"
            class="hidden sm:flex absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center z-20"
          >
            <IconChevronRight class="w-6 h-6" />
          </button>
        </div>

        <div class="p-4 bg-black/80 border-t border-white/10 flex justify-center" @click.stop>
          <div class="flex items-center gap-3 w-full max-w-md">
            <button
              type="button"
              @click="downloadSinglePhoto(currentPreviewPhoto)"
              class="flex-1 py-3 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
            >
              <IconDownload class="w-4 h-4" /> Unduh Asli
            </button>

            <button
              v-if="!isLocked"
              type="button"
              @click="togglePhotoSelection(currentPreviewPhoto)"
              class="flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 min-h-[44px]"
              :class="
                isSelected(currentPreviewPhoto.id)
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-white text-black hover:bg-white/90'
              "
            >
              <IconCheck v-if="isSelected(currentPreviewPhoto.id)" class="w-4 h-4" />
              {{ isSelected(currentPreviewPhoto.id) ? 'Batal Pilih' : 'Pilih Foto Ini' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <div
      v-if="order && !loading && !errorMsg"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-xl z-30 bg-background/85 backdrop-blur-md border border-border rounded-2xl p-3.5 shadow-2xl"
    >
      <div class="flex items-center justify-between px-1 mb-2.5 text-xs">
        <span class="font-semibold tracking-wide uppercase tabular-nums">
          Terpilih: <strong class="text-foreground">{{ selectedPhotos.length }}</strong> / {{ limitPilihan }} Foto
        </span>
        <span class="text-muted-foreground font-serif italic">fokuskesini</span>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="!isLocked"
          type="button"
          :disabled="selectedPhotos.length === 0 || submitting"
          @click="clearSelection"
          class="px-3.5 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold disabled:opacity-40 min-h-[44px]"
        >
          Reset
        </button>

        <button
          type="button"
          :disabled="selectedPhotos.length === 0 || downloadState.active"
          @click="downloadSelectedAsZip"
          class="flex-1 py-2.5 px-3 rounded-xl border border-border bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 min-h-[44px]"
        >
          <IconDownload class="w-4 h-4" />
          <span>Unduh ZIP ({{ selectedPhotos.length }})</span>
        </button>

        <button
          v-if="!isLocked"
          type="button"
          :disabled="selectedPhotos.length !== limitPilihan || submitting"
          @click="submitSelection"
          class="flex-1 py-2.5 px-4 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 min-h-[44px]"
        >
          <span v-if="submitting" class="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></span>
          <IconCheckCircle2 v-else class="w-4 h-4" />
          <span>{{ submitting ? 'Menyimpan...' : 'Konfirmasi' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useHead } from '#imports'
import {
  Search as IconSearch,
  Image as IconImage,
  Maximize2 as IconMaximize2,
  X as IconX,
  ChevronLeft as IconChevronLeft,
  ChevronRight as IconChevronRight,
  Download as IconDownload,
  Check as IconCheck,
  CheckCircle2 as IconCheckCircle2
} from 'lucide-vue-next'
import { downloadPhotosAsZip, triggerBrowserDownload } from '~/utils/zipStore'

const route = useRoute()
const orderId = route.params.id

const loading = ref(true)
const submitting = ref(false)
const errorMsg = ref('')
const toastMsg = ref('')
let toastTimer = null

const order = ref(null)
const allPhotos = ref([])
const selectedPhotos = ref([])
const isLocked = ref(false)

const filterMode = ref('all')
const searchQuery = ref('')

const previewIndex = ref(null)
let touchStartX = 0

const downloadState = ref({
  active: false,
  title: 'Mengemas ZIP...',
  completed: 0,
  total: 0,
  currentFile: ''
})
let abortController = null

const limitPilihan = computed(() => Number(order.value?.max_selections) || 20)

useHead({
  title: computed(() =>
    order.value?.client_name
      ? `Seleksi Foto - ${order.value.client_name} | fokuskesini`
      : 'Seleksi Foto | fokuskesini'
  )
})

const selectedIdMap = computed(() => {
  const map = new Map()
  selectedPhotos.value.forEach((p, idx) => map.set(p.id, idx + 1))
  return map
})

const isSelected = (id) => selectedIdMap.value.has(id)
const getSelectionOrder = (id) => selectedIdMap.value.get(id) || ''

const displayedPhotos = computed(() => {
  let list = allPhotos.value
  if (filterMode.value === 'selected') {
    list = list.filter((p) => isSelected(p.id))
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(q))
  }
  return list
})

const currentPreviewPhoto = computed(() => {
  if (previewIndex.value === null) return null
  return displayedPhotos.value[previewIndex.value] || null
})

const downloadPercent = computed(() => {
  if (!downloadState.value.total) return 0
  return Math.round((downloadState.value.completed / downloadState.value.total) * 100)
})

const showToast = (msg) => {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMsg.value = ''
  }, 3200)
}

const resetFilter = () => {
  filterMode.value = 'all'
  searchQuery.value = ''
}

const fetchGallery = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch(`/api/selection/${orderId}`)
    if (res.error && (!res.photos || res.photos.length === 0)) {
      errorMsg.value = res.error
    }
    order.value = res.order
    allPhotos.value = res.photos || []
    isLocked.value = Boolean(res.order?.selection_locked)

    if (Array.isArray(res.order?.selected_photos) && res.order.selected_photos.length > 0) {
      selectedPhotos.value = res.order.selected_photos.map((s) => ({
        id: s.id,
        name: s.name
      }))
    }
  } catch (err) {
    errorMsg.value = err?.data?.statusMessage || err?.message || 'Gagal memuat galeri foto.'
  } finally {
    loading.value = false
  }
}

const handleCardClick = (photo, idx) => {
  if (isLocked.value) {
    openPreview(idx)
  } else {
    togglePhotoSelection(photo)
  }
}

const togglePhotoSelection = (photo) => {
  if (isLocked.value) return
  const existingIdx = selectedPhotos.value.findIndex((p) => p.id === photo.id)
  if (existingIdx > -1) {
    selectedPhotos.value.splice(existingIdx, 1)
  } else {
    if (selectedPhotos.value.length >= limitPilihan.value) {
      showToast(`Kuota maksimal ${limitPilihan.value} foto telah tercapai.`)
      return
    }
    selectedPhotos.value.push({ id: photo.id, name: photo.name })
  }
}

const clearSelection = () => {
  if (isLocked.value || selectedPhotos.value.length === 0) return
  if (confirm('Kosongkan semua foto yang telah dipilih?')) {
    selectedPhotos.value = []
    filterMode.value = 'all'
    showToast('Pilihan foto dikosongkan.')
  }
}

const openPreview = (idx) => {
  previewIndex.value = idx
  document.body.style.overflow = 'hidden'
}

const closePreview = () => {
  previewIndex.value = null
  document.body.style.overflow = ''
}

const nextPhoto = () => {
  if (previewIndex.value !== null && previewIndex.value < displayedPhotos.value.length - 1) {
    previewIndex.value++
  }
}

const prevPhoto = () => {
  if (previewIndex.value !== null && previewIndex.value > 0) {
    previewIndex.value--
  }
}

const onTouchStart = (e) => {
  touchStartX = e.changedTouches[0].screenX
}

const onTouchEnd = (e) => {
  const endX = e.changedTouches[0].screenX
  if (endX < touchStartX - 50) nextPhoto()
  if (endX > touchStartX + 50) prevPhoto()
}

const handleKeydown = (e) => {
  if (previewIndex.value === null) return
  if (e.key === 'Escape') closePreview()
  else if (e.key === 'ArrowRight') nextPhoto()
  else if (e.key === 'ArrowLeft') prevPhoto()
}

const downloadSinglePhoto = async (photo) => {
  if (!photo || downloadState.value.active) return
  abortController = new AbortController()
  downloadState.value = {
    active: true,
    title: 'Mengunduh Foto...',
    completed: 0,
    total: 1,
    currentFile: photo.name
  }

  try {
    const res = await fetch(
      `/api/drive/stream?id=${encodeURIComponent(photo.id)}&name=${encodeURIComponent(photo.name)}`,
      { signal: abortController.signal }
    )
    if (!res.ok) throw new Error('Gagal mengunduh file asli.')
    const blob = await res.blob()
    downloadState.value.completed = 1
    triggerBrowserDownload(blob, photo.name)
  } catch (err) {
    if (err.name !== 'AbortError') {
      showToast(err.message || 'Gagal mengunduh foto.')
    }
  } finally {
    downloadState.value.active = false
    abortController = null
  }
}

const downloadSelectedAsZip = async () => {
  if (selectedPhotos.value.length === 0 || downloadState.value.active) return
  abortController = new AbortController()
  const safeClient = (order.value?.client_name || 'fokuskesini').replace(/[^a-zA-Z0-9_-]/g, '_')

  downloadState.value = {
    active: true,
    title: 'Mengemas File ZIP...',
    completed: 0,
    total: selectedPhotos.value.length,
    currentFile: 'Memulai unduhan paralel...'
  }

  try {
    await downloadPhotosAsZip(
      selectedPhotos.value,
      `${safeClient}_Pilihan_${selectedPhotos.value.length}_Foto.zip`,
      (completed, total, currentFileName) => {
        downloadState.value.completed = completed
        downloadState.value.total = total
        downloadState.value.currentFile = currentFileName
      },
      abortController.signal,
      4
    )
    showToast('File ZIP berhasil diunduh.')
  } catch (err) {
    if (err.name !== 'AbortError') {
      showToast(err.message || 'Gagal mengemas file ZIP.')
    } else {
      showToast('Unduhan ZIP dibatalkan.')
    }
  } finally {
    downloadState.value.active = false
    abortController = null
  }
}

const cancelDownload = () => {
  if (abortController) {
    abortController.abort()
  }
}

const submitSelection = async () => {
  if (isLocked.value || selectedPhotos.value.length !== limitPilihan.value) return
  if (!confirm(`Kirim dan kunci ${selectedPhotos.value.length} foto pilihan Anda untuk proses editing?`)) return

  submitting.value = true
  try {
    const res = await $fetch(`/api/selection/${orderId}`, {
      method: 'POST',
      body: {
        selected_photos: selectedPhotos.value
      }
    })
    if (res?.success) {
      isLocked.value = true
      filterMode.value = 'selected'
      try {
        const codes = selectedPhotos.value.map((p) => p.name)
        const text = `Halo fokuskesini, ini ${selectedPhotos.value.length} foto pilihanku:\n\n` + codes.join('\n')
        await navigator.clipboard.writeText(text)
      } catch {}
      showToast('Pilihan foto berhasil disimpan & disalin!')
    }
  } catch (err) {
    showToast(err?.data?.statusMessage || err?.message || 'Gagal menyimpan pilihan foto.')
  } finally {
    submitting.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  fetchGallery()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>
