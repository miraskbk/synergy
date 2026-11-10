export const PORT = Number(process.env.PORT) || 8080
export const MAX_TEXT_LENGTH = 4000
export const MAX_CODE_LENGTH = 8000
export const MAX_FILE_NAME_LENGTH = 200
export const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_MS) || 30_000

// Comma-separated GitHub logins, e.g. "miraskbk,alice". Empty or unset means everyone may join.
export const ALLOWED_USERS = parseList(process.env.ALLOWED_USERS)

function parseList(value) {
  const list = (value ?? '')
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
  return list.length > 0 ? list : null
}
