<template>
  <div 
    class="min-h-screen bg-background text-foreground flex flex-col font-sans max-w-md mx-auto shadow-2xl relative bg-background border-x border-border"
    :class="{ 'pb-20': $route.path !== '/login' }"
  >
    <header class="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-center shadow-subtle relative h-16">
      <button 
        v-if="showBackButton" 
        @click="goBack" 
        class="absolute left-4 p-2 rounded-full hover:bg-muted transition-colors active:scale-95"
      >
        <IconArrowLeft class="w-5 h-5 text-foreground" />
      </button>
      
      <NuxtLink to="/orders" class="flex items-center justify-center gap-2">
        <img
          src="/FK WEB ICON.png"
          alt="Fokus Manager Logo"
          class="w-6 h-6 object-contain invert dark:invert-0"
        />
        <h1 class="text-xl font-serif font-bold tracking-tight lowercase">fokuskesini</h1>
      </NuxtLink>
      
      <button @click="toggleColorMode" class="absolute right-4 p-2 rounded-full hover:bg-muted transition-colors">
        <ClientOnly>
          <IconMoon v-if="colorMode.value === 'light'" class="w-5 h-5 text-foreground" />
          <IconSun v-else class="w-5 h-5 text-foreground" />
        </ClientOnly>
      </button>
    </header>

    <main class="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">
      <slot />
    </main>

    <!-- Bottom Navigation for Mobile -->
    <nav v-if="$route.path !== '/login'" class="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border shadow-[0_-4px_15px_rgba(0,0,0,0.05)] max-w-md mx-auto">
      <ul class="flex justify-around items-center h-16">
        <li v-for="item in navItems" :key="item.path" class="flex-1">
          <NuxtLink :to="item.path" class="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground transition-colors" active-class="text-foreground font-medium">
            <component :is="item.icon" class="w-6 h-6" :class="{ 'stroke-[2.5px] text-foreground': $route.path.startsWith(item.path) && item.path !== '/' || $route.path === item.path }" />
            <span class="text-[10px]">{{ item.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useColorMode, useRoute, useRouter } from '#imports'
import { 
  Home as IconHome, 
  Briefcase as IconBriefcase, 
  Image as IconImage, 
  User as IconUser,
  Moon as IconMoon,
  Sun as IconSun,
  ArrowLeft as IconArrowLeft,
  Camera as IconCamera,
  BarChart3 as IconChart
} from 'lucide-vue-next'

const colorMode = useColorMode()
const route = useRoute()
const router = useRouter()

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const mainRoutes = ['/', '/orders', '/profile', '/login']
const showBackButton = computed(() => !mainRoutes.includes(route.path))

const goBack = () => {
  router.back()
}

const navItems = [
  { label: 'Orders', path: '/orders', icon: IconBriefcase },
  { label: 'Referensi', path: '/references', icon: IconImage },
  { label: 'Laporan', path: '/reports', icon: IconChart },
  { label: 'Profile', path: '/profile', icon: IconUser },
]
</script>

<style scoped>
/* Optional additional styling */
</style>
