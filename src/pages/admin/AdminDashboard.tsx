import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Plus, Star, TrendingUp, TriangleAlert } from 'lucide-react'
import Layout from '../../components/layout/Layout'
import BottomSheet from '../../components/ui/BottomSheet'
import SwipeToDelete from '../../components/SwipeToDelete'
import { listenSetlists } from '../../firebase/setlistService'
import { listenSongs } from '../../firebase/songService'
import { deleteSetlist } from '../../firebase/setlistMutations'
import { useRole } from '../../contexts/RoleContext'
import type { Setlist, Song } from '../../types'

const STATUS_LABEL: Record<Setlist['status'], string> = {
  current: 'Actual',
  draft: 'Borrador',
  played: 'Tocado',
}

export default function AdminDashboard() {
  const { pin } = useRole()
  const [setlists, setSetlists] = useState<Setlist[] | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [setlistToDelete, setSetlistToDelete] = useState<Setlist | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => listenSetlists(setSetlists), [])
  useEffect(() => listenSongs(setSongs), [])

  const topSongs = useMemo(
    () => songs.filter(s => s.timesPlayed > 0).sort((a, b) => b.timesPlayed - a.timesPlayed).slice(0, 5),
    [songs]
  )

  async function confirmDelete() {
    if (!pin || !setlistToDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteSetlist(pin, setlistToDelete.id)
      setSetlistToDelete(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar el setlist')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Layout
      title="Admin"
      headerRight={
        <Link to="/admin/setlists/nuevo" className="w-9 h-9 rounded-full bg-accent-500 flex items-center justify-center text-black">
          <Plus size={18} />
        </Link>
      }
    >
      <div className="pt-3 space-y-5 pb-6">
        <div className="space-y-2">
          <label className="field-label">Setlists</label>

          {setlists === null && <div className="pt-2 text-center text-t3 text-sm">Cargando…</div>}

          {setlists !== null && setlists.length === 0 && (
            <div className="text-center text-t3 text-sm py-6 border-2 border-dashed border-br rounded-2xl">
              Todavía no hay setlists. Crea uno para el próximo domingo.
            </div>
          )}

          {setlists !== null && setlists.length > 0 && (
            <p className="text-[11px] text-t3 px-1">Desliza un setlist hacia la izquierda para eliminarlo.</p>
          )}

          <div className="space-y-2">
            {setlists?.map(setlist => (
              <SwipeToDelete key={setlist.id} onDelete={() => setSetlistToDelete(setlist)}>
                <Link to={`/admin/setlists/${setlist.id}/editar`} className="card flex items-center gap-3 px-3 py-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex items-center justify-center shrink-0">
                    <CalendarDays size={18} className="text-accent-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-t1 truncate">{setlist.name}</div>
                    <div className="text-xs text-t3">{setlist.date} · {setlist.songs.length} canciones</div>
                  </div>
                  {setlist.status === 'current' ? (
                    <Star size={16} className="text-accent-500 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-t3 shrink-0">{STATUS_LABEL[setlist.status]}</span>
                  )}
                </Link>
              </SwipeToDelete>
            ))}
          </div>
        </div>

        {topSongs.length > 0 && (
          <div className="space-y-2">
            <label className="field-label">Canciones más tocadas</label>
            <div className="card divide-y divide-br">
              {topSongs.map((song, i) => (
                <Link key={song.id} to={`/canciones/${song.id}`} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="text-xs text-t4 w-4 shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-t1 truncate">{song.title}</div>
                  </div>
                  <div className="flex items-center gap-1 text-accent-500 text-xs font-semibold shrink-0">
                    <TrendingUp size={12} /> {song.timesPlayed}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {setlistToDelete && (
        <BottomSheet onClose={() => (deleting ? undefined : setSetlistToDelete(null))}>
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <TriangleAlert size={18} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-t1">¿Eliminar "{setlistToDelete.name}"?</h2>
                <p className="text-xs text-t3 mt-1">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setSetlistToDelete(null)}
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
