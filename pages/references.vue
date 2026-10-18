<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <h2 class="text-2xl font-serif font-bold tracking-tight">Referensi Gaya</h2>
      
      <div class="relative w-full sm:w-auto">
        <IconSearch class="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Cari foto..." 
          class="pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-[width,border-color,box-shadow] duration-200 ease-emil-out w-full sm:w-48 sm:focus:w-64"
        />
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm dark:bg-red-950/30 dark:border-red-900">
      {{ error }}
    </div>

    <!-- Category Filters (Folders) -->
    <div class="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
      <button 
        @click="selectFolder(null)"
        class="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap"
        :class="!selectedFolderId ? 'bg-foreground text-background shadow-subtle' : 'bg-muted text-muted-foreground hover:bg-muted/80'"
      >
        Root Folder
      </button>
      
      <button 
        v-for="folder in folders" 
        :key="folder.id"
        @click="selectFolder(folder.id)"
        class="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap"
        :class="selectedFolderId === folder.id ? 'bg-foreground text-background shadow-subtle' : 'bg-muted text-muted-foreground hover:bg-muted/80'"
      >
        {{ folder.title }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-6 h-6 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin"></div>
    </div>
    
    <!-- Root Folder View: Show Subfolders as Cards -->
    <div v-else-if="!selectedFolderId" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      <div 
        v-for="folder in folders" 
        :key="folder.id"
        @click="selectFolder(folder.id)"
        role="button"
        tabindex="0"
        class="bg-background border border-border rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-foreground/30 hover:shadow-subtle group min-h-[120px]"
      >
        <div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3 group-hover:bg-foreground/10 transition-colors duration-150">
          <IconFolder class="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors duration-150" />
        </div>
        <p class="text-sm font-medium group-hover:text-foreground transition-colors duration-150">{{ folder.title }}</p>
      </div>

      <div v-if="folders.length === 0" class="col-span-full text-center py-12 bg-background border border-border rounded-2xl shadow-subtle">
        <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <IconFolder class="w-8 h-8 text-muted-foreground" />
        </div>
        <p class="text-muted-foreground font-medium mb-1">Tidak ada folder ditemukan.</p>
        <p class="text-xs text-muted-foreground">Pastikan folder Drive utama berisi subfolder.</p>
      </div>
    </div>

    <!-- Masonry Grid (only when a subfolder is selected) -->
    <div v-else class="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
      <div 
        v-for="(image, index) in filteredImages" 
        :key="image.id" 
        @click="openLightbox(index)"
        class="break-inside-avoid rounded-2xl overflow-hidden relative group shadow-subtle border border-border block cursor-pointer tactile-press"
      >
        <img :src="image.url" :alt="image.title" loading="lazy" referrerpolicy="no-referrer" class="w-full h-auto object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-emil-out bg-muted min-h-[100px]" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-emil-out flex items-end p-4">
          <p class="text-white text-sm font-medium leading-tight">{{ image.title }}</p>
        </div>
      </div>
    </div>
    
    <!-- Empty State (only for subfolder view) -->
    <div v-if="!loading && selectedFolderId && filteredImages.length === 0" class="text-center py-12 bg-background border border-border rounded-2xl shadow-subtle">
      <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <IconImage class="w-8 h-8 text-muted-foreground" />
      </div>
      <p class="text-muted-foreground font-medium mb-1">Tidak ada foto ditemukan.</p>
      <p class="text-xs text-muted-foreground">Folder ini mungkin kosong atau belum ada gambar.</p>
    </div>

    <!-- Lightbox -->
    <Transition name="popover">
      <div v-if="lightboxIndex !== null" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm" @click="closeLightbox">
        <button @click.stop="closeLightbox" class="absolute top-4 right-4 p-2.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full z-50">
          <IconX class="w-6 h-6" />
        </button>
        
        <button @click.stop="prevImage" class="absolute left-2 md:left-6 p-2.5 md:p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full z-50" :class="{ 'opacity-0 pointer-events-none': lightboxIndex === 0 }">
          <IconChevronLeft class="w-6 h-6" />
        </button>

        <div class="relative w-full max-w-4xl max-h-[90vh] px-4 md:px-16 flex flex-col items-center justify-center" @click.stop>
          <img :src="filteredImages[lightboxIndex].url" :alt="filteredImages[lightboxIndex].title" referrerpolicy="no-referrer" class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl select-none" />
          <div class="flex items-center justify-between w-full mt-4">
            <p class="text-white font-medium">{{ filteredImages[lightboxIndex].title }}</p>
            <a :href="filteredImages[lightboxIndex].originalUrl" target="_blank" rel="noopener noreferrer" class="text-xs bg-white/20 hover:bg-white/30 text-white px-3.5 py-1.5 rounded-full transition-colors flex items-center tactile-press">
              Buka Asli <IconExternalLink class="w-3 h-3 ml-1.5" />
            </a>
          </div>
        </div>

        <button @click.stop="nextImage" class="absolute right-2 md:right-6 p-2.5 md:p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full z-50" :class="{ 'opacity-0 pointer-events-none': lightboxIndex === filteredImages.length - 1 }">
          <IconChevronRight class="w-6 h-6" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search as IconSearch, Image as IconImage, X as IconX, ChevronLeft as IconChevronLeft, ChevronRight as IconChevronRight, ExternalLink as IconExternalLink, Folder as IconFolder } from 'lucide-vue-next'
import { useFetch } from '#imports'

const loading = ref(true)
const folders = ref([])
const images = ref([])
const error = ref('')
const selectedFolderId = ref(null)
const searchQuery = ref('')

const filteredImages = computed(() => {
  if (!searchQuery.value) return images.value
  return images.value.filter(img => img.title.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

// Fetch Subfolders from Root
const fetchFolders = async () => {
  try {
    const data = await $fetch('/api/drive?type=folders')
    if (data?.error) throw new Error(data.error)
    folders.value = data?.files || []
  } catch (err) {
    console.error("Failed to fetch folders:", err)
    // Non-blocking error, we just won't show subfolders
  }
}

// Fetch Images for a specific folder
const fetchImages = async (folderId = null) => {
  loading.value = true
  error.value = ''
  images.value = []
  
  try {
    const url = folderId ? `/api/drive?type=images&folderId=${folderId}` : '/api/drive?type=images'
    const data = await $fetch(url)
    
    if (data?.error) throw new Error(data.error)
    images.value = data?.files || []
  } catch (err) {
    error.value = 'Gagal mengambil gambar dari Google Drive: ' + err.message
  } finally {
    loading.value = false
  }
}

const selectFolder = (id) => {
  selectedFolderId.value = id
  if (id) {
    fetchImages(id)
  } else {
    // When going back to root, clear images and just show folders
    images.value = []
    loading.value = false
  }
}

// Lightbox logic
const lightboxIndex = ref(null)

const openLightbox = (index) => {
  lightboxIndex.value = index
  document.body.style.overflow = 'hidden' // Prevent background scrolling
}

const closeLightbox = () => {
  lightboxIndex.value = null
  document.body.style.overflow = ''
}

const nextImage = () => {
  if (lightboxIndex.value !== null && lightboxIndex.value < filteredImages.value.length - 1) {
    lightboxIndex.value++
  }
}

const prevImage = () => {
  if (lightboxIndex.value !== null && lightboxIndex.value > 0) {
    lightboxIndex.value--
  }
}

const handleKeydown = (e) => {
  if (lightboxIndex.value === null) return
  
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowRight') nextImage()
  else if (e.key === 'ArrowLeft') prevImage()
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await fetchFolders()
  // Don't fetch images on root - just show folders
  loading.value = false
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
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
