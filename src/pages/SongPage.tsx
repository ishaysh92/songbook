import { Link, useNavigate, useParams } from 'react-router-dom'
import { SpotifyEmbed } from '../components/SpotifyEmbed'
import { useSongs } from '../context/SongsContext'
import { parseSpotifyTrack } from '../lib/spotifyTrack'

export function SongPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { songs, removeSong, saving } = useSongs()
  const song = songs.find((item) => item.id === id)

  if (!song) {
    return (
      <section className="page">
        <div className="empty">
          <h2>השיר לא נמצא</h2>
          <Link to="/" className="ghost-button">
            חזרה לספר
          </Link>
        </div>
      </section>
    )
  }

  const canPlay = Boolean(parseSpotifyTrack(song.spotifyUrl))

  return (
    <section className="page song-page">
      <Link to="/" className="back-link">
        חזרה לספר
      </Link>
      <header className="song-hero">
        <p className="eyebrow">{song.artist}</p>
        <h1>{song.title}</h1>
        <ul className="credits">
          {song.writers.length > 0 && <li>מילים: {song.writers.join(', ')}</li>}
          {song.composers.length > 0 && <li>לחן: {song.composers.join(', ')}</li>}
        </ul>
        {canPlay && <SpotifyEmbed url={song.spotifyUrl} />}
        <div className="song-hero-actions">
          <Link to={`/edit/${song.id}`} className="ghost-button">
            עריכה
          </Link>
          <button
            type="button"
            className="text-button danger"
            disabled={saving}
            onClick={() => {
              if (!window.confirm(`למחוק את „${song.title}”?`)) return
              void removeSong(song.id)
                .then(() => navigate('/'))
                .catch(() => undefined)
            }}
          >
            מחיקה
          </button>
        </div>
      </header>
      <article className="lyrics-sheet">
        {song.lyrics ? (
          song.lyrics.split('\n').map((line, index) =>
            line.trim() ? (
              <p key={`${index}-${line}`}>{line}</p>
            ) : (
              <div key={`break-${index}`} className="verse-break" />
            ),
          )
        ) : (
          <p className="muted">עדיין לא הוזנו מילים לשיר הזה.</p>
        )}
      </article>
    </section>
  )
}
