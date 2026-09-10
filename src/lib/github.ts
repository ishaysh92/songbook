import type { Song } from '../types'
import { parseStoredSongs, songsToExport } from './storage'

const TOKEN_KEY = 'songbook.github.token'
const PATH = 'public/songs.json'
const BRANCH = 'main'

export function getGithubToken(): string {
  return localStorage.getItem(TOKEN_KEY)?.trim() ?? ''
}

export function setGithubToken(token: string): void {
  const value = token.trim()
  if (value) localStorage.setItem(TOKEN_KEY, value)
  else localStorage.removeItem(TOKEN_KEY)
}

export function inferGithubRepo(): { owner: string; repo: string } {
  const host = window.location.hostname
  const match = host.match(/^([^.]+)\.github\.io$/i)
  if (match) {
    const owner = match[1]
    const repo = window.location.pathname.split('/').filter(Boolean)[0] ?? `${owner}.github.io`
    return { owner, repo }
  }
  return { owner: 'ishaysh92', repo: 'songbook' }
}

function authHeaders(token = getGithubToken()): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
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

export async function fetchSongsFromGithub(): Promise<Song[] | null> {
  const { owner, repo } = inferGithubRepo()
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${BRANCH}/${PATH}?t=${Date.now()}`
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return null
    return parseStoredSongs(await response.json(), 'catalog')
  } catch {
    return null
  }
}

export async function verifyGithubToken(token: string): Promise<void> {
  const { owner, repo } = inferGithubRepo()
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: authHeaders(token),
  })
  if (response.status === 401 || response.status === 403) {
    throw new Error('BAD_TOKEN')
  }
  if (response.status === 404) {
    throw new Error('REPO_NOT_FOUND')
  }
  if (!response.ok) {
    throw new Error('GITHUB_FAILED')
  }
}

async function readRemoteFile(token: string): Promise<{ sha?: string; songs: Song[] }> {
  const { owner, repo } = inferGithubRepo()
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${PATH}?ref=${BRANCH}`,
    { headers: authHeaders(token) },
  )
  if (response.status === 404) return { songs: [] }
  if (!response.ok) throw new Error(response.status === 401 ? 'BAD_TOKEN' : 'GITHUB_FAILED')
  const data = (await response.json()) as { sha: string; content: string }
  const songs = parseStoredSongs(JSON.parse(base64ToUtf8(data.content)), 'catalog')
  return { sha: data.sha, songs }
}

export async function commitSongsToGithub(songs: Song[], message: string): Promise<void> {
  const token = getGithubToken()
  if (!token) throw new Error('NO_TOKEN')

  const { owner, repo } = inferGithubRepo()
  const payload = JSON.stringify(songsToExport(songs), null, 2) + '\n'

  async function put(sha?: string) {
    return fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${PATH}`, {
      method: 'PUT',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: utf8ToBase64(payload),
        branch: BRANCH,
        ...(sha ? { sha } : {}),
      }),
    })
  }

  const remote = await readRemoteFile(token)
  let response = await put(remote.sha)
  if (response.status === 409 || response.status === 422) {
    const latest = await readRemoteFile(token)
    response = await put(latest.sha)
  }
  if (response.status === 401 || response.status === 403) throw new Error('BAD_TOKEN')
  if (!response.ok) throw new Error('GITHUB_FAILED')
}

export function describeGithubError(error: unknown): string {
  const code = error instanceof Error ? error.message : ''
  switch (code) {
    case 'NO_TOKEN':
      return 'כדי לשמור לכל המכשירים, הדביקו אסימון GitHub בהגדרות.'
    case 'BAD_TOKEN':
      return 'האסימון לא תקין או שאין לו הרשאת כתיבה לריפו.'
    case 'REPO_NOT_FOUND':
      return 'הריפו לא נמצא. בדקו שהאתר מחובר ל-ishaysh92/songbook.'
    default:
      return 'השמירה ל-GitHub נכשלה. נסו שוב בעוד רגע.'
  }
}
