import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, login } from './helpers.js'

let server

beforeEach(async () => {
  server = await startServer()
})

afterEach(() => {
  server.close()
})

const text = 'diff --git a/a.js b/a.js\n@@ -1 +1 @@\n-old\n+new\n'

test('a diff goes to everyone with the sender login', async () => {
  const alice = await login(server.url, 'alice-token')
  const bob = await login(server.url, 'bob-token')
  await alice.next() // "bob joined"

  alice.send({ type: 'diff', user: 'bob', file: 'a.js', text })

  for (const client of [alice, bob]) {
    const msg = await client.next()
    assert.equal(msg.type, 'diff')
    assert.equal(msg.user, 'alice')
    assert.equal(msg.file, 'a.js')
    assert.equal(msg.text, text, 'the diff must arrive unchanged')
  }
})

test('a diff with no file name (bare /diff) is allowed', async () => {
  const alice = await login(server.url, 'alice-token')

  alice.send({ type: 'diff', file: '', text })

  const msg = await alice.next()
  assert.equal(msg.type, 'diff')
  assert.equal(msg.file, '')
})

test('invalid diff messages are rejected', async () => {
  const alice = await login(server.url, 'alice-token')
  const ok = { type: 'diff', file: 'a.js', text }

  for (const [change, expected] of [
    [{ file: undefined }, 'file must be a string'],
    [{ file: 5 }, 'file must be a string'],
    [{ file: 'a'.repeat(201) }, 'file name longer than 200 characters'],
    [{ text: undefined }, 'text must be a string'],
    [{ text: 42 }, 'text must be a string'],
    [{ text: '\n\n' }, 'diff is empty'],
    [{ text: 'x'.repeat(8001) }, 'diff longer than 8000 characters'],
  ]) {
    alice.send({ ...ok, ...change })
    const reply = await alice.next()
    assert.equal(reply.type, 'error')
    assert.equal(reply.text, expected)
  }
})
