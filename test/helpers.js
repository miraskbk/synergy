import { once } from 'node:events'
import { WebSocket } from 'ws'
import { createServer } from '../server/app.js'
import { setTimeout, clearTimeout } from 'node:timers'

export async function startServer() {
  const wss = createServer({ port: 0, heartbeatIntervalMs: 30_000 })
  await once(wss, 'listening')

  return {
    url: `ws://localhost:${wss.address().port}`,
    close() {
      for (const client of wss.clients) client.terminate()
      wss.close()
    },
  }
}

export async function connect(url) {
  const ws = new WebSocket(url)
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

export async function join(url, user) {
  const client = await connect(url)
  client.send({ type: 'join', user })
  await client.next() //welcome
  await client.next() //"<user> joined"
  return client
}
