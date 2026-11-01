import { defineEventHandler, getQuery, setResponseHeaders, sendStream, createError } from 'h3'

// Streams raw binary file content directly from Google Drive API v3 without Base64 conversion.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const fileId = String(query.id || '').trim()
  const rawName = String(query.name || 'photo.jpg').trim()
  const config = useRuntimeConfig()
  const apiKey = config.googleDriveApiKey

  if (!fileId) {
    throw createError({ statusCode: 400, statusMessage: 'Parameter id wajib diisi.' })
  }
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'GOOGLE_DRIVE_API_KEY belum dikonfigurasi.' })
  }

  const mediaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}`
  let upstream = await fetch(mediaUrl)

  // Fallback to public Google Drive direct download endpoint if API key quota or scope restricts alt=media.
  if (!upstream.ok) {
    const fallbackUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
    upstream = await fetch(fallbackUrl)
  }

  if (!upstream.ok || !upstream.body) {
    throw createError({
      statusCode: upstream.status || 502,
      statusMessage: 'Gagal mengunduh file dari Google Drive. Pastikan izin folder Anyone with the link.'
    })
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
  const contentLength = upstream.headers.get('content-length')
  const safeFilename = rawName.replace(/["\r\n]/g, '_')

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(rawName)}`,
    'Cache-Control': 'public, max-age=86400, immutable'
  }
  if (contentLength) {
    headers['Content-Length'] = contentLength
  }

  setResponseHeaders(event, headers)
  return sendStream(event, upstream.body as any)
})
