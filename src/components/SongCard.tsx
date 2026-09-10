import { Link } from 'react-router-dom'
import type { SearchHit } from '../types'
import { fieldLabel } from '../lib/search'
import { toSpotifyUri } from '../lib/spotifyTrack'
import { useSpotify } from '../context/SpotifyContext'

export function SongCard({ hit }: { hit: SearchHit }) {
  const { playTrack, busy } = useSpotify()
  const { song, fields, lyricSnippet } = hit
  const canPlay = Boolean(toSpotifyUri(song.spotifyUrl))

  return (
    <article className="song-card">
      <div className="song-card-body">
        <Link to={`/song/${song.id}`} className="song-title">
          {song.title}
        </Link>
        <p className="song-artist">{song.artist}</p>
        <p className="song-people">
          {song.writers.length > 0 && <span>מילים: {song.writers.join(', ')}</span>}
          {song.composers.length > 0 && <span>לחן: {song.composers.join(', ')}</span>}
        </p>
        {fields.length > 0 && (
          <p className="match-tags">
            נמצא ב{fields.map((field) => fieldLabel(field)).join(' · ')}
          </p>
        )}
        {lyricSnippet && <p className="lyric-snippet">„{lyricSnippet}”</p>}
      </div>
      <div className="song-card-actions">
        {canPlay && (
          <button
            type="button"
            className="play-button"
            disabled={busy}
            onClick={() => void playTrack(song.spotifyUrl)}
          >
            השמע
          </button>
        )}
        <Link to={`/song/${song.id}`} className="ghost-button">
          מילים
        </Link>
      </div>
    </article>
  )
}
