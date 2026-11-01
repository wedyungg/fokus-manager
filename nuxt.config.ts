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
    googleDriveApiKey: process.env.GOOGLE_DRIVE_API_KEY || 'AIzaSyCGdETH6LFijBh57uHyPR8CB1hyssaFnN8',
    supabaseUrl: process.env.SUPABASE_URL || 'https://suoslnjdhfajdmpfxvdx.supabase.co',
    supabaseKey: process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b3NsbmpkaGZhamRtcGZ4dmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMjU1OTgsImV4cCI6MjA5MzcwMTU5OH0.NpoRUNUVh9pLEBwpB1HwEdM89pMJDZCuKo8JrtNHZR0',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b3NsbmpkaGZhamRtcGZ4dmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyNTU5OCwiZXhwIjoyMDkzNzAxNTk4fQ.Uwbu-tzq6bfMDUZp0r-tst2SoNGoJvnS1Bcdip44s-8',
    fonnteApiKey: process.env.FONNTE_API_KEY,
    waGroupId: process.env.WA_GROUP_ID,
    public: {
      googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '1pTLfiRAefhILv3HwpORe7P3_iestWOlY'
    }
  }
})
