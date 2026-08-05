import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, Play, Star } from 'lucide-react'
import Layout from '../components/layout/Layout'
import { listenSetlists } from '../firebase/setlistService'
import { listenSongs } from '../firebase/songService'
import { transposeChord } from '../lib/chordpro'
import type { Setlist, Song } from '../types'

function SetlistRow({ setlist, pinned, songMap }: { setlist: Setlist; pinned?: boolean; songMap: Map<string, Song> }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`card overflow-hidden ${pinned ? 'card-pinned' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-3">
        <button onClick={() => setExpanded(v => !v)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
          <ChevronDown size={16} className={`text-t3 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-t1 truncate">{setlist.name}</span>
              {pinned && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-accent-500 bg-accent-500/15 rounded-full px-2 py-0.5 shrink-0">
                  <Star size={10} /> Fijada
                </span>
              )}
            </div>
            <div className="text-xs text-t3">{setlist.date} · {setlist.songs.length} canciones</div>
          </div>
        </button>
        {setlist.songs.length > 0 && (
          <Link
            to={`/setlists/${setlist.id}/presentar`}
            className="shrink-0 flex items-center gap-1 rounded-full bg-accent-500 text-black text-xs font-semibold px-3 py-1.5"
          >
            <Play size={12} /> Presentar
          </Link>
        )}
      </div>

      {expanded && (
        <div className="border-t border-br divide-y divide-br">
          {setlist.songs.length === 0 ? (
            <div className="px-3 py-3 text-xs text-t3 text-center">Sin canciones.</div>
          ) : (
            setlist.songs.map((entry, i) => {
              const song = songMap.get(entry.songId)
              const key = song ? transposeChord(song.originalKey, entry.keyOverrideSemitones ?? 0) : '?'
              return (
                <Link
                  key={entry.songId}
                  to={`/setlists/${setlist.id}/presentar`}
                  state={{ index: i }}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <div className="w-6 h-6 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0 text-[11px] text-accent-500 font-semibold">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1 text-sm text-t1 truncate">{song?.title ?? 'Canción'}</div>
                  <div className="text-xs text-t3 shrink-0">{key}</div>
                </Link>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [setlists, setSetlists] = useState<Setlist[] | null>(null)
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [showPast, setShowPast] = useState(false)

  useEffect(() => listenSetlists(setSetlists), [])
  useEffect(() => listenSongs(setAllSongs), [])

  const songMap = useMemo(() => new Map(allSongs.map(s => [s.id, s])), [allSongs])

  const current = useMemo(() => setlists?.find(s => s.status === 'current') ?? null, [setlists])
  const past = useMemo(
    () => (setlists ?? []).filter(s => s.status === 'played').sort((a, b) => b.date.localeCompare(a.date)),
    [setlists]
  )
  const upcoming = useMemo(
    () => (setlists ?? []).filter(s => s.status === 'draft').sort((a, b) => a.date.localeCompare(b.date)),
    [setlists]
  )

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
            <SetlistRow setlist={current} pinned songMap={songMap} />
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
                past.map(s => <SetlistRow key={s.id} setlist={s} songMap={songMap} />)
              )}
            </div>
          )}
        </div>

        {upcoming.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-t3 uppercase tracking-wide px-1">Setlists siguientes</div>
            <div className="space-y-2">
              {upcoming.map(s => (
                <SetlistRow key={s.id} setlist={s} songMap={songMap} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
