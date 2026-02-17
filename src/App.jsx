import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/useAuthStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import LiveTvPage from './pages/LiveTvPage'
import VodPage from './pages/VodPage'
import SeriesPage from './pages/SeriesPage'
import SeriesDetailPage from './pages/SeriesDetailPage'
import PlayerPage from './pages/PlayerPage'
import FavoritesPage from './pages/FavoritesPage'
import EpgPage from './pages/EpgPage'

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/live" element={<LiveTvPage />} />
        <Route path="/movies" element={<VodPage />} />
        <Route path="/series" element={<SeriesPage />} />
        <Route path="/series/:id" element={<SeriesDetailPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/epg" element={<EpgPage />} />
      </Route>
      <Route
        path="/player/:type/:id"
        element={
          <ProtectedRoute>
            <PlayerPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
