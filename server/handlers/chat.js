import { sendError, makeMessage } from '../protocol.js'
import { MAX_TEXT_LENGTH } from '../config.js'

export function handleChat(ws, msg, hub) {
  if (!ws.user) return sendError(ws, 'join first')
  if (typeof msg.text !== 'string') return sendError(ws, 'text must be a string')
  if (msg.text.trim().length === 0) return sendError(ws, 'message is empty')
  if (msg.text.length > MAX_TEXT_LENGTH) {
    return sendError(ws, `message longer than ${MAX_TEXT_LENGTH} characters`)
  }

  hub.broadcast(makeMessage('chat', { user: ws.user, text: msg.text }))
}
