import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

export const DIFF_USAGE = 'usage: /diff [<file>]   e.g. /diff or /diff cli/chat.js'

const run = promisify(execFile)

export async function readDiff(arg, maxLength) {
  const file = arg.trim()

  const args = file ? ['diff', '--', file] : ['diff']

  let stdout

  try {
    ;({ stdout } = await run('git', args))
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`git is not installed`, { cause: err })
    }
    throw new Error(err.stderr.split('\n')[0], { cause: err })
  }

  if (stdout.trim() === '') {
    if (file) {
      try {
        await fs.access(file)
      } catch (err) {
        throw new Error(`file not found: ${file}`, { cause: err })
      }
      throw new Error(`no changes in ${file}`)
    }
    throw new Error(`no uncommitted changes\n${DIFF_USAGE}`)
  }

  if (stdout.length > maxLength) throw new Error(`too long, try one file\n${DIFF_USAGE}`)

  return { file, text: stdout }
}
