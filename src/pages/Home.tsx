import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Music, Play } from 'lucide-react'
import Layout from '../components/layout/Layout'
import { listenCurrentSetlist, listenLastPlayedSetlist } from '../firebase/setlistService'
import { listenSongs } from '../firebase/songService'
import { transposeChord } from '../lib/chordpro'
import { useRole } from '../contexts/RoleContext'
import type { Setlist, Song } from '../types'

export default function Home() {
  const { logout } = useRole()
  const navigate = useNavigate()
  const [current, setCurrent] = useState<Setlist | null | undefined>(undefined)
  const [lastPlayed, setLastPlayed] = useState<Setlist | null | undefined>(undefined)
  const [allSongs, setAllSongs] = useState<Song[]>([])

  function handleLogout() {
    logout()
    navigate('/entrar', { replace: true })
  }

  useEffect(() => listenCurrentSetlist(setCurrent), [])
  useEffect(() => listenLastPlayedSetlist(setLastPlayed), [])
  useEffect(() => listenSongs(setAllSongs), [])

  const songMap = useMemo(() => new Map(allSongs.map(s => [s.id, s])), [allSongs])

  // Solo esperamos el fallback (último tocado) si de verdad no hay un "current" —
  // si ya tenemos un setlist actual, mostrarlo de inmediato sin esperar la otra consulta.
  const loading = current === undefined || (current === null && lastPlayed === undefined)
  const setlist = current ?? lastPlayed ?? null
  const isFallback = !current && Boolean(lastPlayed)

  return (
    <Layout
      title="Este domingo"
      headerRight={
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-full bg-s2 border border-br flex items-center justify-center text-t2"
          aria-label="Cerrar sesión"
        >
          <LogOut size={16} />
        </button>
      }
    >
      <div className="pt-3 space-y-3 pb-6">
        {loading && <div className="pt-8 text-center text-t3 text-sm">Cargando…</div>}

        {!loading && !setlist && (
          <div className="text-center text-t3 text-sm py-10">Todavía no hay un repertorio programado.</div>
        )}

        {setlist && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-t1">{setlist.name}</div>
                <div className="text-xs text-t3">
                  {setlist.date}
                  {isFallback && ' · último repertorio tocado'}
                </div>
              </div>
              {setlist.songs.length > 0 && (
                <Link
                  to={`/setlists/${setlist.id}/presentar`}
                  className="flex items-center gap-1.5 rounded-full bg-accent-500 text-black text-xs font-semibold px-3 py-2"
                >
                  <Play size={14} /> Presentar
                </Link>
              )}
            </div>

            <div className="space-y-2">
              {setlist.songs.map((entry, i) => {
                const song = songMap.get(entry.songId)
                const key = song ? transposeChord(song.originalKey, entry.keyOverrideSemitones ?? 0) : '?'
                return (
                  <Link
                    key={entry.songId}
                    to={`/canciones/${entry.songId}`}
                    className="card flex items-center gap-3 px-3 py-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0 text-xs text-accent-500 font-semibold">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-t1 truncate">{song?.title ?? 'Canción'}</div>
                    </div>
                    <div className="text-xs text-t3 shrink-0">{key}</div>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        <Link to="/canciones" className="flex items-center justify-center gap-2 text-sm text-t3 pt-2">
          <Music size={14} /> Ver todas las canciones
        </Link>
      </div>
    </Layout>
  )
}
