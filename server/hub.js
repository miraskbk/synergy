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

  function isNameTaken(name) {
    for (const client of wss.clients) {
      if (client.user === name) {
        return true
      }
    }
    return false
  }

  return { broadcast, isNameTaken }
}
