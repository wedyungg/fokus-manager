import { defineEventHandler, getRouterParam, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

function extractFolderId(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  const match = trimmed.match(/folders\/([^/?#&]+)/)
  if (match && match[1]) return match[1]
  const idParam = trimmed.match(/[?&]id=([^&#]+)/)
  if (idParam && idParam[1]) return idParam[1]
  return /^[a-zA-Z0-9_-]{15,}$/.test(trimmed) ? trimmed : null
}

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'id')
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'ID Order tidak valid.' })
  }

  const config = useRuntimeConfig()
  const apiKey = config.googleDriveApiKey || process.env.GOOGLE_DRIVE_API_KEY
  const supabaseUrl = (config.supabaseUrl as string) || process.env.SUPABASE_URL!
  const supabaseKey =
    (config.supabaseServiceKey as string) ||
    process.env.SUPABASE_SERVICE_KEY ||
    (config.supabaseKey as string) ||
    process.env.SUPABASE_KEY!

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw createError({ statusCode: 404, statusMessage: 'Data proyek tidak ditemukan.' })
  }

  let selectedPhotos: Array<{ id: string; name: string }> = Array.isArray(order.selected_photos)
    ? order.selected_photos
    : []
  let selectionLocked = Boolean(order.selection_locked)

  const { data: selectionTask } = await supabase
    .from('order_tasks')
    .select('technical_note, is_completed')
    .eq('order_id', orderId)
    .eq('category', '__SELECTION__')
    .maybeSingle()

  if (selectionTask) {
    if (selectedPhotos.length === 0 && selectionTask.technical_note) {
      try {
        const parsed = JSON.parse(selectionTask.technical_note)
        if (Array.isArray(parsed)) selectedPhotos = parsed
      } catch {}
    }
    if (!('selection_locked' in order) || !order.selection_locked) {
      selectionLocked = Boolean(selectionTask.is_completed)
    }
  }

  const folderId =
    order.drive_folder_id ||
    extractFolderId(order.drive_link) ||
    extractFolderId(order.client_selection_link)

  const orderPayload = {
    id: order.id,
    client_name: order.client_name,
    service_type: order.service_type,
    event_date: order.event_date,
    max_selections: Number(order.max_selections) || 20,
    selected_photos: selectedPhotos,
    selection_locked: selectionLocked
  }

  if (!folderId) {
    return {
      order: orderPayload,
      photos: [],
      error: 'Folder Google Drive belum ditautkan pada proyek ini.'
    }
  }

  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'GOOGLE_DRIVE_API_KEY belum dikonfigurasi di server.' })
  }

  const photos: Array<{ id: string; name: string; url: string; previewUrl: string }> = []
  let pageToken: string | null = null

  try {
    const q = `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`

    do {
      const params = new URLSearchParams({
        q,
        key: apiKey,
        fields: 'nextPageToken, files(id, name, thumbnailLink)',
        pageSize: '1000'
      })
      if (pageToken) params.set('pageToken', pageToken)

      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`)
      const data = await res.json()

      if (data.error) {
        throw new Error(data.error.message || 'Gagal membaca folder Google Drive.')
      }

      if (Array.isArray(data.files)) {
        for (const file of data.files) {
          const baseThumb = file.thumbnailLink || `https://lh3.googleusercontent.com/d/${file.id}=s220`
          const highResThumb = baseThumb.replace(/=s\d+$/, '=s1000')
          photos.push({
            id: file.id,
            name: file.name,
            url: highResThumb,
            previewUrl: highResThumb
          })
        }
      }

      pageToken = data.nextPageToken || null
    } while (pageToken)

    photos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

    return {
      order: orderPayload,
      photos
    }
  } catch (err: any) {
    return {
      order: orderPayload,
      photos: [],
      error: err.message || 'Gagal memuat daftar foto dari Google Drive.'
    }
  }
})
