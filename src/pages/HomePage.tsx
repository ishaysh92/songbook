import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'
import { SongCard } from '../components/SongCard'
import { useSongs } from '../context/SongsContext'
import { searchSongs } from '../lib/search'

export function HomePage() {
  const { songs, loading } = useSongs()
  const [query, setQuery] = useState('')
  const hits = useMemo(() => searchSongs(songs, query), [query, songs])
  const searching = query.trim().length > 0

  return (
    <section className="page">
      <div className="hero">
        <p className="eyebrow">ספר שירים וירטואלי</p>
        <h1>כל השירים במקום אחד</h1>
        <p className="lede">
          חפשו לפי שם, אומן, כותב, מלחין, או שורה מתוך המילים. לחצו השמע בנגן ספוטיפיי שבתוך הדף —
          בלי להתחבר ובלי אסימונים.
        </p>
      </div>
      <SearchBar
        value={query}
        onChange={setQuery}
        resultCount={hits.length}
        searching={searching}
      />
      {loading ? (
        <p className="muted">טוען את הספר…</p>
      ) : hits.length === 0 ? (
        <div className="empty">
          <h2>{searching ? 'לא נמצאו שירים' : 'הספר עדיין ריק'}</h2>
          <p>
            {searching
              ? 'נסו מילה אחרת, שם אומן, או שורה מתוך השיר.'
              : 'הוסיפו את השיר הראשון ויתחיל האוסף.'}
          </p>
          <Link to="/add" className="play-button">
            הוספת שיר
          </Link>
        </div>
      ) : (
        <div className="song-list">
          {hits.map((hit) => (
            <SongCard key={hit.song.id} hit={hit} />
          ))}
        </div>
      )}
    </section>
  )
}
