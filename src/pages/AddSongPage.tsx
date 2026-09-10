import { useNavigate, useParams } from 'react-router-dom'
import { SongForm } from '../components/SongForm'
import { useSongs } from '../context/SongsContext'
import type { SongDraft } from '../types'

export function AddSongPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { songs, saveDraft } = useSongs()
  const existing = id ? songs.find((song) => song.id === id) : undefined

  function handleSubmit(draft: SongDraft) {
    const song = saveDraft(draft, existing?.id)
    navigate(`/song/${song.id}`)
  }

  return (
    <section className="page">
      <p className="eyebrow">{existing ? 'עריכת שיר' : 'שיר חדש'}</p>
      <h1>{existing ? existing.title : 'הוספה לספר'}</h1>
      <p className="lede">
        מלאו שם, אומן, יוצרים ומילים. אם יש קישור ספוטיפיי, כפתור ההשמעה יופיע מיד.
      </p>
      <SongForm
        song={existing}
        submitLabel={existing ? 'שמירת שינויים' : 'הוספת השיר'}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
