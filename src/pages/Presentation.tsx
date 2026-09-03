import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CaseUpper, ChevronLeft, ChevronRight, Eye, EyeOff, Minus, Plus, WifiOff, X } from 'lucide-react'
import ChordProView from '../components/ChordProView'
import { listenSetlist } from '../firebase/setlistService'
import { listenSongs } from '../firebase/songService'
import { saveSetlist } from '../firebase/setlistMutations'
import { transposeChord } from '../lib/chordpro'
import { useHideChords } from '../hooks/useHideChords'
import { useUppercase } from '../hooks/useUppercase'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useWakeLock } from '../hooks/useWakeLock'
import { useTextScale, TEXT_SCALE_MIN, TEXT_SCALE_MAX } from '../hooks/useTextScale'
import { useLocalKeyAdjust } from '../hooks/useLocalKeyAdjust'
import { useRole } from '../contexts/RoleContext'
import type { Setlist, Song } from '../types'

export default function Presentation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { role, pin } = useRole()
  const [setlist, setSetlist] = useState<Setlist | null | undefined>(undefined)
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const initialIndex = (location.state as { index?: number } | null)?.index
  const [index, setIndex] = useState(typeof initialIndex === 'number' ? initialIndex : 0)
  const [hideChords, setHideChords] = useHideChords()
  const [uppercase, setUppercase] = useUppercase()
  const { scale: textScale, increase: increaseText, decrease: decreaseText } = useTextScale()
  const [savingKey, setSavingKey] = useState(false)
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
  const isAdmin = role === 'admin'

  // Ajuste personal (solo este teléfono) sobre el tono del setlist — cualquiera
  // puede usarlo para sí mismo sin afectar a los demás. Se suma encima de lo
  // que haya fijado el admin (que sí es compartido).
  const { delta: localDelta, increase: increaseLocalKey, decrease: decreaseLocalKey } = useLocalKeyAdjust(setlist?.id, entry?.songId)
  const baseSemitones = entry?.keyOverrideSemitones ?? 0
  const effectiveSemitones = baseSemitones + (isAdmin ? 0 : localDelta)
  const displayKey = song ? transposeChord(song.originalKey, effectiveSemitones) : '?'

  // Ajuste de tono para admin: compartido, guardado en el setlist (nunca toca
  // la canción "maestra") — se guarda al toque para que quede listo la
  // próxima vez que se abra este mismo setlist, sin tener que pasar por Editar.
  async function adjustSharedKey(delta: number) {
    if (!pin || !setlist || !entry) return
    setSavingKey(true)
    try {
      const nextSemitones = baseSemitones + delta
      const nextSongs = entries.map((e, i) =>
        i === index ? (nextSemitones === 0 ? { songId: e.songId } : { songId: e.songId, keyOverrideSemitones: nextSemitones }) : e
      )
      await saveSetlist(pin, { id: setlist.id, name: setlist.name, date: setlist.date, songs: nextSongs })
    } finally {
      setSavingKey(false)
    }
  }

  function adjustKey(delta: number) {
    if (isAdmin) adjustSharedKey(delta)
    else if (delta < 0) decreaseLocalKey()
    else increaseLocalKey()
  }

  // Navegación en loop: pasada la última canción vuelve a la primera, y viceversa.
  function goTo(next: number) {
    if (entries.length === 0) return
    setIndex(((next % entries.length) + entries.length) % entries.length)
  }

  // Flechas ocultas por defecto (a veces tapaban la letra al leer quieto) —
  // aparecen mientras se hace scroll y se ocultan de nuevo poco después de
  // parar. El swipe para cambiar de canción no depende de esto en absoluto,
  // sigue funcionando estén visibles o no.
  const [showNav, setShowNav] = useState(false)
  const hideNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleContentScroll() {
    setShowNav(true)
    if (hideNavTimer.current) clearTimeout(hideNavTimer.current)
    hideNavTimer.current = setTimeout(() => setShowNav(false), 700)
  }

  useEffect(() => {
    return () => { if (hideNavTimer.current) clearTimeout(hideNavTimer.current) }
  }, [])

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
          {song && (
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <button
                onClick={() => adjustKey(-1)}
                disabled={savingKey}
                className="w-5 h-5 rounded-md bg-s2 border border-br flex items-center justify-center disabled:opacity-40"
                aria-label={isAdmin ? 'Bajar tono (para todos)' : 'Bajar tono (solo en tu teléfono)'}
              >
                <Minus size={10} />
              </button>
              <span className="text-[11px] font-semibold text-accent-500 w-6 text-center">{displayKey}</span>
              <button
                onClick={() => adjustKey(1)}
                disabled={savingKey}
                className="w-5 h-5 rounded-md bg-s2 border border-br flex items-center justify-center disabled:opacity-40"
                aria-label={isAdmin ? 'Subir tono (para todos)' : 'Subir tono (solo en tu teléfono)'}
              >
                <Plus size={10} />
              </button>
            </div>
          )}
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
          <div className="h-full overflow-y-auto px-5 py-4" onScroll={handleContentScroll}>
            <ChordProView
              chordProText={song.chordProText}
              transposeSemitones={effectiveSemitones}
              hideChords={hideChords}
              uppercase={uppercase}
              size="large"
              userScale={textScale}
            />
          </div>
        )}

        {entries.length > 1 && (
          <>
            {/* Botones chicos y fijos en vez de zonas invisibles a todo lo alto —
                esas zonas (25% del ancho, toda la altura) tapaban el área
                scrolleable de la letra: si el gesto de scroll empezaba ahí, nunca
                llegaba al contenido y no se movía nada. */}
            <button
              onClick={() => goTo(index - 1)}
              className={`absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-s2 border border-br flex items-center justify-center shadow-md transition-opacity duration-300 ${showNav ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              aria-label="Anterior"
            >
              <ChevronLeft size={20} className="text-t2" />
            </button>
            <button
              onClick={() => goTo(index + 1)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-s2 border border-br flex items-center justify-center shadow-md transition-opacity duration-300 ${showNav ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              aria-label="Siguiente"
            >
              <ChevronRight size={20} className="text-t2" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
