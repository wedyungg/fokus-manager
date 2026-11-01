import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'id')
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'ID Order tidak valid.' })
  }

  const body = await readBody(event)
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, client_name, service_type, max_selections, selection_locked')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    throw createError({ statusCode: 404, statusMessage: 'Data proyek tidak ditemukan.' })
  }

  // Admin action: unlock client selection so client can revise choices.
  if (body?.action === 'unlock') {
    const { error: unlockError } = await supabase
      .from('orders')
      .update({ selection_locked: false })
      .eq('id', orderId)

    if (unlockError) {
      throw createError({ statusCode: 500, statusMessage: unlockError.message })
    }
    return { success: true, selection_locked: false }
  }

  if (order.selection_locked) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Pilihan foto sudah dikunci. Hubungi tim fokuskesini jika ingin mengubah pilihan.'
    })
  }

  const selectedPhotos = Array.isArray(body?.selected_photos) ? body.selected_photos : []
  const limit = Number(order.max_selections) || 20

  if (selectedPhotos.length !== limit) {
    throw createError({
      statusCode: 400,
      statusMessage: `Jumlah foto terpilih harus tepat ${limit} foto (saat ini ${selectedPhotos.length}).`
    })
  }

  const sanitizedPhotos = selectedPhotos.map((item: any) => ({
    id: String(item.id || ''),
    name: String(item.name || '')
  })).filter((item: { id: string; name: string }) => item.id && item.name)

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      selected_photos: sanitizedPhotos,
      selection_locked: true
    })
    .eq('id', orderId)

  if (updateError) {
    throw createError({
      statusCode: 500,
      statusMessage: updateError.message.includes('selected_photos')
        ? 'Kolom selected_photos belum ada di tabel orders Supabase. Jalankan SQL migrasi terlebih dahulu.'
        : updateError.message
    })
  }

  return {
    success: true,
    selected_photos: sanitizedPhotos,
    selection_locked: true
  }
})
