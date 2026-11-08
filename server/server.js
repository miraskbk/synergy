import { WebSocketServer, WebSocket } from 'ws'
import { parseMessage, makeMessage, sendError } from './protocol.js'
const PORT = Number(process.env.PORT) || 8080
const MAX_NAME_LENGTH = 32
const MAX_TEXT_LENGTH = 4000
const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_MS) || 30_000

const wss = new WebSocketServer({ port: PORT, maxPayload: 16 * 1024 })

wss.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`port ${PORT} is already in use`)
  } else {
    console.error('server error:', err)
  }
  process.exit(1)
})

function broadcast(obj) {
  const data = JSON.stringify(obj)

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  }
}

function isNameTaken(name) {
  for (const client of wss.clients) {
    if (client.user === name) {
      return true
    }
  }
  return false
}

function handleJoin(ws, msg) {
  if (ws.user) return sendError(ws, 'already joined')
  if (typeof msg.user !== 'string') return sendError(ws, 'user must be a string')

  const name = msg.user.trim()
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    return sendError(ws, `name must be 1 - ${MAX_NAME_LENGTH} characters`)
  }

  if (isNameTaken(name)) return sendError(ws, 'name already taken')

  ws.user = name
  broadcast(makeMessage('system', { text: `${name} joined` }))
}

function handleChat(ws, msg) {
  if (!ws.user) return sendError(ws, 'join first')
  if (typeof msg.text !== 'string') return sendError(ws, 'text must be a string')
  if (msg.text.trim().length === 0) return sendError(ws, 'message is empty')
  if (msg.text.length > MAX_TEXT_LENGTH) {
    return sendError(ws, `message longer than ${MAX_TEXT_LENGTH} characters`)
  }

  broadcast(makeMessage('chat', { user: ws.user, text: msg.text }))
}

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
      broadcast(makeMessage('system', { text: `${ws.user} left` }))
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
