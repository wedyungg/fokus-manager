// Uncompressed ZIP (Store method 0) builder for already-compressed JPEG/PNG camera files.
// Avoids CPU-heavy deflate re-compression so bundling dozens of photos completes in milliseconds.

const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[i] = c >>> 0
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export interface ZipEntryInput {
  name: string
  data: Uint8Array
}

export function buildStoreZip(entries: ZipEntryInput[]): Blob {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  const usedNames = new Set<string>()

  for (const entry of entries) {
    let safeName = entry.name.replace(/[\\/:*?"<>|]/g, '_') || 'photo.jpg'
    if (usedNames.has(safeName)) {
      const dotIdx = safeName.lastIndexOf('.')
      const base = dotIdx !== -1 ? safeName.slice(0, dotIdx) : safeName
      const ext = dotIdx !== -1 ? safeName.slice(dotIdx) : ''
      let counter = 2
      while (usedNames.has(`${base}_${counter}${ext}`)) counter++
      safeName = `${base}_${counter}${ext}`
    }
    usedNames.add(safeName)

    const nameBytes = encoder.encode(safeName)
    const crc = crc32(entry.data)
    const size = entry.data.byteLength

    const localHeader = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(localHeader.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // UTF-8 filename flag
    lv.setUint16(8, 0, true) // Store method (0 = no re-compression)
    lv.setUint16(10, 0, true)
    lv.setUint16(12, 0x0021, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true)
    lv.setUint32(22, size, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    localHeader.set(nameBytes, 30)

    localParts.push(localHeader, entry.data)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(centralHeader.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0x0021, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, size, true)
    cv.setUint32(24, size, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)
    centralHeader.set(nameBytes, 46)

    centralParts.push(centralHeader)
    offset += localHeader.byteLength + size
  }

  const centralSize = centralParts.reduce((acc, part) => acc + part.byteLength, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  return new Blob([...localParts, ...centralParts, eocd], { type: 'application/zip' })
}

export interface PhotoDownloadItem {
  id: string
  name: string
}

export async function downloadPhotosAsZip(
  photos: PhotoDownloadItem[],
  zipFileName: string,
  onProgress: (completed: number, total: number, currentFileName: string) => void,
  signal?: AbortSignal,
  concurrency = 4
): Promise<void> {
  const total = photos.length
  if (total === 0) return

  const results: ZipEntryInput[] = new Array(total)
  let completed = 0
  let cursor = 0

  async function worker() {
    while (cursor < total) {
      if (signal?.aborted) throw new DOMException('Unduhan dibatalkan', 'AbortError')
      const index = cursor++
      const photo = photos[index]
      onProgress(completed, total, photo.name)

      const response = await fetch(
        `/api/drive/stream?id=${encodeURIComponent(photo.id)}&name=${encodeURIComponent(photo.name)}`,
        { signal }
      )
      if (!response.ok) {
        throw new Error(`Gagal mengunduh ${photo.name} (HTTP ${response.status})`)
      }
      const buffer = await response.arrayBuffer()
      results[index] = { name: photo.name, data: new Uint8Array(buffer) }
      completed++
      onProgress(completed, total, photo.name)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker())
  await Promise.all(workers)

  if (signal?.aborted) throw new DOMException('Unduhan dibatalkan', 'AbortError')

  const zipBlob = buildStoreZip(results)
  triggerBrowserDownload(zipBlob, zipFileName.endsWith('.zip') ? zipFileName : `${zipFileName}.zip`)
}

export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1500)
}
