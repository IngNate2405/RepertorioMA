import { lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useRole } from './contexts/RoleContext'
import PinGate from './pages/PinGate'
import Home from './pages/Home'
import SongList from './pages/SongList'
import SongDetail from './pages/SongDetail'
import Presentation from './pages/Presentation'
import Settings from './pages/Settings'

// El service worker se auto-actualiza (skipWaiting + clientsClaim en sw.ts), así
// que una pestaña que quedó abierta desde antes de un deploy sigue teniendo en
// memoria el bundle viejo, con referencias a nombres de chunk que ya no existen
// en el servidor tras el deploy nuevo — el import() dinámico de esas rutas
// admin falla con "Failed to fetch dynamically imported module". La solución
// estándar es recargar la página una vez ante ese fallo específico: index.html
// se vuelve a pedir fresco y ya apunta a los chunks correctos.
function lazyWithReload<T extends { default: ComponentType<unknown> }>(factory: () => Promise<T>) {
  return lazy(() =>
    factory().catch(err => {
      const key = 'repertorio_chunk_reload'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
        return new Promise<T>(() => {})
      }
      throw err
    })
  )
}

// Rutas de admin en su propio chunk — los músicos que solo ven el repertorio
// nunca las necesitan, así que no deben pesar en la carga inicial.
const AdminDashboard = lazyWithReload(() => import('./pages/admin/AdminDashboard'))
const SongEditor = lazyWithReload(() => import('./pages/admin/SongEditor'))
const ScanSong = lazyWithReload(() => import('./pages/admin/ScanSong'))
const SetlistEditor = lazyWithReload(() => import('./pages/admin/SetlistEditor'))
const AdminSettings = lazyWithReload(() => import('./pages/admin/AdminSettings'))

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
  useEffect(() => {
    // Si llegamos hasta acá sin recargar, la sesión está sana — libera el
    // "permiso de recarga" para que un deploy futuro en esta misma pestaña
    // también pueda auto-recuperarse (y no solo el primero).
    const t = setTimeout(() => sessionStorage.removeItem('repertorio_chunk_reload'), 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entrar" element={<PinGate />} />
        <Route path="/" element={<RequireRole><Home /></RequireRole>} />
        <Route path="/canciones" element={<RequireRole><SongList /></RequireRole>} />
        <Route path="/canciones/:id" element={<RequireRole><SongDetail /></RequireRole>} />
        <Route path="/setlists/:id/presentar" element={<RequireRole><Presentation /></RequireRole>} />
        <Route path="/configuracion" element={<RequireRole><Settings /></RequireRole>} />
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
