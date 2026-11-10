import { PORT, HEARTBEAT_INTERVAL_MS } from './config.js'
import { createServer } from './app.js'
import { verifyGitHubToken } from './github.js'

const { server } = createServer({
  port: PORT,
  heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
  verifyToken: verifyGitHubToken,
})

server.on('listening', () => console.log(`listening on ws://localhost:${PORT}`))

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`port ${PORT} already in use`)
  } else {
    console.error('server error:', err)
  }
  process.exit(1)
})
