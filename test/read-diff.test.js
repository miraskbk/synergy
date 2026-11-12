import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { readDiff } from '../cli/diff.js'

const run = promisify(execFile)
const startDir = process.cwd()

let dir

// readDiff runs git in the current folder, so each test moves into its own temp folder.
async function inDir(folder, fn) {
  process.chdir(folder)
  try {
    return await fn()
  } finally {
    process.chdir(startDir)
  }
}

// A tiny repo with two committed files: one gets changed, the other stays as committed.
async function makeRepo(folder) {
  const git = (...args) => run('git', args, { cwd: folder })
  await git('init', '--quiet')
  await fs.writeFile(path.join(folder, 'changed.js'), 'one\ntwo\nthree\n')
  await fs.writeFile(path.join(folder, 'same.js'), 'stays the same\n')
  await git('add', '.')
  await git(
    '-c',
    'user.name=test',
    '-c',
    'user.email=test@example.com',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--quiet',
    '-m',
    'start',
  )
}

before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'synergy-diff-'))
})

after(async () => {
  process.chdir(startDir)
  await fs.rm(dir, { recursive: true })
})

test('no changes at all says so', async () => {
  const repo = path.join(dir, 'clean')
  await fs.mkdir(repo)
  await makeRepo(repo)

  await inDir(repo, async () => {
    await assert.rejects(readDiff('', 8000), /no uncommitted changes/)
  })
})

test('a changed file returns its diff', async () => {
  const repo = path.join(dir, 'dirty')
  await fs.mkdir(repo)
  await makeRepo(repo)
  await fs.writeFile(path.join(repo, 'changed.js'), 'one\nTWO\nthree\n')

  await inDir(repo, async () => {
    const one = await readDiff('changed.js', 8000)
    assert.equal(one.file, 'changed.js')
    assert.match(one.text, /^-two$/m)
    assert.match(one.text, /^\+TWO$/m)

    const all = await readDiff('', 8000)
    assert.equal(all.file, '')
    assert.match(all.text, /changed\.js/)

    const spaced = await readDiff('  changed.js  ', 8000)
    assert.equal(spaced.file, 'changed.js', 'spaces around the name are ignored')

    await assert.rejects(readDiff('same.js', 8000), /no changes in same\.js/)
    await assert.rejects(readDiff('nope.js', 8000), /file not found: nope\.js/)
    await assert.rejects(readDiff('--stat', 8000), /file not found: --stat/)
    await assert.rejects(readDiff('', 10), /too long/)
  })
})

test('outside a git repo gives git’s reason', async () => {
  const plain = path.join(dir, 'plain')
  await fs.mkdir(plain)

  await inDir(plain, async () => {
    await assert.rejects(readDiff('', 8000), /not a git repository/i)
  })
})
