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
import {
  createSongFromDraft,
  loadCatalogSongs,
  loadDeletedIds,
  loadLocalSongs,
  mergeSongs,
  saveDeletedIds,
  saveLocalSongs,
  songsToExport,
} from '../lib/storage'
import { splitPeople } from '../lib/text'

type SongsContextValue = {
  songs: Song[]
  loading: boolean
  saveDraft: (draft: SongDraft, id?: string) => Song
  removeSong: (id: string) => void
  exportSongs: () => void
  importSongs: (file: File) => Promise<number>
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
  return song
}

export function SongsProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Song[]>([])
  const [localSongs, setLocalSongs] = useState<Song[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([loadCatalogSongs()])
      .then(([catalogSongs]) => {
        if (cancelled) return
        setCatalog(catalogSongs)
        setLocalSongs(loadLocalSongs())
        setDeletedIds(loadDeletedIds())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const songs = useMemo(
    () => mergeSongs(catalog, localSongs, deletedIds),
    [catalog, localSongs, deletedIds],
  )

  const persistLocal = useCallback((next: Song[]) => {
    setLocalSongs(next)
    saveLocalSongs(next)
  }, [])

  const saveDraft = useCallback(
    (draft: SongDraft, id?: string) => {
      const existing = id ? songs.find((song) => song.id === id) : undefined
      const song = draftToSong(draft, existing)
      persistLocal([...localSongs.filter((item) => item.id !== song.id), song])
      if (deletedIds.includes(song.id)) {
        const nextDeleted = deletedIds.filter((deletedId) => deletedId !== song.id)
        setDeletedIds(nextDeleted)
        saveDeletedIds(nextDeleted)
      }
      return song
    },
    [deletedIds, localSongs, persistLocal, songs],
  )

  const removeSong = useCallback(
    (id: string) => {
      persistLocal(localSongs.filter((song) => song.id !== id))
      if (!deletedIds.includes(id)) {
        const nextDeleted = [...deletedIds, id]
        setDeletedIds(nextDeleted)
        saveDeletedIds(nextDeleted)
      }
    },
    [deletedIds, localSongs, persistLocal],
  )

  const exportSongs = useCallback(() => {
    const blob = new Blob([JSON.stringify(songsToExport(songs), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'songs.json'
    link.click()
    URL.revokeObjectURL(url)
  }, [songs])

  const importSongs = useCallback(
    async (file: File) => {
      const parsed = JSON.parse(await file.text()) as Song[]
      const incoming = parsed.map((song) =>
        createSongFromDraft({
          id: song.id,
          title: song.title,
          artist: song.artist,
          writers: Array.isArray(song.writers) ? song.writers : [],
          composers: Array.isArray(song.composers) ? song.composers : [],
          lyrics: song.lyrics ?? '',
          spotifyUrl: song.spotifyUrl ?? '',
        }),
      )
      persistLocal(
        mergeSongs(
          [],
          [...localSongs.filter((song) => !incoming.some((item) => item.id === song.id)), ...incoming],
          [],
        ),
      )
      return incoming.length
    },
    [localSongs, persistLocal],
  )

  const value = useMemo(
    () => ({
      songs,
      loading,
      saveDraft,
      removeSong,
      exportSongs,
      importSongs,
    }),
    [exportSongs, importSongs, loading, removeSong, saveDraft, songs],
  )

  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>
}

export function useSongs() {
  const value = useContext(SongsContext)
  if (!value) throw new Error('SongsProvider is missing')
  return value
}
