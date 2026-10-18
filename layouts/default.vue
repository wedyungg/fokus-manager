<template>
  <div 
    class="min-h-screen bg-background text-foreground flex flex-col font-sans w-full max-w-md md:max-w-3xl lg:max-w-6xl mx-auto shadow-2xl md:shadow-none relative border-x md:border-x-0 border-border transition-colors duration-200"
    :class="{ 'pb-20 md:pb-8': $route.path !== '/login' }"
  >
    <header class="sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border/80 px-4 md:px-8 flex items-center justify-between shadow-subtle h-16">
      <!-- Left: Back button + Brand -->
      <div class="flex items-center gap-3">
        <button 
          v-if="showBackButton" 
          @click="goBack" 
          aria-label="Kembali"
          class="p-2 -ml-2 rounded-xl hover:bg-muted text-foreground"
        >
          <IconArrowLeft class="w-5 h-5" />
        </button>
        
        <NuxtLink to="/orders" class="flex items-center gap-2.5 group">
          <img
            src="/FK WEB ICON.png"
            alt="Fokus Manager Logo"
            class="w-6 h-6 object-contain invert dark:invert-0 transition-transform duration-200 ease-emil-out group-hover:scale-105"
          />
          <h1 class="text-xl font-serif font-bold tracking-tight lowercase">fokuskesini</h1>
        </NuxtLink>
      </div>
      
      <!-- Center: Desktop / Tablet Navigation -->
      <nav v-if="$route.path !== '/login'" class="hidden md:flex items-center gap-1 bg-muted/70 p-1 rounded-2xl border border-border/60">
        <NuxtLink 
          v-for="item in navItems" 
          :key="item.path" 
          :to="item.path"
          class="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 ease-emil-out tactile-press"
          :class="isActiveRoute(item.path) ? 'bg-background text-foreground shadow-subtle' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'"
        >
          <component :is="item.icon" class="w-4 h-4" :class="{ 'stroke-[2.25px]': isActiveRoute(item.path) }" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
      
      <!-- Right: Theme Toggle -->
      <div class="flex items-center justify-end min-w-[40px]">
        <button 
          @click="toggleColorMode" 
          aria-label="Ganti Tema"
          class="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ClientOnly>
            <IconMoon v-if="colorMode.value === 'light'" class="w-5 h-5 text-foreground" />
            <IconSun v-else class="w-5 h-5 text-foreground" />
          </ClientOnly>
        </button>
      </div>
    </header>

    <main class="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-5xl mx-auto">
      <slot />
    </main>

    <!-- Bottom Navigation for Mobile Only -->
    <nav v-if="$route.path !== '/login'" class="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-background/90 backdrop-blur-lg border-t border-border/80 shadow-[0_-4px_15px_rgba(0,0,0,0.04)] max-w-md mx-auto">
      <ul class="flex justify-around items-center h-16 px-2">
        <li v-for="item in navItems" :key="item.path" class="flex-1">
          <NuxtLink 
            :to="item.path" 
            class="flex flex-col items-center justify-center w-full h-14 rounded-xl space-y-1 text-muted-foreground hover:text-foreground transition-all duration-150 ease-emil-out tactile-press" 
            :class="{ 'text-foreground font-medium': isActiveRoute(item.path) }"
          >
            <component :is="item.icon" class="w-5 h-5 transition-transform duration-150 ease-emil-out" :class="{ 'stroke-[2.5px] text-foreground scale-105': isActiveRoute(item.path) }" />
            <span class="text-[10px] tracking-tight">{{ item.label }}</span>
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
  Briefcase as IconBriefcase, 
  Image as IconImage, 
  User as IconUser,
  Moon as IconMoon,
  Sun as IconSun,
  ArrowLeft as IconArrowLeft,
  BarChart3 as IconChart
} from 'lucide-vue-next'

const colorMode = useColorMode()
const route = useRoute()
const router = useRouter()

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const mainRoutes = ['/', '/orders', '/profile', '/login', '/references', '/reports']
const showBackButton = computed(() => !mainRoutes.includes(route.path))

const isActiveRoute = (path) => {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(path + '/')
}

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

