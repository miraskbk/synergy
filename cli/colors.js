import { styleText } from 'node:util'

const USER_COLORS = [
  'cyan',
  'magenta',
  'yellow',
  'green',
  'cyanBright',
  'magentaBright',
  'blueBright',
  'yellowBright',
  'greenBright',
]

// The same login always gives the same number, so everyone sees a user in the same color.
export function colorFor(login) {
  let hash = 0
  for (const char of login.toLowerCase()) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0
  }
  return USER_COLORS[hash % USER_COLORS.length]
}

export function colorUser(login) {
  return styleText(colorFor(login), login)
}
