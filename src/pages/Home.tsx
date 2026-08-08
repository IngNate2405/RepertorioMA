import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import Layout from '../components/layout/Layout'
import SetlistRow from '../components/SetlistRow'
import { listenSetlists } from '../firebase/setlistService'
import { listenSongs } from '../firebase/songService'
import { groupSetlists } from '../lib/setlistGroups'
import type { Setlist, Song } from '../types'

export default function Home() {
  const [setlists, setSetlists] = useState<Setlist[] | null>(null)
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [showPast, setShowPast] = useState(false)

  useEffect(() => listenSetlists(setSetlists), [])
  useEffect(() => listenSongs(setAllSongs), [])

  const songMap = useMemo(() => new Map(allSongs.map(s => [s.id, s])), [allSongs])

  const { current, past, upcoming } = useMemo(() => groupSetlists(setlists), [setlists])

  const loading = setlists === null
  const isEmpty = !loading && !current && past.length === 0 && upcoming.length === 0

  return (
    <Layout title="Setlist">
      <div className="pt-3 space-y-4 pb-6">
        {loading && <div className="pt-8 text-center text-t3 text-sm">Cargando…</div>}

        {isEmpty && (
          <div className="text-center text-t3 text-sm py-10">Todavía no hay setlists creados.</div>
        )}

        {current && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-t3 uppercase tracking-wide px-1">Setlist para esta semana:</div>
            <SetlistRow setlist={current} pinned songMap={songMap} variant="presentar" />
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={() => setShowPast(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-t3 uppercase tracking-wide px-1"
          >
            <ChevronRight size={12} className={`transition-transform ${showPast ? 'rotate-90' : ''}`} />
            Setlists anteriores ({past.length})
          </button>
          {showPast && (
            <div className="space-y-2">
              {past.length === 0 ? (
                <p className="text-xs text-t3 px-1">No hay setlists anteriores.</p>
              ) : (
                past.map(s => <SetlistRow key={s.id} setlist={s} songMap={songMap} variant="presentar" />)
              )}
            </div>
          )}
        </div>

        {upcoming.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-t3 uppercase tracking-wide px-1">Setlists siguientes</div>
            <div className="space-y-2">
              {upcoming.map(s => (
                <SetlistRow key={s.id} setlist={s} songMap={songMap} variant="presentar" />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
