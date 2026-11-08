import { makeMessage, sendError } from '../protocol.js'
import { MAX_NAME_LENGTH } from '../config.js'

export function handleJoin(ws, msg, hub) {
  if (ws.user) return sendError(ws, 'already joined')
  if (typeof msg.user !== 'string') return sendError(ws, 'user must be a string')

  const name = msg.user.trim()
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    return sendError(ws, `name must be 1 - ${MAX_NAME_LENGTH} characters`)
  }

  if (hub.isNameTaken(name)) return sendError(ws, 'name already taken')

  ws.user = name
  hub.broadcast(makeMessage('system', { text: `${name} joined` }))
}
