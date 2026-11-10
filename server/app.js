import http from 'node:http'
import { WebSocketServer } from 'ws'
import { parseMessage, makeMessage, send, sendError } from './protocol.js'
import { createHub } from './hub.js'
import { startHeartbeat } from './heartbeat.js'
import { getBearerToken, rejectUpgrade } from './auth.js'
import { handleChat } from './handlers/chat.js'

const handlers = new Map([['chat', handleChat]])

export function createServer({ port, heartbeatIntervalMs, verifyToken }) {
  const server = http.createServer()
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 })
  const hub = createHub(wss)

  const stopHeartbeat = startHeartbeat(wss, heartbeatIntervalMs)
  wss.on('close', stopHeartbeat)

  server.on('upgrade', async (req, socket, head) => {
    const token = getBearerToken(req)
    if (!token) return rejectUpgrade(socket, 401, 'Unauthorized')

    let user
    try {
      user = await verifyToken(token)
    } catch (err) {
      console.error('token verification failed:', err.message)
      return rejectUpgrade(socket, 503, 'Service Unavailable')
    }
    if (!user) return rejectUpgrade(socket, 401, 'Unauthorized')

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user
      wss.emit('connection', ws)
    })
  })

  wss.on('connection', (ws) => {
    const { login, id } = ws.user
    console.log(`${login} connected`)

    send(ws, makeMessage('welcome', { user: login, users: hub.onlineUsers() }))
    if (hub.connectionCount(id) === 1) {
      hub.broadcast(makeMessage('system', { text: `${login} joined` }))
    }

    ws.on('error', (err) => {
      console.error(`socket error (${login}):`, err.message)
    })

    ws.on('message', (data) => {
      const { msg, error } = parseMessage(data)
      if (error) return sendError(ws, error)

      const handler = handlers.get(msg.type)
      if (!handler) return sendError(ws, `unknown message type: ${msg.type}`)

      handler(ws, msg, hub)
    })

    ws.on('close', () => {
      console.log(`${login} disconnected`)

      if (hub.connectionCount(id) === 0) {
        hub.broadcast(makeMessage('system', { text: `${login} left` }))
      }
    })
  })

  server.listen(port)

  return { server, wss }
}
