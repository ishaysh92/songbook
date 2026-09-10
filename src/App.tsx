import { Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { PlayerBar } from './components/PlayerBar'
import { AddSongPage } from './pages/AddSongPage'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'
import { SongPage } from './pages/SongPage'

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/add" element={<AddSongPage />} />
          <Route path="/edit/:id" element={<AddSongPage />} />
          <Route path="/song/:id" element={<SongPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <PlayerBar />
    </div>
  )
}
