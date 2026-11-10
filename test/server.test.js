import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, connect, login } from './helpers.js'

let server

beforeEach(async () => {
  server = await startServer()
})

afterEach(() => {
  server.close()
})

test('connecting without a token is rejected', async () => {
  await assert.rejects(connect(server.url), /401/)
})

test('connecting with an invalid token is rejected', async () => {
  await assert.rejects(connect(server.url, 'stolen-or-expired'), /401/)
})

test('a verifier failure rejects with 503 instead of crashing', async () => {
  await assert.rejects(connect(server.url, 'github-down-token'), /503/)
  await login(server.url, 'alice-token')
})

test('a valid token gets a welcome with the GitHub login and online users', async () => {
  const alice = await login(server.url, 'alice-token')
  const bob = await connect(server.url, 'bob-token')

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

test('join messages are no longer accepted', async () => {
  const alice = await login(server.url, 'alice-token')

  alice.send({ type: 'join', user: 'admin' })
  const reply = await alice.next()

  assert.equal(reply.type, 'error')
  assert.equal(reply.text, 'unknown message type: join')
})

test('chat uses the verified login, not a name sent by the client', async () => {
  const alice = await login(server.url, 'alice-token')
  const bob = await login(server.url, 'bob-token')
  await alice.next() // "bob joined"

  alice.send({ type: 'chat', user: 'bob', text: '  indented code' })
  const msg = await bob.next()

  assert.equal(msg.type, 'chat')
  assert.equal(msg.user, 'alice')
  assert.equal(msg.text, '  indented code')
})

test('a second connection from the same user is allowed and not announced', async () => {
  const bob = await login(server.url, 'bob-token')
  await login(server.url, 'alice-token')
  await bob.next() // "alice joined"

  const aliceLaptop = await connect(server.url, 'alice-token')
  const welcome = await aliceLaptop.next()
  assert.deepEqual(welcome.users.sort(), ['alice', 'bob'])

  bob.send({ type: 'chat', text: 'ping' })
  const next = await bob.next()
  assert.equal(next.text, 'ping', 'bob should not see a second "alice joined"')
})

test('"left" is announced only when the last connection closes', async () => {
  const bob = await login(server.url, 'bob-token')
  const aliceDesktop = await login(server.url, 'alice-token')
  await bob.next() // "alice joined"
  const aliceLaptop = await connect(server.url, 'alice-token')
  await aliceLaptop.next() // welcome

  aliceDesktop.close()
  bob.send({ type: 'chat', text: 'still here?' })
  assert.equal((await bob.next()).text, 'still here?', 'alice still has a connection')

  aliceLaptop.close()
  const notice = await bob.next()
  assert.equal(notice.text, 'alice left')
})

test('invalid messages get errors and do not crash the server', async () => {
  const client = await login(server.url, 'alice-token')

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

  await login(server.url, 'bob-token')
})

test('empty and too long messages are rejected', async () => {
  const alice = await login(server.url, 'alice-token')

  alice.send({ type: 'chat', text: '   ' })
  assert.equal((await alice.next()).text, 'message is empty')

  alice.send({ type: 'chat', text: 'x'.repeat(4001) })
  assert.equal((await alice.next()).text, 'message longer than 4000 characters')
})
