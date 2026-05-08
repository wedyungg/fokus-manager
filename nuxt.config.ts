// https://nuxt.com/docs/api/configuration/nuxt-config
import ws from 'ws'
if (!globalThis.WebSocket) {
  globalThis.WebSocket = ws as any
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@nuxtjs/color-mode',
    '@nuxtjs/google-fonts'
  ],

  googleFonts: {
    families: {
      'EB Garamond': true, // better alternative if Garamond is not exactly right or Hoefler is paid, EB Garamond is free on Google Fonts
      Inter: true,
      Archivo: true,
    }
  },

  colorMode: {
    classSuffix: ''
  },

  css: ['~/assets/css/tailwind.css'],

  supabase: {
    redirect: false,
    clientOptions: {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true
      }
    }
  },

  runtimeConfig: {
    googleDriveApiKey: process.env.GOOGLE_DRIVE_API_KEY,
    fonnteApiKey: process.env.FONNTE_API_KEY,
    waGroupId: process.env.WA_GROUP_ID,
    public: {
      googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID
    }
  }
})
