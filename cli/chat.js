import readline from 'node:readline'
import { styleText } from 'node:util'
import { WebSocket } from 'ws'

const name = process.argv[2]
const url = process.argv[3] ?? 'ws://localhost:8080'

if (!name) {
  console.error('usage: npm run chat -- <name> [url]')
  process.exit(1)
}

const ws = new WebSocket(url)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
let joined = false

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

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'join', user: name }))
})

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString())

  if (msg.type === 'welcome') {
    joined = true
    print(styleText('green', `* connected as ${clean(msg.user)}`))
    print(styleText('gray', `* online: ${msg.users.map(clean).join(', ')}`))
  } else if (msg.type === 'chat') {
    const user = styleText('cyan', clean(msg.user))
    print(`${styleText('gray', time(msg.ts))} ${user}: ${clean(msg.text)}`)
  } else if (msg.type === 'system') {
    print(styleText('gray', `* ${clean(msg.text)}`))
  } else if (msg.type === 'error') {
    print(styleText('red', `! ${clean(msg.text)}`))
    if (!joined) process.exit(1)
  }
})

ws.on('close', () => {
  console.log(styleText('yellow', '\ndisconnected from server'))
  process.exit(0)
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
