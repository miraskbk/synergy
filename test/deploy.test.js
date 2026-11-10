import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, connect, login } from './helpers.js'

let server

afterEach(() => {
  server.close()
})

test('the health check answers 200 so the host knows the server is up', async () => {
  server = await startServer()

  const res = await fetch(`${server.httpUrl}/health`)
  assert.equal(res.status, 200)
  assert.equal(await res.text(), 'ok')
})

test('other plain web requests get a 404 instead of hanging', async () => {
  server = await startServer()

  const res = await fetch(server.httpUrl)
  assert.equal(res.status, 404)
})

test('with an allowed users list, only those users get in', async () => {
  server = await startServer({ allowedUsers: ['alice'] })

  await login(server.url, 'alice-token')
  await assert.rejects(connect(server.url, 'bob-token'), /403/)
})

test('without an allowed users list, every valid user gets in', async () => {
  server = await startServer()

  await login(server.url, 'alice-token')
  await login(server.url, 'bob-token')
})
