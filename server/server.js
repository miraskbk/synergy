import { WebSocketServer } from 'ws'
import { parseMessage, makeMessage, sendError } from './protocol.js'
import { createHub } from './hub.js'
import { PORT, HEARTBEAT_INTERVAL_MS } from './config.js'
import { handleChat } from './handlers/chat.js'
import { handleJoin } from './handlers/join.js'

const wss = new WebSocketServer({ port: PORT, maxPayload: 16 * 1024 })
const hub = createHub(wss)

wss.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`port ${PORT} is already in use`)
  } else {
    console.error('server error:', err)
  }
  process.exit(1)
})

const handlers = new Map([
  ['join', handleJoin],
  ['chat', handleChat],
])

wss.on('connection', (ws) => {
  console.log('client connected')

  ws.isAlive = true
  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('error', (err) => {
    console.error(`socket error (${ws.user ?? 'not joined'}):`, err.message)
  })

  ws.on('message', (data) => {
    const { msg, error } = parseMessage(data)
    if (error) return sendError(ws, error)

    const handler = handlers.get(msg.type)
    if (!handler) return sendError(ws, `unknown message type: ${msg.type}`)

    handler(ws, msg)
  })

  ws.on('close', () => {
    console.log('client disconnected')

    if (ws.user) {
      hub.broadcast(makeMessage('system', { text: `${ws.user} left` }))
    }
  })
})

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate()
      continue
    }
    ws.isAlive = false
    ws.ping()
  }
}, HEARTBEAT_INTERVAL_MS)

wss.on('close', () => clearInterval(heartbeat))

wss.on('listening', () => console.log(`listening on ws://localhost:${PORT}`))
