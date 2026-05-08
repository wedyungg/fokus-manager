import dotenv from 'dotenv'

dotenv.config()

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

const seed = async () => {
  const templates = [
    { service_type: 'Wedding', category: 'Wajib', item_name: 'Penyambutan Pengantin', session_type: 'Ngunduh Mantu' },
    { service_type: 'Wedding', category: 'Wajib', item_name: 'Sungkeman', session_type: 'Ngunduh Mantu' },
    { service_type: 'Wedding', category: 'Wajib', item_name: 'Foto Bersama Keluarga Inti', session_type: 'Ngunduh Mantu' },
    { service_type: 'Wedding', category: 'Secondary', item_name: 'Suasana Tamu Undangan', session_type: 'Ngunduh Mantu' },
    { service_type: 'Wedding', category: 'Kreatif', item_name: 'Detail Dekorasi Pelaminan', session_type: 'Ngunduh Mantu' }
  ]
  
  const res = await fetch(`${url}/rest/v1/shotlist_templates`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(templates)
  })
  const data = await res.json()
  console.log('Seed response:', data)

  const res2 = await fetch(`${url}/rest/v1/orders?select=time_start&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  })
  const data2 = await res2.json()
  console.log('Orders response:', data2)
}

seed()
