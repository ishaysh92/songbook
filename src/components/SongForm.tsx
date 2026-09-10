import { useState, type FormEvent } from 'react'
import type { Song, SongDraft } from '../types'

const emptyDraft: SongDraft = {
  title: '',
  artist: '',
  writers: '',
  composers: '',
  lyrics: '',
  spotifyUrl: '',
}

function songToDraft(song?: Song): SongDraft {
  if (!song) return emptyDraft
  return {
    title: song.title,
    artist: song.artist,
    writers: song.writers.join(', '),
    composers: song.composers.join(', '),
    lyrics: song.lyrics,
    spotifyUrl: song.spotifyUrl,
  }
}

type SongFormProps = {
  song?: Song
  submitLabel: string
  onSubmit: (draft: SongDraft) => void
}

export function SongForm({ song, submitLabel, onSubmit }: SongFormProps) {
  const [draft, setDraft] = useState<SongDraft>(songToDraft(song))

  function update<K extends keyof SongDraft>(key: K, value: SongDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.title.trim() || !draft.artist.trim()) return
    onSubmit(draft)
  }

  return (
    <form className="song-form" onSubmit={handleSubmit}>
      <label>
        שם השיר
        <input
          required
          value={draft.title}
          onChange={(event) => update('title', event.target.value)}
        />
      </label>
      <label>
        אומן
        <input
          required
          value={draft.artist}
          onChange={(event) => update('artist', event.target.value)}
        />
      </label>
      <label>
        כותבים
        <input
          value={draft.writers}
          onChange={(event) => update('writers', event.target.value)}
          placeholder="אפשר כמה שמות, מופרדים בפסיק"
        />
      </label>
      <label>
        מלחינים
        <input
          value={draft.composers}
          onChange={(event) => update('composers', event.target.value)}
          placeholder="אפשר כמה שמות, מופרדים בפסיק"
        />
      </label>
      <label className="full">
        מילים
        <textarea
          rows={12}
          value={draft.lyrics}
          onChange={(event) => update('lyrics', event.target.value)}
          placeholder="הדביקו כאן את מילות השיר"
        />
      </label>
      <label className="full">
        קישור ספוטיפיי
        <input
          value={draft.spotifyUrl}
          onChange={(event) => update('spotifyUrl', event.target.value)}
          placeholder="https://open.spotify.com/track/..."
        />
      </label>
      <button type="submit" className="play-button">
        {submitLabel}
      </button>
    </form>
  )
}
