import { WebSocketServer } from 'ws'
import { parseMessage, makeMessage, sendError } from './protocol.js'
import { createHub } from './hub.js'
import { startHeartbeat } from './heartbeat.js'
import { handleChat } from './handlers/chat.js'
import { handleJoin } from './handlers/join.js'

const handlers = new Map([
  ['join', handleJoin],
  ['chat', handleChat],
])

export function createServer({ port, heartbeatIntervalMs }) {
  const wss = new WebSocketServer({ port, maxPayload: 16 * 1024 })
  const hub = createHub(wss)

  const stopHeartbeat = startHeartbeat(wss, heartbeatIntervalMs)
  wss.on('close', stopHeartbeat)

  wss.on('connection', (ws) => {
    console.log('client connected')

    ws.on('error', (err) => {
      console.error(`socket error (${ws.user ?? 'not joined'}):`, err.message)
    })

    ws.on('message', (data) => {
      const { msg, error } = parseMessage(data)
      if (error) return sendError(ws, error)

      const handler = handlers.get(msg.type)
      if (!handler) return sendError(ws, `unknown message type: ${msg.type}`)

      handler(ws, msg, hub)
    })

    ws.on('close', () => {
      console.log('client disconnected')

      if (ws.user) {
        hub.broadcast(makeMessage('system', { text: `${ws.user} left` }))
      }
    })
  })

  return wss
}
