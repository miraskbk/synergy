import { randomUUID } from 'node:crypto'

export function parseMessage(data) {
  let msg
  try {
    msg = JSON.parse(data.toString())
  } catch {
    return { error: 'invalid JSON' }
  }

  if (typeof msg !== 'object' || msg === null || Array.isArray(msg)) {
    return { error: 'message must be a JSON object' }
  }
  return { msg }
}

export function makeMessage(type, fields = {}) {
  return { ...fields, type, id: randomUUID(), ts: Date.now() }
}

export function send(ws, msg) {
  ws.send(JSON.stringify(msg))
}

export function sendError(ws, text) {
  send(ws, makeMessage('error', { text }))
}
