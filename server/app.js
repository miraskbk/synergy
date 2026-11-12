import http from 'node:http'
import { WebSocketServer } from 'ws'
import { parseMessage, makeMessage, send, sendError } from './protocol.js'
import { createHub } from './hub.js'
import { startHeartbeat } from './heartbeat.js'
import { getBearerToken, rejectUpgrade } from './auth.js'
import { handleChat } from './handlers/chat.js'
import { handleCode } from './handlers/code.js'
import { handleDiff } from './handlers/diff.js'

const handlers = new Map([
  ['chat', handleChat],
  ['code', handleCode],
  ['diff', handleDiff],
])

export function createServer({ port, heartbeatIntervalMs, verifyToken, allowedUsers = null }) {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      return res.end('ok')
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('This is a Synergy chat server. Connect with the Synergy CLI.')
  })
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 })
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
    if (allowedUsers && !allowedUsers.includes(user.login.toLowerCase())) {
      console.log(`${user.login} is not on the allowed users list`)
      return rejectUpgrade(socket, 403, 'Forbidden')
    }

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
