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

test('shared code goes to everyone with the sender login', async () => {
  const alice = await login(server.url, 'alice-token')
  const bob = await login(server.url, 'bob-token')
  await alice.next() // "bob joined"

  const text = 'function add(a, b) {\n  return a + b\n}'
  alice.send({ type: 'code', user: 'bob', file: 'math.js', startLine: 10, text })

  for (const client of [alice, bob]) {
    const msg = await client.next()
    assert.equal(msg.type, 'code')
    assert.equal(msg.user, 'alice')
    assert.equal(msg.file, 'math.js')
    assert.equal(msg.startLine, 10)
    assert.equal(msg.text, text, 'indentation and newlines must be kept')
  }
})

test('invalid code messages are rejected', async () => {
  const alice = await login(server.url, 'alice-token')
  const ok = { type: 'code', file: 'a.js', startLine: 1, text: 'x = 1' }

  for (const [change, expected] of [
    [{ file: undefined }, 'file must be a non-empty string'],
    [{ file: '  ' }, 'file must be a non-empty string'],
    [{ file: 'a'.repeat(201) }, 'file name longer than 200 characters'],
    [{ startLine: 0 }, 'startLine must be a positive whole number'],
    [{ startLine: '1' }, 'startLine must be a positive whole number'],
    [{ text: 42 }, 'text must be a string'],
    [{ text: '\n\n' }, 'code is empty'],
    [{ text: 'x'.repeat(8001) }, 'code longer than 8000 characters'],
  ]) {
    alice.send({ ...ok, ...change })
    const reply = await alice.next()
    assert.equal(reply.type, 'error')
    assert.equal(reply.text, expected)
  }
})
