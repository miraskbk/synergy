import { sendError, makeMessage } from '../protocol.js'
import { MAX_CODE_LENGTH, MAX_FILE_NAME_LENGTH } from '../config.js'

export function handleDiff(ws, msg, hub) {
  const { file, text } = msg

  if (typeof file !== 'string') {
    return sendError(ws, 'file must be a string')
  }
  if (file.length > MAX_FILE_NAME_LENGTH) {
    return sendError(ws, `file name longer than ${MAX_FILE_NAME_LENGTH} characters`)
  }

  if (typeof text !== 'string') return sendError(ws, 'text must be a string')
  if (text.trim().length === 0) return sendError(ws, 'diff is empty')
  if (text.length > MAX_CODE_LENGTH) {
    return sendError(ws, `diff longer than ${MAX_CODE_LENGTH} characters`)
  }

  hub.broadcast(makeMessage('diff', { user: ws.user.login, file, text }))
}
