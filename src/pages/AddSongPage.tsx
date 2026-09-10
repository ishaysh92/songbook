import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SongForm } from '../components/SongForm'
import { useSongs } from '../context/SongsContext'
import type { SongDraft } from '../types'

export function AddSongPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { songs, saveDraft, saving } = useSongs()
  const [error, setError] = useState('')
  const existing = id ? songs.find((song) => song.id === id) : undefined

  async function handleSubmit(draft: SongDraft) {
    setError('')
    try {
      const song = await saveDraft(draft, existing?.id)
      navigate(`/song/${song.id}`)
    } catch {
      setError('השמירה נכשלה. נסו שוב בעוד רגע.')
    }
  }

  return (
    <section className="page">
      <p className="eyebrow">{existing ? 'עריכת שיר' : 'שיר חדש'}</p>
      <h1>{existing ? existing.title : 'הוספה לספר'}</h1>
      <p className="lede">מלאו את הפרטים ושמרו. השיר יופיע אצל כולם, בלי הרשמה ובלי אסימונים.</p>
      {error && <p className="notice">{error}</p>}
      <SongForm
        song={existing}
        submitLabel={saving ? 'שומר…' : existing ? 'שמירת שינויים' : 'הוספת השיר'}
        busy={saving}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
