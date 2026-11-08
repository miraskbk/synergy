export function startHeartbeat(wss, intervalMs) {
  wss.on('connection', (ws) => {
    ws.isAlive = true
    ws.on('pong', () => {
      ws.isAlive = true
    })
  })

  const timer = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate()
        continue
      }
      ws.isAlive = false
      ws.ping()
    }
  }, intervalMs)
  return () => clearInterval(timer)
}
