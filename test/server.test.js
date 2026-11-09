import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, connect, join } from './helpers.js'

let server

beforeEach(async () => {
  server = await startServer()
})

afterEach(() => {
  server.close()
})

test('join sends a welcome with the trimmed name and online users', async () => {
  const alice = await join(server.url, 'alice')
  const bob = await connect(server.url)

  bob.send({ type: 'join', user: '  bob  ' })
  const welcome = await bob.next()

  assert.equal(welcome.type, 'welcome')
  assert.equal(welcome.user, 'bob')
  assert.deepEqual(welcome.users.sort(), ['alice', 'bob'])
  assert.equal(typeof welcome.id, 'string')
  assert.equal(typeof welcome.ts, 'number')

  const notice = await alice.next()
  assert.equal(notice.type, 'system')
  assert.equal(notice.text, 'bob joined')
})

test('chat is broadcast with the server-side user name', async () => {
  const alice = await join(server.url, 'alice')
  const bob = await join(server.url, 'bob')
  await alice.next() // "bob joined"

  alice.send({ type: 'chat', user: 'bob', text: '  indented code' })
  const msg = await bob.next()

  assert.equal(msg.type, 'chat')
  assert.equal(msg.user, 'alice')
  assert.equal(msg.text, '  indented code')
})

test('duplicate names are rejected', async () => {
  await join(server.url, 'alice')
  const other = await connect(server.url)

  other.send({ type: 'join', user: 'alice' })
  const reply = await other.next()

  assert.equal(reply.type, 'error')
  assert.equal(reply.text, 'name already taken')
})

test('cannot chat before joining', async () => {
  const client = await connect(server.url)

  client.send({ type: 'chat', text: 'hi' })
  const reply = await client.next()

  assert.equal(reply.type, 'error')
  assert.equal(reply.text, 'join first')
})

test('invalid messages get errors and do not crash the server', async () => {
  const client = await connect(server.url)

  for (const [input, expected] of [
    ['null', 'message must be a JSON object'],
    ['[1, 2]', 'message must be a JSON object'],
    ['not json', 'invalid JSON'],
    ['{"type":"toString"}', 'unknown message type: toString'],
  ]) {
    client.send(input)
    const reply = await client.next()
    assert.equal(reply.type, 'error')
    assert.equal(reply.text, expected)
  }

  await join(server.url, 'still-works')
})

test('empty and too long messages are rejected', async () => {
  const alice = await join(server.url, 'alice')

  alice.send({ type: 'chat', text: '   ' })
  assert.equal((await alice.next()).text, 'message is empty')

  alice.send({ type: 'chat', text: 'x'.repeat(4001) })
  assert.equal((await alice.next()).text, 'message longer than 4000 characters')
})

test('leaving is announced to others', async () => {
  const alice = await join(server.url, 'alice')
  const bob = await join(server.url, 'bob')
  await alice.next() // "bob joined"

  bob.close()
  const notice = await alice.next()

  assert.equal(notice.type, 'system')
  assert.equal(notice.text, 'bob left')
})
