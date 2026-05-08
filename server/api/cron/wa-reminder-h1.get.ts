import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const apiKey = config.fonnteApiKey
  const groupId = config.waGroupId

  if (!apiKey || apiKey === 'YOUR_FONNTE_API_KEY_HERE' || !groupId || groupId === 'YOUR_WA_GROUP_ID_HERE') {
    return { success: false, error: 'Fonnte atau WA Group belum dikonfigurasi.' }
  }

  // Create Supabase client using server-side env
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Calculate tomorrow's date in YYYY-MM-DD
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  try {
    // Find orders where event_date = tomorrow, status != done, wa_sent_h1 = false
    const { data: orders, error: dbError } = await supabase
      .from('orders')
      .select('id, client_name, service_type, event_date, client_phone, location')
      .eq('event_date', tomorrowStr)
      .neq('status', 'done')
      .eq('wa_sent_h1', false)

    if (dbError) throw dbError

    if (!orders || orders.length === 0) {
      return { success: true, message: 'Tidak ada jadwal besok yang perlu diingatkan.' }
    }

    const results = []

    for (const order of orders) {
      const formattedDate = new Date(order.event_date).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })

      const cleanPhone = (order.client_phone || '').replace(/[^0-9]/g, '')

      const message = `⏰ *PENGINGAT JADWAL BESOK!*

*Subjek:* ${order.client_name} - ${order.service_type}
*Tanggal:* ${formattedDate}
*Lokasi:* ${order.location || '-'}
📞 Hubungi Klien: ${cleanPhone}

Pastikan peralatan (baterai & memory card) sudah siap dan cek kembali shotlist!`

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

        if (response.ok && result.status !== false) {
          // Mark as sent
          await supabase
            .from('orders')
            .update({ wa_sent_h1: true })
            .eq('id', order.id)

          results.push({ id: order.id, client: order.client_name, status: 'sent' })
        } else {
          results.push({ id: order.id, client: order.client_name, status: 'failed', reason: result.reason || result.detail })
        }
      } catch (sendErr: any) {
        results.push({ id: order.id, client: order.client_name, status: 'error', reason: sendErr.message })
      }
    }

    return { success: true, reminders_processed: results.length, results }
  } catch (err: any) {
    console.error('Cron WA Reminder Error:', err)
    return { success: false, error: err.message }
  }
})
