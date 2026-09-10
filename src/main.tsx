import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { SongsProvider } from './context/SongsContext'
import { SpotifyProvider } from './context/SpotifyContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <SongsProvider>
        <SpotifyProvider>
          <App />
        </SpotifyProvider>
      </SongsProvider>
    </HashRouter>
  </StrictMode>,
)
