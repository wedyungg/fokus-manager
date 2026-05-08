import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig()
  
  const apiKey = config.googleDriveApiKey
  const rootFolderId = config.public.googleDriveFolderId
  
  if (!apiKey || !rootFolderId) {
    return { error: 'Google Drive API Key or Folder ID is missing in .env' }
  }

  const type = query.type || 'images' // 'folders' or 'images'
  const parentId = query.folderId || rootFolderId

  try {
    let q = ''
    if (type === 'folders') {
      q = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    } else {
      q = `'${parentId}' in parents and mimeType contains 'image/' and trashed = false`
    }

    // fields to fetch: we need id, name, and either thumbnailLink or webContentLink to display the image.
    // thumbnailLink is great for galleries as it's optimized.
    const apiUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&key=${apiKey}&fields=files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink)`

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (data.error) {
      throw new Error(data.error.message)
    }

    // Map files to cleaner format
    const files = data.files.map((file: any) => {
      // thumbnailLink is usually up to 220px wide, we can modify the size param in the URL for better quality.
      // Example original: https://lh3.googleusercontent.com/...=s220
      // We change it to s800 for better masonry quality.
      let imgUrl = file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s800') : file.webContentLink

      return {
        id: file.id,
        title: file.name.split('.')[0], // Remove extension for display
        url: imgUrl,
        originalUrl: file.webViewLink,
        mimeType: file.mimeType
      }
    })

    return { files }
  } catch (err: any) {
    return { error: err.message }
  }
})
