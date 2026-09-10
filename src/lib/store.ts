import type { Song } from '../types'
import { parseStoredSongs, songsToExport } from './storage'

export type AppConfig = {
  apiBase?: string
}

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

function apiUrl(config: AppConfig): string {
  return (config.apiBase || '/api/songs').replace(/\/$/, '')
}

export async function fetchSharedSongs(): Promise<Song[]> {
  const config = await loadAppConfig()
  const endpoints = [
    `${apiUrl(config)}`,
    'https://raw.githubusercontent.com/ishaysh92/songbook/main/public/songs.json',
    `${import.meta.env.BASE_URL}songs.json`,
  ]

  for (const url of endpoints) {
    try {
      const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (!response.ok) continue
      const data = await response.json()
      const songs = parseStoredSongs(Array.isArray(data) ? data : data.songs, 'catalog')
      if (songs.length || Array.isArray(data) || Array.isArray(data?.songs)) return songs
    } catch {
      continue
    }
  }
  return []
}

export async function saveSharedSongs(songs: Song[]): Promise<void> {
  const config = await loadAppConfig()
  const payload = songsToExport(songs)
  const response = await fetch(apiUrl(config), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error('SAVE_FAILED')
  }
}
