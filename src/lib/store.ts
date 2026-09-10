import type { Song } from '../types'
import { parseStoredSongs, saveLocalSongs, songsToExport } from './storage'

export type AppConfig = {
  rentryId?: string
  rentryEdit?: string
}

const LOCAL_KEY_SONGS = 'songbook.shared.v2'
let cachedConfig: AppConfig | null = null

export async function loadAppConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}app-config.json`, {
      cache: 'no-store',
    })
    if (response.ok) cachedConfig = (await response.json()) as AppConfig
  } catch {
    cachedConfig = {}
  }
  return cachedConfig ?? {}
}

function cacheSongs(songs: Song[]): void {
  saveLocalSongs(songs)
  localStorage.setItem(LOCAL_KEY_SONGS, JSON.stringify(songsToExport(songs)))
}

function readCachedSongs(): Song[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_SONGS)
    if (raw === null) return null
    return parseStoredSongs(JSON.parse(raw), 'catalog')
  } catch {
    return null
  }
}

function extractSongsFromHtml(html: string): Song[] | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const pre =
    doc.querySelector('td.code pre') ||
    doc.querySelector('.highlight pre') ||
    doc.querySelector('article pre')
  const raw = pre?.textContent?.trim()
  if (raw) {
    try {
      return parseStoredSongs(JSON.parse(raw), 'catalog')
    } catch {
      // fall through
    }
  }
  const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()
  if (desc) {
    try {
      return parseStoredSongs(JSON.parse(desc), 'catalog')
    } catch {
      return null
    }
  }
  return null
}

function toRentryText(songs: Song[]): string {
  return `~~~~json\n${JSON.stringify(songsToExport(songs))}\n~~~~`
}

async function fetchRemoteSongs(config: AppConfig): Promise<Song[] | null> {
  if (!config.rentryId) return null
  const response = await fetch(`https://rentry.co/${config.rentryId}?t=${Date.now()}`, {
    cache: 'no-store',
  })
  if (!response.ok) return null
  return extractSongsFromHtml(await response.text())
}

async function saveRemoteSongs(config: AppConfig, songs: Song[]): Promise<void> {
  if (!config.rentryId || !config.rentryEdit) return
  const response = await fetch(`https://rentry.co/api/edit/${config.rentryId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      edit_code: config.rentryEdit,
      text: toRentryText(songs),
    }),
  })
  if (!response.ok) throw new Error('SAVE_FAILED')
  const payload = (await response.json()) as { status?: string }
  if (payload.status && payload.status !== '200') throw new Error('SAVE_FAILED')
}

export async function fetchSharedSongs(): Promise<Song[]> {
  const config = await loadAppConfig()
  try {
    const remote = await fetchRemoteSongs(config)
    if (remote) {
      cacheSongs(remote)
      return remote
    }
  } catch {
    // fall through
  }

  const cached = readCachedSongs()
  if (cached) return cached

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}songs.json?t=${Date.now()}`, {
      cache: 'no-store',
    })
    if (response.ok) return parseStoredSongs(await response.json(), 'catalog')
  } catch {
    // ignore
  }
  return []
}

export async function saveSharedSongs(songs: Song[]): Promise<void> {
  cacheSongs(songs)
  const config = await loadAppConfig()
  try {
    await saveRemoteSongs(config, songs)
  } catch {
    // Keep the local copy so add/delete still work if the shared store is briefly down.
  }
}
