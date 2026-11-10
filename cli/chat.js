import readline from 'node:readline'
import { styleText } from 'node:util'
import { WebSocket } from 'ws'
import { deviceLogin, fetchLogin, saveToken, loadToken, deleteToken } from './auth.js'

const command = process.argv[2]

if (command === 'login') {
  try {
    const token = await deviceLogin((code, url) => {
      console.log(`Open ${url} and enter the code: ${styleText('bold', code)}`)
      console.log('Waiting for you to approve in the browser...')
    })
    const file = await saveToken(token)
    console.log(
      styleText('green', `Logged in as ${await fetchLogin(token)} (token saved to ${file})`),
    )
    process.exit(0)
  } catch (err) {
    console.error(styleText('red', `login failed: ${err.message}`))
    process.exit(1)
  }
}

if (command === 'logout') {
  await deleteToken()
  console.log('Logged out.')
  process.exit(0)
}

const url = command ?? 'ws://localhost:8080'
const token = await loadToken()

if (!token) {
  console.error('You are not logged in. Run: npm run chat -- login')
  process.exit(1)
}

const ws = new WebSocket(url, {
  headers: { Authorization: `Bearer ${token}` },
})
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function print(line) {
  readline.clearLine(process.stdout, 0)
  readline.cursorTo(process.stdout, 0)
  console.log(line)
  rl.prompt(true)
}

function clean(text) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '')
}

function time(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString())

  if (msg.type === 'welcome') {
    print(styleText('green', `* connected as ${clean(msg.user)}`))
    print(styleText('gray', `* online: ${msg.users.map(clean).join(', ')}`))
  } else if (msg.type === 'chat') {
    const user = styleText('cyan', clean(msg.user))
    print(`${styleText('gray', time(msg.ts))} ${user}: ${clean(msg.text)}`)
  } else if (msg.type === 'system') {
    print(styleText('gray', `* ${clean(msg.text)}`))
  } else if (msg.type === 'error') {
    print(styleText('red', `! ${clean(msg.text)}`))
  }
})

ws.on('close', () => {
  console.log(styleText('yellow', '\ndisconnected from server'))
  process.exit(0)
})

ws.on('unexpected-response', (req, res) => {
  if (res.statusCode === 401) {
    console.error(styleText('red', 'Your login expired or was revoked. Run: npm run chat -- login'))
  } else {
    console.error(
      styleText('red', `server refused the connection: ${res.statusCode} ${res.statusMessage}`),
    )
  }
  process.exit(1)
})

ws.on('error', (err) => {
  console.error(styleText('red', `could not connect to ${url} (${err.code ?? err.message})`))
  process.exit(1)
})

rl.on('line', (line) => {
  if (line === '/quit') return ws.close()
  if (line.trim() === '') return rl.prompt()

  ws.send(JSON.stringify({ type: 'chat', text: line }))
  readline.moveCursor(process.stdout, 0, -1)
  readline.clearLine(process.stdout, 0)
})

rl.on('close', () => ws.close())

rl.setPrompt('> ')
rl.prompt()
