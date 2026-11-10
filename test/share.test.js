import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { readSnippet } from '../cli/share.js'

let dir
let file

before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'synergy-'))
  file = path.join(dir, 'five.js')
  await fs.writeFile(file, 'one\n  two\nthree\nfour\nfive\n')
})

after(async () => {
  await fs.rm(dir, { recursive: true })
})

test('a range returns those lines with indentation kept', async () => {
  const snippet = await readSnippet(`${file}:2-3`, 8000)
  assert.deepEqual(snippet, { file, startLine: 2, text: '  two\nthree' })
})

test('one line number returns that line', async () => {
  assert.equal((await readSnippet(`${file}:4`, 8000)).text, 'four')
})

test('no line numbers returns the whole file', async () => {
  const snippet = await readSnippet(file, 8000)
  assert.equal(snippet.startLine, 1)
  assert.equal(snippet.text, 'one\n  two\nthree\nfour\nfive')
})

test('an end line past the end stops at the last line', async () => {
  assert.equal((await readSnippet(`${file}:4-99`, 8000)).text, 'four\nfive')
})

test('bad input gives a readable error', async () => {
  await assert.rejects(readSnippet(path.join(dir, 'nope.js'), 8000), /file not found/)
  await assert.rejects(readSnippet(dir, 8000), /is a folder/)
  await assert.rejects(readSnippet(`${file}:9`, 8000), /has 5 lines, line 9 does not exist/)
  await assert.rejects(readSnippet(`${file}:0`, 8000), /line 0 does not exist/)
  await assert.rejects(readSnippet(`${file}:3-2`, 8000), /end line 2 is before start line 3/)
  await assert.rejects(readSnippet(file, 10), /limit is 10/)
})
