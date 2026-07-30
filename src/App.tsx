import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useRole } from './contexts/RoleContext'
import PinGate from './pages/PinGate'
import Home from './pages/Home'
import SongList from './pages/SongList'
import SongDetail from './pages/SongDetail'
import Presentation from './pages/Presentation'

// Rutas de admin en su propio chunk — los músicos que solo ven el repertorio
// nunca las necesitan, así que no deben pesar en la carga inicial.
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const SongEditor = lazy(() => import('./pages/admin/SongEditor'))
const ScanSong = lazy(() => import('./pages/admin/ScanSong'))
const SetlistEditor = lazy(() => import('./pages/admin/SetlistEditor'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))

function RequireRole({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { role } = useRole()
  const location = useLocation()

  if (!role || (admin && role !== 'admin')) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/entrar?next=${next}`} replace />
  }
  return <>{children}</>
}

function AdminFallback() {
  return <div className="flex-1 flex items-center justify-center bg-bg text-t3 text-sm">Cargando…</div>
}

function LazyAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireRole admin>
      <Suspense fallback={<AdminFallback />}>{children}</Suspense>
    </RequireRole>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entrar" element={<PinGate />} />
        <Route path="/" element={<RequireRole><Home /></RequireRole>} />
        <Route path="/canciones" element={<RequireRole><SongList /></RequireRole>} />
        <Route path="/canciones/:id" element={<RequireRole><SongDetail /></RequireRole>} />
        <Route path="/setlists/:id/presentar" element={<RequireRole><Presentation /></RequireRole>} />
        <Route path="/admin" element={<LazyAdmin><AdminDashboard /></LazyAdmin>} />
        <Route path="/admin/canciones/escanear" element={<LazyAdmin><ScanSong /></LazyAdmin>} />
        <Route path="/admin/canciones/nueva" element={<LazyAdmin><SongEditor /></LazyAdmin>} />
        <Route path="/admin/canciones/:id/editar" element={<LazyAdmin><SongEditor /></LazyAdmin>} />
        <Route path="/admin/setlists/nuevo" element={<LazyAdmin><SetlistEditor /></LazyAdmin>} />
        <Route path="/admin/setlists/:id/editar" element={<LazyAdmin><SetlistEditor /></LazyAdmin>} />
        <Route path="/admin/configuracion" element={<LazyAdmin><AdminSettings /></LazyAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
