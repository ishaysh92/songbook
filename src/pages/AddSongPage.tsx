import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SongForm } from '../components/SongForm'
import { useSongs } from '../context/SongsContext'
import { describeGithubError } from '../lib/github'
import type { SongDraft } from '../types'

export function AddSongPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { songs, saveDraft, githubConnected, saving } = useSongs()
  const [error, setError] = useState('')
  const existing = id ? songs.find((song) => song.id === id) : undefined

  async function handleSubmit(draft: SongDraft, githubToken?: string) {
    setError('')
    try {
      const song = await saveDraft(draft, existing?.id, githubToken)
      navigate(`/song/${song.id}`)
    } catch (err) {
      setError(describeGithubError(err))
    }
  }

  return (
    <section className="page">
      <p className="eyebrow">{existing ? 'עריכת שיר' : 'שיר חדש'}</p>
      <h1>{existing ? existing.title : 'הוספה לספר'}</h1>
      <p className="lede">
        לחצו על הוספת השיר, והוא יישמר ישר ל-GitHub ויופיע בכל מכשיר. אין צורך בסנכרון נפרד.
      </p>
      {!githubConnected && (
        <p className="notice">
          בפעם הראשונה במכשיר הזה הדביקו אסימון GitHub מתחת (ההוראות ב
          <Link to="/settings">הגדרות</Link>). אחרי זה מספיק לשמור את השיר.
        </p>
      )}
      {error && <p className="notice">{error}</p>}
      <SongForm
        song={existing}
        submitLabel={saving ? 'שומר ל-GitHub…' : existing ? 'שמירת שינויים' : 'הוספת השיר'}
        busy={saving}
        askGithubToken={!githubConnected}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
