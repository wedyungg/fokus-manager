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
  const apiKey = config.googleDriveApiKey
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw createError({ statusCode: 404, statusMessage: 'Data proyek tidak ditemukan.' })
  }

  const folderId = order.drive_folder_id || extractFolderId(order.drive_link) || extractFolderId(order.client_selection_link)
  if (!folderId) {
    return {
      order: {
        id: order.id,
        client_name: order.client_name,
        service_type: order.service_type,
        event_date: order.event_date,
        max_selections: order.max_selections || 20,
        selected_photos: Array.isArray(order.selected_photos) ? order.selected_photos : [],
        selection_locked: Boolean(order.selection_locked)
      },
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
        pageSize: '1000',
        orderBy: 'name_natural'
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
          photos.push({
            id: file.id,
            name: file.name,
            url: baseThumb.replace(/=s\d+$/, '=s600'),
            previewUrl: baseThumb.replace(/=s\d+$/, '=s1600')
          })
        }
      }

      pageToken = data.nextPageToken || null
    } while (pageToken)

    return {
      order: {
        id: order.id,
        client_name: order.client_name,
        service_type: order.service_type,
        event_date: order.event_date,
        max_selections: order.max_selections || 20,
        selected_photos: Array.isArray(order.selected_photos) ? order.selected_photos : [],
        selection_locked: Boolean(order.selection_locked)
      },
      photos
    }
  } catch (err: any) {
    return {
      order: {
        id: order.id,
        client_name: order.client_name,
        service_type: order.service_type,
        event_date: order.event_date,
        max_selections: order.max_selections || 20,
        selected_photos: Array.isArray(order.selected_photos) ? order.selected_photos : [],
        selection_locked: Boolean(order.selection_locked)
      },
      photos: [],
      error: err.message || 'Gagal memuat daftar foto dari Google Drive.'
    }
  }
})
