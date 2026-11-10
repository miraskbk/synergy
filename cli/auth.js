import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const CLIENT_ID = 'Iv23liLy3zPzv2qCzuUd'

const configDir = path.join(
  process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'),
  'synergy',
)
const tokenFile = path.join(configDir, 'token.json')

async function postForm(url, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams(params),
  })
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
  return res.json()
}

export async function deviceLogin(showCode) {
  const code = await postForm('https://github.com/login/device/code', { client_id: CLIENT_ID })
  if (code.error) throw new Error(code.error_description ?? code.error)

  showCode(code.user_code, code.verification_uri)

  let interval = code.interval
  const deadline = Date.now() + code.expires_in * 1000

  while (Date.now() < deadline) {
    await sleep(interval * 1000)

    const res = await postForm('https://github.com/login/oauth/access_token', {
      client_id: CLIENT_ID,
      device_code: code.device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    })

    if (res.access_token) return res.access_token
    if (res.error === 'authorization_pending') continue
    if (res.error === 'slow_down') {
      interval = res.interval ?? interval + 5
      continue
    }
    if (res.error === 'access_denied') throw new Error('login was cancelled in the browser')
    if (res.error === 'expired_token') break
    throw new Error(res.error_description ?? res.error)
  }

  throw new Error('the code expired before it was approved, run login again')
}

export async function fetchLogin(token) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'synergy-chat',
    },
  })
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
  return (await res.json()).login
}

export async function saveToken(token) {
  await fs.mkdir(configDir, { recursive: true, mode: 0o700 })
  await fs.writeFile(tokenFile, JSON.stringify({ token }), { mode: 0o600 })
  await fs.chmod(tokenFile, 0o600)
  return tokenFile
}

export async function loadToken() {
  try {
    const data = JSON.parse(await fs.readFile(tokenFile, 'utf8'))
    return data.token ?? null
  } catch {
    return null
  }
}

export async function deleteToken() {
  await fs.rm(tokenFile, { force: true })
}
