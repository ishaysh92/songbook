import type { PlaybackState, SpotifyDevice } from '../types'

const CLIENT_ID_KEY = 'songbook.spotify.clientId'
const VERIFIER_KEY = 'songbook.spotify.verifier'
const TOKEN_KEY = 'songbook.spotify.token'
const DEVICE_KEY = 'songbook.spotify.deviceId'

const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ')

type TokenBundle = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

export function getStoredClientId(): string {
  return (
    localStorage.getItem(CLIENT_ID_KEY)?.trim() ||
    import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ||
    ''
  )
}

export function setStoredClientId(clientId: string): void {
  localStorage.setItem(CLIENT_ID_KEY, clientId.trim())
}

export function getPreferredDeviceId(): string {
  return localStorage.getItem(DEVICE_KEY) ?? ''
}

export function setPreferredDeviceId(id: string): void {
  localStorage.setItem(DEVICE_KEY, id)
}

export function getRedirectUri(): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  let path = url.pathname
  if (path.endsWith('index.html')) path = path.slice(0, -'index.html'.length)
  if (!path.endsWith('/')) path += '/'
  return `${url.origin}${path}`
}

function readToken(): TokenBundle | null {
  return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null') as TokenBundle | null
}

function writeToken(token: TokenBundle | null): void {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY)
    return
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((b) => chars[b % chars.length]).join('')
}

async function sha256Base64Url(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function beginSpotifyLogin(clientId: string): Promise<void> {
  const verifier = randomString(64)
  const challenge = await sha256Base64Url(verifier)
  localStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem('songbook.spotify.return', window.location.hash || '#/')

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state: randomString(16),
  })

  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`)
}

async function requestToken(body: URLSearchParams): Promise<TokenBundle> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) {
    throw new Error('TOKEN_FAILED')
  }
  const data = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }
  const current = readToken()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? current?.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000 - 30_000,
  }
}

export async function exchangeSpotifyCode(code: string, clientId: string): Promise<void> {
  const verifier = localStorage.getItem(VERIFIER_KEY)
  if (!verifier) throw new Error('MISSING_VERIFIER')
  const token = await requestToken(
    new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      code_verifier: verifier,
    }),
  )
  localStorage.removeItem(VERIFIER_KEY)
  writeToken(token)
}

export async function getAccessToken(clientId: string): Promise<string | null> {
  const token = readToken()
  if (!token) return null
  if (Date.now() < token.expiresAt) return token.accessToken
  if (!token.refreshToken) {
    writeToken(null)
    return null
  }
  try {
    const refreshed = await requestToken(
      new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    )
    writeToken(refreshed)
    return refreshed.accessToken
  } catch {
    writeToken(null)
    return null
  }
}

export function logoutSpotify(): void {
  writeToken(null)
}

export function hasSpotifySession(): boolean {
  return Boolean(readToken())
}

async function spotifyFetch(
  clientId: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const accessToken = await getAccessToken(clientId)
  if (!accessToken) throw new Error('NOT_CONNECTED')
  return fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
}

export async function listDevices(clientId: string): Promise<SpotifyDevice[]> {
  const response = await spotifyFetch(clientId, '/me/player/devices')
  if (!response.ok) throw new Error('DEVICES_FAILED')
  const data = (await response.json()) as { devices: SpotifyDevice[] }
  return data.devices.filter((device) => Boolean(device.id))
}

export async function playUri(
  clientId: string,
  uri: string,
  deviceId?: string,
): Promise<void> {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''
  const response = await spotifyFetch(clientId, `/me/player/play${query}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [uri] }),
  })

  if (response.status === 204 || response.status === 202) return
  if (response.status === 404) throw new Error('NO_DEVICE')
  if (response.status === 403) throw new Error('PREMIUM_REQUIRED')
  if (response.status === 401) throw new Error('NOT_CONNECTED')
  throw new Error('PLAY_FAILED')
}

export async function pausePlayback(clientId: string): Promise<void> {
  const response = await spotifyFetch(clientId, '/me/player/pause', { method: 'PUT' })
  if (response.status === 204 || response.status === 404) return
  if (!response.ok && response.status !== 403) throw new Error('PAUSE_FAILED')
}

export async function resumePlayback(clientId: string): Promise<void> {
  const response = await spotifyFetch(clientId, '/me/player/play', { method: 'PUT' })
  if (response.status === 204 || response.status === 202) return
  if (response.status === 404) throw new Error('NO_DEVICE')
  if (response.status === 403) throw new Error('PREMIUM_REQUIRED')
  throw new Error('PLAY_FAILED')
}

export async function getPlaybackState(clientId: string): Promise<PlaybackState | null> {
  const response = await spotifyFetch(clientId, '/me/player')
  if (response.status === 204) return null
  if (!response.ok) return null
  const data = (await response.json()) as {
    is_playing?: boolean
    device?: { name?: string }
    item?: { name?: string; artists?: { name: string }[] }
  }
  return {
    isPlaying: Boolean(data.is_playing),
    trackName: data.item?.name,
    artistName: data.item?.artists?.map((artist) => artist.name).join(', '),
    deviceName: data.device?.name,
  }
}

export function describeSpotifyError(error: unknown): string {
  const code = error instanceof Error ? error.message : ''
  switch (code) {
    case 'NO_DEVICE':
      return 'אין מכשיר ספוטיפיי פעיל. פתחו את ספוטיפיי בטלפון או במחשב, נגנו שיר כלשהו לרגע, ואז לחצו שוב.'
    case 'PREMIUM_REQUIRED':
      return 'השמעת שיר מלא דרך האתר דורשת Spotify Premium.'
    case 'NOT_CONNECTED':
      return 'יש להתחבר מחדש לספוטיפיי.'
    case 'TOKEN_FAILED':
      return 'ההתחברות לספוטיפיי נכשלה. בדקו את מזהה האפליקציה ואת כתובת ה-Redirect.'
    default:
      return 'לא הצלחנו להפעיל את השיר. ודאו שספוטיפיי פתוח ונסו שוב.'
  }
}
