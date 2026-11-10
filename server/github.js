export async function verifyGitHubToken(token) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'synergy-chat',
    },
  })
  if (!res.ok) return null

  const data = await res.json()
  return { id: data.id, login: data.login }
}
