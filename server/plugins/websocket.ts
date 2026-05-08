import { defineNitroPlugin } from 'nitropack/runtime/plugin'
import ws from 'ws'

export default defineNitroPlugin(() => {
  if (!globalThis.WebSocket) {
    globalThis.WebSocket = ws as any
  }
})
