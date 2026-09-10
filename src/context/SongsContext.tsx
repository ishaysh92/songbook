import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Song, SongDraft } from '../types'
import { createSongFromDraft, mergeSongs } from '../lib/storage'
import { fetchSharedSongs, saveSharedSongs } from '../lib/store'
import { splitPeople } from '../lib/text'

type SongsContextValue = {
  songs: Song[]
  loading: boolean
  saving: boolean
  saveDraft: (draft: SongDraft, id?: string) => Promise<Song>
  removeSong: (id: string) => Promise<void>
}

const SongsContext = createContext<SongsContextValue | null>(null)

function draftToSong(draft: SongDraft, existing?: Song): Song {
  const song = createSongFromDraft({
    id: existing?.id,
    title: draft.title,
    artist: draft.artist,
    writers: splitPeople(draft.writers),
    composers: splitPeople(draft.composers),
    lyrics: draft.lyrics,
    spotifyUrl: draft.spotifyUrl,
  })
  if (existing) {
    song.createdAt = existing.createdAt
    song.updatedAt = new Date().toISOString()
  }
  song.source = 'catalog'
  return song
}

export function SongsProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchSharedSongs()
      .then((next) => {
        if (!cancelled) setSongs(next)
      })
      .catch(() => {
        if (!cancelled) setSongs([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const publish = useCallback(async (next: Song[]) => {
    setSaving(true)
    setSongs(next)
    try {
      await saveSharedSongs(next)
    } finally {
      setSaving(false)
    }
  }, [])

  const saveDraft = useCallback(
    async (draft: SongDraft, id?: string) => {
      const latest = await fetchSharedSongs().catch(() => songs)
      const existing = id
        ? latest.find((song) => song.id === id) ?? songs.find((song) => song.id === id)
        : undefined
      const song = draftToSong(draft, existing)
      await publish(mergeSongs(latest, [song], []))
      return song
    },
    [publish, songs],
  )

  const removeSong = useCallback(
    async (id: string) => {
      const latest = await fetchSharedSongs().catch(() => songs)
      await publish(latest.filter((song) => song.id !== id))
    },
    [publish, songs],
  )

  const value = useMemo(
    () => ({ songs, loading, saving, saveDraft, removeSong }),
    [loading, removeSong, saveDraft, saving, songs],
  )

  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>
}

export function useSongs() {
  const value = useContext(SongsContext)
  if (!value) throw new Error('SongsProvider is missing')
  return value
}
