import { WebSocket } from 'ws'

export function createHub(wss) {
  function broadcast(obj) {
    const data = JSON.stringify(obj)
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  function connectionCount(userId) {
    let count = 0
    for (const client of wss.clients) {
      if (client.user?.id === userId) count++
    }
    return count
  }

  function onlineUsers() {
    const logins = new Set()
    for (const client of wss.clients) {
      if (client.user) logins.add(client.user.login)
    }
    return [...logins]
  }

  return { broadcast, connectionCount, onlineUsers }
}
