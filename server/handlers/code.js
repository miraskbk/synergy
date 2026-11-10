import { sendError, makeMessage } from '../protocol.js'
import { MAX_CODE_LENGTH, MAX_FILE_NAME_LENGTH } from '../config.js'

export function handleCode(ws, msg, hub) {
  const { file, startLine, text } = msg

  if (typeof file !== 'string' || file.trim().length === 0) {
    return sendError(ws, 'file must be a non-empty string')
  }
  if (file.length > MAX_FILE_NAME_LENGTH) {
    return sendError(ws, `file name longer than ${MAX_FILE_NAME_LENGTH} characters`)
  }
  if (!Number.isInteger(startLine) || startLine < 1) {
    return sendError(ws, 'startLine must be a positive whole number')
  }
  if (typeof text !== 'string') return sendError(ws, 'text must be a string')
  if (text.trim().length === 0) return sendError(ws, 'code is empty')
  if (text.length > MAX_CODE_LENGTH) {
    return sendError(ws, `code longer than ${MAX_CODE_LENGTH} characters`)
  }

  hub.broadcast(makeMessage('code', { user: ws.user.login, file, startLine, text }))
}
