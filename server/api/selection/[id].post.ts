import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'id')
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'ID Order tidak valid.' })
  }

  const body = await readBody(event)
  const config = useRuntimeConfig()
  const supabaseUrl = (config.supabaseUrl as string) || process.env.SUPABASE_URL!
  const supabaseKey =
    (config.supabaseServiceKey as string) ||
    process.env.SUPABASE_SERVICE_KEY ||
    (config.supabaseKey as string) ||
    process.env.SUPABASE_KEY!

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    throw createError({ statusCode: 404, statusMessage: 'Data proyek tidak ditemukan.' })
  }

  const { data: existingSelectionTask } = await supabase
    .from('order_tasks')
    .select('id, technical_note, is_completed')
    .eq('order_id', orderId)
    .eq('category', '__SELECTION__')
    .maybeSingle()

  const isCurrentlyLocked = Boolean(order.selection_locked) || Boolean(existingSelectionTask?.is_completed)

  if (body?.action === 'unlock') {
    await supabase
      .from('orders')
      .update({ selection_locked: false })
      .eq('id', orderId)

    if (existingSelectionTask?.id) {
      await supabase
        .from('order_tasks')
        .update({ is_completed: false })
        .eq('id', existingSelectionTask.id)
    }

    return { success: true, selection_locked: false }
  }

  if (isCurrentlyLocked) {
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

  const sanitizedPhotos = selectedPhotos
    .map((item: any) => ({
      id: String(item.id || ''),
      name: String(item.name || '')
    }))
    .filter((item: { id: string; name: string }) => item.id && item.name)

  await supabase
    .from('orders')
    .update({
      selected_photos: sanitizedPhotos,
      selection_locked: true
    })
    .eq('id', orderId)

  if (existingSelectionTask?.id) {
    const { error: taskUpdateErr } = await supabase
      .from('order_tasks')
      .update({
        technical_note: JSON.stringify(sanitizedPhotos),
        is_completed: true
      })
      .eq('id', existingSelectionTask.id)

    if (taskUpdateErr) {
      throw createError({ statusCode: 500, statusMessage: taskUpdateErr.message })
    }
  } else {
    const { error: taskInsertErr } = await supabase
      .from('order_tasks')
      .insert({
        order_id: orderId,
        task_name: '__CLIENT_SELECTION__',
        category: '__SELECTION__',
        technical_note: JSON.stringify(sanitizedPhotos),
        is_completed: true
      })

    if (taskInsertErr) {
      throw createError({ statusCode: 500, statusMessage: taskInsertErr.message })
    }
  }

  return {
    success: true,
    selected_photos: sanitizedPhotos,
    selection_locked: true
  }
})
