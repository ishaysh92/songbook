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
  commitSongsToGithub,
  describeGithubError,
  fetchSongsFromGithub,
  getGithubToken,
  setGithubToken,
  verifyGithubToken,
} from '../lib/github'
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
  saving: boolean
  githubConnected: boolean
  syncMessage: string
  saveDraft: (draft: SongDraft, id?: string, githubToken?: string) => Promise<Song>
  removeSong: (id: string) => Promise<void>
  exportSongs: () => void
  importSongs: (file: File) => Promise<number>
  saveGithubToken: (token: string) => Promise<void>
  disconnectGithub: () => void
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

function persistLocalOnly(songs: Song[], deleted: string[]) {
  saveLocalSongs(songs)
  saveDeletedIds(deleted)
}

export function SongsProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Song[]>([])
  const [localSongs, setLocalSongs] = useState<Song[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [githubConnected, setGithubConnected] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  const songs = useMemo(
    () => mergeSongs(catalog, localSongs, deletedIds),
    [catalog, localSongs, deletedIds],
  )

  const reloadSongs = useCallback(async () => {
    const remote = await fetchSongsFromGithub()
    const fallback = remote ?? (await loadCatalogSongs())
    setCatalog(fallback)
    setLocalSongs(loadLocalSongs())
    setDeletedIds(loadDeletedIds())
    setGithubConnected(Boolean(getGithubToken()))
  }, [])

  useEffect(() => {
    let cancelled = false
    reloadSongs()
      .catch(() => {
        if (!cancelled) setSyncMessage('לא הצלחנו לטעון את השירים מ-GitHub.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadSongs])

  const publish = useCallback(
    async (nextSongs: Song[], message: string) => {
      setCatalog(nextSongs)
      setLocalSongs([])
      setDeletedIds([])
      persistLocalOnly([], [])
      if (!getGithubToken()) {
        persistLocalOnly(nextSongs, [])
        setLocalSongs(nextSongs)
        const error = new Error('NO_TOKEN')
        setSyncMessage(describeGithubError(error))
        throw error
      }
      setSaving(true)
      try {
        await commitSongsToGithub(nextSongs, message)
        setGithubConnected(true)
        setSyncMessage('נשמר ב-GitHub. כל המכשירים יראו את השינוי.')
      } catch (error) {
        persistLocalOnly(nextSongs, [])
        setLocalSongs(nextSongs)
        setSyncMessage(describeGithubError(error))
        throw error
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  const saveDraft = useCallback(
    async (draft: SongDraft, id?: string, githubToken?: string) => {
      if (githubToken?.trim()) {
        await verifyGithubToken(githubToken)
        setGithubToken(githubToken)
        setGithubConnected(true)
      }
      const existing = id ? songs.find((song) => song.id === id) : undefined
      const song = draftToSong(draft, existing)
      const next = mergeSongs(
        catalog,
        [...localSongs.filter((item) => item.id !== song.id), song],
        deletedIds.filter((deletedId) => deletedId !== song.id),
      )
      await publish(next, existing ? `Update song: ${song.title}` : `Add song: ${song.title}`)
      return song
    },
    [catalog, deletedIds, localSongs, publish, songs],
  )

  const removeSong = useCallback(
    async (id: string) => {
      const target = songs.find((song) => song.id === id)
      const next = songs.filter((song) => song.id !== id)
      await publish(next, target ? `Remove song: ${target.title}` : 'Remove song')
    },
    [publish, songs],
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
      const next = mergeSongs(songs, incoming, [])
      await publish(next, `Import ${incoming.length} songs`)
      return incoming.length
    },
    [publish, songs],
  )

  const saveGithubToken = useCallback(async (token: string) => {
    await verifyGithubToken(token)
    setGithubToken(token)
    setGithubConnected(true)
    setSyncMessage('האסימון נשמר במכשיר. שמירת שיר תעלה אותו ישר ל-GitHub.')
  }, [])

  const disconnectGithub = useCallback(() => {
    setGithubToken('')
    setGithubConnected(false)
    setSyncMessage('האסימון הוסר ממכשיר זה. הצפייה בספר הציבורי נשארת.')
  }, [])

  const value = useMemo(
    () => ({
      songs,
      loading,
      saving,
      githubConnected,
      syncMessage,
      saveDraft,
      removeSong,
      exportSongs,
      importSongs,
      saveGithubToken,
      disconnectGithub,
    }),
    [
      disconnectGithub,
      exportSongs,
      githubConnected,
      importSongs,
      loading,
      removeSong,
      saveDraft,
      saveGithubToken,
      saving,
      songs,
      syncMessage,
    ],
  )

  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>
}

export function useSongs() {
  const value = useContext(SongsContext)
  if (!value) throw new Error('SongsProvider is missing')
  return value
}
