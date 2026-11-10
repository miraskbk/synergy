import fs from 'node:fs/promises'

const SHARE_ARG = /^(.+?)(?::(\d+)(?:-(\d+))?)?$/

export const SHARE_USAGE =
  'usage: /share <file>[:<line>[-<line>]]   e.g. /share server/hub.js:14-20'

export async function readSnippet(arg, maxLength) {
  const match = arg.trim().match(SHARE_ARG)
  if (!match) throw new Error(SHARE_USAGE)

  const [, file, from, to] = match

  let content
  try {
    content = await fs.readFile(file, 'utf8')
  } catch (err) {
    let reason = `could not read ${file} (${err.code ?? err.message})`
    if (err.code === 'ENOENT') reason = `file not found: ${file}`
    if (err.code === 'EISDIR') reason = `${file} is a folder, not a file`
    throw new Error(reason, { cause: err })
  }

  const lines = content.split('\n')
  if (lines.at(-1) === '') lines.pop()

  const startLine = from ? Number(from) : 1
  const endLine = to ? Number(to) : from ? startLine : lines.length

  if (startLine < 1 || startLine > lines.length) {
    throw new Error(`${file} has ${lines.length} lines, line ${startLine} does not exist`)
  }
  if (endLine < startLine) throw new Error(`end line ${endLine} is before start line ${startLine}`)

  const text = lines.slice(startLine - 1, endLine).join('\n')
  if (text.trim().length === 0) throw new Error('those lines are empty')
  if (text.length > maxLength) {
    throw new Error(
      `that is ${text.length} characters, the limit is ${maxLength}, pick fewer lines`,
    )
  }

  return { file, startLine, text }
}
