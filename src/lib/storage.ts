import type { Song } from '../types'
import { createId, nowIso, splitPeople } from './text'

const CUSTOM_KEY = 'songbook.custom.v1'
const DELETED_KEY = 'songbook.deleted.v1'

type StoredSong = Omit<Song, 'source'>

function asSong(raw: StoredSong, source: Song['source']): Song {
  return {
    id: raw.id,
    title: raw.title ?? '',
    artist: raw.artist ?? '',
    writers: Array.isArray(raw.writers) ? raw.writers : splitPeople(String(raw.writers ?? '')),
    composers: Array.isArray(raw.composers)
      ? raw.composers
      : splitPeople(String(raw.composers ?? '')),
    lyrics: raw.lyrics ?? '',
    spotifyUrl: raw.spotifyUrl ?? '',
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? nowIso(),
    source,
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function parseStoredSongs(data: unknown, source: Song['source']): Song[] {
  if (!Array.isArray(data)) return []
  return data.map((raw) => asSong(raw as StoredSong, source))
}

export async function loadCatalogSongs(): Promise<Song[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}songs.json`, {
    cache: 'no-cache',
  })
  if (!response.ok) return []
  return parseStoredSongs(await response.json(), 'catalog')
}

export function loadLocalSongs(): Song[] {
  return readJson<StoredSong[]>(CUSTOM_KEY, []).map((song) => asSong(song, 'local'))
}

export function loadDeletedIds(): string[] {
  return readJson<string[]>(DELETED_KEY, [])
}

function withoutSource(song: Song): StoredSong {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    writers: song.writers,
    composers: song.composers,
    lyrics: song.lyrics,
    spotifyUrl: song.spotifyUrl,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
  }
}

export function saveLocalSongs(songs: Song[]): void {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(songs.map(withoutSource)))
}

export function saveDeletedIds(ids: string[]): void {
  localStorage.setItem(DELETED_KEY, JSON.stringify(ids))
}

export function mergeSongs(catalog: Song[], local: Song[], deletedIds: string[]): Song[] {
  const deleted = new Set(deletedIds)
  const byId = new Map<string, Song>()

  for (const song of catalog) {
    if (!deleted.has(song.id)) byId.set(song.id, song)
  }
  for (const song of local) {
    if (!deleted.has(song.id)) byId.set(song.id, song)
  }

  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title, 'he'))
}

export function createSongFromDraft(draft: {
  title: string
  artist: string
  writers: string[]
  composers: string[]
  lyrics: string
  spotifyUrl: string
  id?: string
}): Song {
  const timestamp = nowIso()
  return {
    id: draft.id ?? createId(),
    title: draft.title.trim(),
    artist: draft.artist.trim(),
    writers: draft.writers,
    composers: draft.composers,
    lyrics: draft.lyrics.replace(/\r\n/g, '\n').trim(),
    spotifyUrl: draft.spotifyUrl.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
    source: 'local',
  }
}

export function songsToExport(songs: Song[]): StoredSong[] {
  return songs.map(withoutSource)
}
