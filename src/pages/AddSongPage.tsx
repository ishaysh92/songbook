import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SongForm } from '../components/SongForm'
import { useSongs } from '../context/SongsContext'
import type { SongDraft } from '../types'

export function AddSongPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { songs, saveDraft, githubConnected, saving } = useSongs()
  const [error, setError] = useState('')
  const existing = id ? songs.find((song) => song.id === id) : undefined

  async function handleSubmit(draft: SongDraft) {
    setError('')
    try {
      const song = await saveDraft(draft, existing?.id)
      navigate(`/song/${song.id}`)
    } catch {
      setError('השיר נשמר במכשיר, אבל לא עלה ל-GitHub. בדקו את האסימון בהגדרות.')
    }
  }

  return (
    <section className="page">
      <p className="eyebrow">{existing ? 'עריכת שיר' : 'שיר חדש'}</p>
      <h1>{existing ? existing.title : 'הוספה לספר'}</h1>
      <p className="lede">
        מלאו שם, אומן, יוצרים ומילים. אם יש קישור ספוטיפיי, כפתור ההשמעה יופיע מיד.
      </p>
      {!githubConnected && (
        <p className="notice">
          כדי שהשיר יופיע בכל מכשיר, חברו GitHub ב<Link to="/settings">הגדרות</Link> לפני השמירה.
        </p>
      )}
      {error && <p className="notice">{error}</p>}
      <SongForm
        song={existing}
        submitLabel={saving ? 'שומר ל-GitHub…' : existing ? 'שמירת שינויים' : 'הוספת השיר'}
        busy={saving}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
