import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const apiKey = config.fonnteApiKey
  const groupId = config.waGroupId

  if (!apiKey || apiKey === 'YOUR_FONNTE_API_KEY_HERE') {
    return { success: false, error: 'FONNTE_API_KEY belum dikonfigurasi di .env' }
  }

  if (!groupId || groupId === 'YOUR_WA_GROUP_ID_HERE') {
    return { success: false, error: 'WA_GROUP_ID belum dikonfigurasi di .env' }
  }

  const { client_name, service_type, event_date, client_phone, location } = body

  // Format tanggal ke bahasa Indonesia
  const formattedDate = new Date(event_date).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // Bersihkan nomor telepon untuk link wa.me (hapus + dan spasi)
  const cleanPhone = (client_phone || '').replace(/[^0-9]/g, '')

  const message = `🚨 *PESANAN BARU MASUK!*

*Klien:* ${client_name}
*Layanan:* ${service_type}
*Tanggal:* ${formattedDate}
*Lokasi:* ${location || '-'}

📞 Hubungi Klien: ${cleanPhone}
Silakan konfirmasi jadwal segera.`

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: groupId,
        message: message,
        typing: false
      })
    })

    const result = await response.json()

    if (!response.ok || result.status === false) {
      console.error('Fonnte API error:', result)
      return { success: false, error: result.reason || result.detail || 'Gagal mengirim pesan WA' }
    }

    return { success: true, data: result }
  } catch (err: any) {
    console.error('Failed to send WA notification:', err)
    return { success: false, error: err.message }
  }
})
