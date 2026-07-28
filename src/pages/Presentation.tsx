import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CaseUpper, ChevronLeft, ChevronRight, Eye, EyeOff, WifiOff, X } from 'lucide-react'
import ChordProView from '../components/ChordProView'
import { listenSetlist } from '../firebase/setlistService'
import { listenSongs } from '../firebase/songService'
import { useHideChords } from '../hooks/useHideChords'
import { useUppercase } from '../hooks/useUppercase'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useWakeLock } from '../hooks/useWakeLock'
import type { Setlist, Song } from '../types'

export default function Presentation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [setlist, setSetlist] = useState<Setlist | null | undefined>(undefined)
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [index, setIndex] = useState(0)
  const [hideChords, setHideChords] = useHideChords()
  const [uppercase, setUppercase] = useUppercase()
  const online = useOnlineStatus()
  useWakeLock(true)

  useEffect(() => {
    if (!id) return
    return listenSetlist(id, setSetlist)
  }, [id])
  useEffect(() => listenSongs(setAllSongs), [])

  const songMap = useMemo(() => new Map(allSongs.map(s => [s.id, s])), [allSongs])
  const entries = setlist?.songs ?? []
  const entry = entries[index]
  const song = entry ? songMap.get(entry.songId) : undefined

  function goTo(next: number) {
    if (next < 0 || next >= entries.length) return
    setIndex(next)
  }

  if (setlist === undefined || (song === undefined && entries.length > 0 && allSongs.length === 0)) {
    return (
      <div className="fixed inset-0 bg-bg flex items-center justify-center z-[200]">
        <span className="text-t3 text-sm">Cargando…</span>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-bg text-t1 flex flex-col z-[200]">
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setUppercase(!uppercase)}
            className={`w-9 h-9 rounded-full border flex items-center justify-center ${uppercase ? 'bg-accent-500/15 border-accent-500/40 text-accent-500' : 'bg-s2 border-br'}`}
            aria-label={uppercase ? 'Ver letra original' : 'Ver letra en mayúsculas'}
          >
            <CaseUpper size={16} />
          </button>
          <button
            onClick={() => setHideChords(!hideChords)}
            className="w-9 h-9 rounded-full bg-s2 border border-br flex items-center justify-center"
            aria-label={hideChords ? 'Mostrar acordes' : 'Ocultar acordes'}
          >
            {hideChords ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="text-center min-w-0 px-2">
          <div className="text-sm font-semibold truncate max-w-[220px]">{song?.title ?? setlist?.name ?? ''}</div>
          <div className="flex items-center justify-center gap-1 text-[11px] text-t3">
            {entries.length > 0 && <span>{index + 1} / {entries.length}</span>}
            {!online && <WifiOff size={10} />}
          </div>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-s2 border border-br flex items-center justify-center"
          aria-label="Salir"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {entries.length === 0 && (
          <div className="h-full flex items-center justify-center text-t3 text-sm px-6 text-center">
            Este setlist no tiene canciones.
          </div>
        )}

        {song && (
          <div className="h-full overflow-y-auto px-5 py-4">
            <ChordProView
              chordProText={song.chordProText}
              transposeSemitones={entry?.keyOverrideSemitones ?? 0}
              hideChords={hideChords}
              uppercase={uppercase}
              size="large"
            />
          </div>
        )}

        {entries.length > 1 && (
          <>
            <button
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="absolute left-0 top-0 bottom-0 w-1/4 flex items-center justify-start pl-1 disabled:opacity-0"
              aria-label="Anterior"
            >
              <ChevronLeft size={22} className="text-t3" />
            </button>
            <button
              onClick={() => goTo(index + 1)}
              disabled={index === entries.length - 1}
              className="absolute right-0 top-0 bottom-0 w-1/4 flex items-center justify-end pr-1 disabled:opacity-0"
              aria-label="Siguiente"
            >
              <ChevronRight size={22} className="text-t3" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
