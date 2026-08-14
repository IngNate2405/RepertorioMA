import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CaseUpper, ChevronLeft, ChevronRight, Eye, EyeOff, Minus, Plus, WifiOff, X } from 'lucide-react'
import ChordProView from '../components/ChordProView'
import { listenSetlist } from '../firebase/setlistService'
import { listenSongs } from '../firebase/songService'
import { useHideChords } from '../hooks/useHideChords'
import { useUppercase } from '../hooks/useUppercase'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useWakeLock } from '../hooks/useWakeLock'
import { useTextScale, TEXT_SCALE_MIN, TEXT_SCALE_MAX } from '../hooks/useTextScale'
import type { Setlist, Song } from '../types'

export default function Presentation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [setlist, setSetlist] = useState<Setlist | null | undefined>(undefined)
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const initialIndex = (location.state as { index?: number } | null)?.index
  const [index, setIndex] = useState(typeof initialIndex === 'number' ? initialIndex : 0)
  const [hideChords, setHideChords] = useHideChords()
  const [uppercase, setUppercase] = useUppercase()
  const { scale: textScale, increase: increaseText, decrease: decreaseText } = useTextScale()
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

  // Navegación en loop: pasada la última canción vuelve a la primera, y viceversa.
  function goTo(next: number) {
    if (entries.length === 0) return
    setIndex(((next % entries.length) + entries.length) % entries.length)
  }

  const SWIPE_THRESHOLD = 60
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  function handlePointerDown(e: PointerEvent) {
    dragStart.current = { x: e.clientX, y: e.clientY }
  }

  function handlePointerUp(e: PointerEvent) {
    const start = dragStart.current
    dragStart.current = null
    if (!start) return
    const deltaX = e.clientX - start.x
    const deltaY = e.clientY - start.y
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      goTo(deltaX < 0 ? index + 1 : index - 1)
    }
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
          <div className="flex items-center rounded-full bg-s2 border border-br overflow-hidden">
            <button
              onClick={decreaseText}
              disabled={textScale <= TEXT_SCALE_MIN}
              className="w-8 h-9 flex items-center justify-center disabled:opacity-30"
              aria-label="Reducir letra"
            >
              <Minus size={14} />
            </button>
            <div className="w-px h-5 bg-br" />
            <button
              onClick={increaseText}
              disabled={textScale >= TEXT_SCALE_MAX}
              className="w-8 h-9 flex items-center justify-center disabled:opacity-30"
              aria-label="Agrandar letra"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="text-center min-w-0 px-2">
          <div className="text-sm font-semibold truncate max-w-[140px] mx-auto">{song?.title ?? setlist?.name ?? ''}</div>
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

      <div
        className="flex-1 relative overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { dragStart.current = null }}
      >
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
              userScale={textScale}
            />
          </div>
        )}

        {entries.length > 1 && (
          <>
            <button
              onClick={() => goTo(index - 1)}
              className="absolute left-0 top-0 bottom-0 w-1/4 flex items-center justify-start pl-1"
              aria-label="Anterior"
            >
              <ChevronLeft size={22} className="text-t3" />
            </button>
            <button
              onClick={() => goTo(index + 1)}
              className="absolute right-0 top-0 bottom-0 w-1/4 flex items-center justify-end pr-1"
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
