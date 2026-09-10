const OWNER = 'ishaysh92'
const REPO = 'songbook'
const PATH = 'public/songs.json'
const BRANCH = 'main'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export const config = { runtime: 'edge' }

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
  })
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function base64ToUtf8(value: string): string {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function token(): string {
  return process.env.SONGS_GITHUB_TOKEN || process.env.GITHUB_TOKEN || ''
}

async function github(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token()}`,
      'User-Agent': 'songbook',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function GET(): Promise<Response> {
  const response = await fetch(
    `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${PATH}?t=${Date.now()}`,
    { cache: 'no-store' },
  )
  if (!response.ok) return json([], 200)
  return json(await response.json())
}

export async function PUT(request: Request): Promise<Response> {
  if (!token()) return json({ error: 'missing token' }, 500)
  const songs = await request.json()
  const file = await github(`/repos/${OWNER}/${REPO}/contents/${PATH}?ref=${BRANCH}`)
  const current = file.ok ? ((await file.json()) as { sha: string; content: string }) : null
  const content = utf8ToBase64(`${JSON.stringify(songs, null, 2)}\n`)
  const message = 'Update shared songbook catalog'

  if (current?.content) {
    try {
      const existing = JSON.parse(base64ToUtf8(current.content))
      if (JSON.stringify(existing) === JSON.stringify(songs)) return json({ ok: true })
    } catch {
      // replace anyway
    }
  }

  const put = await github(`/repos/${OWNER}/${REPO}/contents/${PATH}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content,
      branch: BRANCH,
      ...(current?.sha ? { sha: current.sha } : {}),
    }),
  })
  if (!put.ok) {
    const error = await put.text()
    return json({ error }, put.status)
  }
  return json({ ok: true })
}
