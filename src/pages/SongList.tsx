import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Music, Pencil, Plus, Search, TriangleAlert } from 'lucide-react'
import Layout from '../components/layout/Layout'
import BottomSheet from '../components/ui/BottomSheet'
import SwipeToDelete from '../components/SwipeToDelete'
import { listenSongs } from '../firebase/songService'
import { deleteSong } from '../firebase/songMutations'
import { normalizeTitle } from '../lib/text'
import { useRole } from '../contexts/RoleContext'
import type { Song } from '../types'

export default function SongList() {
  const { role, pin } = useRole()
  const navigate = useNavigate()
  const [songs, setSongs] = useState<Song[] | null>(null)
  const [search, setSearch] = useState('')
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [songToDelete, setSongToDelete] = useState<Song | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => listenSongs(setSongs), [])

  const filtered = useMemo(() => {
    if (!songs) return []
    const q = normalizeTitle(search)
    if (!q) return songs
    return songs.filter(s => normalizeTitle(s.title).includes(q) || (s.artist && normalizeTitle(s.artist).includes(q)))
  }, [songs, search])

  async function confirmDelete() {
    if (!pin || !songToDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteSong(pin, songToDelete.id)
      setSongToDelete(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar la canción')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Layout
      title="Canciones"
      headerRight={
        role === 'admin' && (
          <button
            onClick={() => setShowAddSheet(true)}
            className="w-9 h-9 rounded-full bg-accent-500 flex items-center justify-center text-black"
          >
            <Plus size={18} />
          </button>
        )
      }
    >
      <div className="pt-4 pb-3 sticky top-0 bg-bg">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" />
          <input
            className="input-base pl-9"
            placeholder="Buscar canción o artista…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {role === 'admin' && filtered.length > 0 && (
          <p className="text-[11px] text-t3 mt-2 px-1">Desliza una canción hacia la izquierda para eliminarla.</p>
        )}
      </div>

      {songs === null && (
        <div className="pt-10 text-center text-t3 text-sm">Cargando…</div>
      )}

      {songs !== null && filtered.length === 0 && (
        <div className="pt-10 text-center text-t3 text-sm">
          {search ? 'No se encontraron canciones.' : 'Todavía no hay canciones registradas.'}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(song => {
          const row = (
            <Link to={`/canciones/${song.id}`} className="card flex items-center gap-3 px-3 py-3">
              <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex items-center justify-center shrink-0">
                <Music size={18} className="text-accent-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-t1 truncate">{song.title}</div>
                {song.artist && <div className="text-xs text-t3 truncate">{song.artist}</div>}
              </div>
              <div className="text-xs text-t3 shrink-0">{song.originalKey}</div>
            </Link>
          )
          return role === 'admin' ? (
            <SwipeToDelete key={song.id} onDelete={() => setSongToDelete(song)}>
              {row}
            </SwipeToDelete>
          ) : (
            <div key={song.id}>{row}</div>
          )
        })}
      </div>

      {showAddSheet && (
        <BottomSheet onClose={() => setShowAddSheet(false)}>
          <div className="p-4 space-y-2">
            <h2 className="text-sm font-semibold text-t1 px-1 mb-2">Agregar canción</h2>
            <button
              onClick={() => navigate('/admin/canciones/escanear')}
              className="w-full flex items-center gap-3 card px-4 py-3 text-left"
            >
              <Camera size={18} className="text-accent-500" />
              <div>
                <div className="text-sm font-medium text-t1">Escanear foto</div>
                <div className="text-xs text-t3">La IA extrae letra y acordes automáticamente</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/admin/canciones/nueva')}
              className="w-full flex items-center gap-3 card px-4 py-3 text-left"
            >
              <Pencil size={18} className="text-accent-500" />
              <div>
                <div className="text-sm font-medium text-t1">Escribir manualmente</div>
                <div className="text-xs text-t3">Ingresa la letra y acordes tú mismo</div>
              </div>
            </button>
          </div>
        </BottomSheet>
      )}

      {songToDelete && (
        <BottomSheet onClose={() => (deleting ? undefined : setSongToDelete(null))}>
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <TriangleAlert size={18} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-t1">¿Eliminar "{songToDelete.title}"?</h2>
                <p className="text-xs text-t3 mt-1">Esta acción no se puede deshacer. Se borrará la letra, los acordes y las fotos de referencia.</p>
              </div>
            </div>
            {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setSongToDelete(null)}
                disabled={deleting}
                className="flex-1 rounded-xl bg-s2 border border-br text-t1 font-medium py-2.5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 text-white font-semibold py-2.5 disabled:opacity-50"
              >
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </Layout>
  )
}
