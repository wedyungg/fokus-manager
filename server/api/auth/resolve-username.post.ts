import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const { username } = await readBody(event)

  if (!username) {
    return { email: null, error: 'Username wajib diisi.' }
  }

  // Gunakan service role key (bypass RLS) untuk lookup email
  const supabaseUrl = process.env.SUPABASE_URL!
  // Gunakan anon key dulu, jika tidak bisa gunakan service key
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('username', username.trim())
    .single()

  if (error || !data || !data.email) {
    return { email: null, error: 'Username tidak ditemukan.' }
  }

  return { email: data.email, error: null }
})
