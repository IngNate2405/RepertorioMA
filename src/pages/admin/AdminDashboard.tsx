import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Plus, Star, TrendingUp } from 'lucide-react'
import Layout from '../../components/layout/Layout'
import { listenSetlists } from '../../firebase/setlistService'
import { listenSongs } from '../../firebase/songService'
import type { Setlist, Song } from '../../types'

const STATUS_LABEL: Record<Setlist['status'], string> = {
  current: 'Actual',
  draft: 'Borrador',
  played: 'Tocado',
}

export default function AdminDashboard() {
  const [setlists, setSetlists] = useState<Setlist[] | null>(null)
  const [songs, setSongs] = useState<Song[]>([])

  useEffect(() => listenSetlists(setSetlists), [])
  useEffect(() => listenSongs(setSongs), [])

  const topSongs = useMemo(
    () => songs.filter(s => s.timesPlayed > 0).sort((a, b) => b.timesPlayed - a.timesPlayed).slice(0, 5),
    [songs]
  )

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

          <div className="space-y-2">
            {setlists?.map(setlist => (
              <Link
                key={setlist.id}
                to={`/admin/setlists/${setlist.id}/editar`}
                className="card flex items-center gap-3 px-3 py-3"
              >
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
    </Layout>
  )
}
