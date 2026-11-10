import { once } from 'node:events'
import { setTimeout, clearTimeout } from 'node:timers'
import { WebSocket } from 'ws'
import { createServer } from '../server/app.js'

const fakeUsers = new Map([
  ['alice-token', { id: 1, login: 'alice' }],
  ['bob-token', { id: 2, login: 'bob' }],
])

async function fakeVerifyToken(token) {
  if (token === 'github-down-token') throw new Error('GitHub unreachable')
  return fakeUsers.get(token) ?? null
}

export async function startServer(options = {}) {
  const { server, wss } = createServer({
    port: 0,
    heartbeatIntervalMs: 30_000,
    verifyToken: fakeVerifyToken,
    ...options,
  })
  await once(server, 'listening')

  return {
    url: `ws://localhost:${server.address().port}`,
    httpUrl: `http://localhost:${server.address().port}`,
    close() {
      for (const client of wss.clients) client.terminate()
      wss.close()
      server.close()
    },
  }
}

export async function connect(url, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const ws = new WebSocket(url, { headers })
  const inbox = []
  const waiting = []

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString())
    if (waiting.length > 0) {
      waiting.shift()(msg)
    } else {
      inbox.push(msg)
    }
  })

  await once(ws, 'open')

  return {
    send(msg) {
      ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },

    next() {
      if (inbox.length > 0) return Promise.resolve(inbox.shift())

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('no message within 1s')), 1000)
        waiting.push((msg) => {
          clearTimeout(timer)
          resolve(msg)
        })
      })
    },

    close() {
      ws.close()
    },
  }
}

export async function login(url, token) {
  const client = await connect(url, token)
  await client.next()
  await client.next()
  return client
}
