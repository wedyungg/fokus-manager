import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
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

async function fetchDriveFolderFiles(folderId: string, apiKey: string) {
  const files: Array<{ id: string; name: string }> = []
  let pageToken: string | null = null
  const q = `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`

  do {
    const params = new URLSearchParams({
      q,
      key: apiKey,
      fields: 'nextPageToken, files(id, name)',
      pageSize: '1000'
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`)
    const data = await res.json()
    if (data.error) {
      throw new Error(data.error.message || 'Gagal membaca folder Google Drive.')
    }
    if (Array.isArray(data.files)) {
      for (const f of data.files) {
        files.push({ id: f.id, name: f.name })
      }
    }
    pageToken = data.nextPageToken || null
  } while (pageToken)

  return files
}

function parseWhatsappPhotoNames(rawText: string): string[] {
  return rawText
    .split(/[\r\n,;]+/)
    .map((line) => line.replace(/^\s*\d+[\.\)\-]\s*/, '').trim())
    .filter((line) => {
      if (!line) return false
      const lower = line.toLowerCase()
      if (lower.startsWith('halo ') || lower.includes('foto pilihanku') || lower.endsWith(':')) {
        return false
      }
      return /^[a-zA-Z0-9_\-\.]+(\.[a-zA-Z0-9]{2,5})?$/.test(line)
    })
}

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'id')
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'ID Order tidak valid.' })
  }

  const body = await readBody(event)
  const config = useRuntimeConfig()
  const apiKey = (config.googleDriveApiKey as string) || process.env.GOOGLE_DRIVE_API_KEY || ''
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

  // Admin action: Import list of filenames from WhatsApp / GAS text and match with Google Drive file IDs
  if (body?.action === 'import_text') {
    const rawText = String(body.raw_text || '')
    const candidateNames = parseWhatsappPhotoNames(rawText)
    if (candidateNames.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tidak ditemukan nama file foto yang valid pada teks yang ditempel.'
      })
    }

    const folderId =
      order.drive_folder_id ||
      extractFolderId(order.drive_link) ||
      extractFolderId(order.client_selection_link)

    if (!folderId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Link Folder Google Drive belum diatur pada proyek ini.'
      })
    }

    const driveFiles = await fetchDriveFolderFiles(folderId, apiKey)
    const exactMap = new Map<string, { id: string; name: string }>()
    const baseNameMap = new Map<string, { id: string; name: string }>()

    for (const file of driveFiles) {
      const lower = file.name.toLowerCase()
      exactMap.set(lower, file)
      const base = lower.replace(/\.[^.]+$/, '')
      if (!baseNameMap.has(base)) {
        baseNameMap.set(base, file)
      }
    }

    const matchedPhotos: Array<{ id: string; name: string }> = []
    const unmatchedNames: string[] = []
    const seenIds = new Set<string>()

    for (const rawName of candidateNames) {
      const lower = rawName.toLowerCase()
      const base = lower.replace(/\.[^.]+$/, '')
      const found = exactMap.get(lower) || baseNameMap.get(base)
      if (found) {
        if (!seenIds.has(found.id)) {
          seenIds.add(found.id)
          matchedPhotos.push({ id: found.id, name: found.name })
        }
      } else {
        unmatchedNames.push(rawName)
      }
    }

    if (matchedPhotos.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `Tidak ada nama file yang cocok di folder Drive (${driveFiles.length} foto diperiksa).`
      })
    }

    await supabase
      .from('orders')
      .update({
        selected_photos: matchedPhotos,
        selection_locked: true
      })
      .eq('id', orderId)

    if (existingSelectionTask?.id) {
      await supabase
        .from('order_tasks')
        .update({
          technical_note: JSON.stringify(matchedPhotos),
          is_completed: true
        })
        .eq('id', existingSelectionTask.id)
    } else {
      await supabase
        .from('order_tasks')
        .insert({
          order_id: orderId,
          task_name: '__CLIENT_SELECTION__',
          category: '__SELECTION__',
          technical_note: JSON.stringify(matchedPhotos),
          is_completed: true
        })
    }

    return {
      success: true,
      selected_photos: matchedPhotos,
      unmatched: unmatchedNames,
      selection_locked: true
    }
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
