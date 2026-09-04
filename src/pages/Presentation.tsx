import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CaseUpper, ChevronLeft, ChevronRight, EyeOff, Guitar, Minus, Plus, WifiOff } from 'lucide-react'
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
  // aparecen mientras se hace scroll (o con un tap en la pantalla, útil en
  // canciones cortas que no necesitan scroll) y se ocultan de nuevo poco
  // después. El swipe para cambiar de canción no depende de esto en
  // absoluto, sigue funcionando estén visibles o no.
  const [showNav, setShowNav] = useState(false)
  const showNavRef = useRef(showNav)
  showNavRef.current = showNav
  const hideNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearHideNavTimer() {
    if (hideNavTimer.current) {
      clearTimeout(hideNavTimer.current)
      hideNavTimer.current = null
    }
  }

  function revealNav() {
    setShowNav(true)
    clearHideNavTimer()
    hideNavTimer.current = setTimeout(() => setShowNav(false), 700)
  }

  function hideNavNow() {
    clearHideNavTimer()
    setShowNav(false)
  }

  function handleContentScroll() {
    revealNav()
  }

  function toggleNav() {
    if (showNavRef.current) hideNavNow()
    else revealNav()
  }

  useEffect(() => {
    return () => clearHideNavTimer()
  }, [])

  const SWIPE_THRESHOLD = 60
  const TAP_THRESHOLD = 10
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
      return
    }

    // Un tap real (el dedo casi no se movió) — no uno de scroll a medias, que
    // ya maneja handleContentScroll por su cuenta. Si el tap fue sobre uno de
    // los botones (flechas, etc.) esos ya tienen su propio onClick, no hace
    // falta alternar nada más.
    const isTap = Math.abs(deltaX) < TAP_THRESHOLD && Math.abs(deltaY) < TAP_THRESHOLD
    if (isTap && !(e.target as HTMLElement).closest('button')) {
      toggleNav()
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
        className="shrink-0 px-5"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-0.5 text-t2 text-sm font-medium -ml-1.5 pl-1.5 pr-2 py-1"
            aria-label="Salir"
          >
            <ChevronLeft size={20} />
            Repertorio
          </button>
          <div className="flex items-center gap-2">
            {!online && <WifiOff size={14} className="text-t3" aria-label="Sin conexión" />}
            <button
              onClick={() => setUppercase(!uppercase)}
              className={`w-8 h-8 rounded-full border flex items-center justify-center ${uppercase ? 'bg-accent-500/15 border-accent-500/40 text-accent-500' : 'bg-s2 border-br text-t2'}`}
              aria-label={uppercase ? 'Ver letra original' : 'Ver letra en mayúsculas'}
            >
              <CaseUpper size={15} />
            </button>
          </div>
        </div>

        <div className="mb-3 min-w-0">
          <h1 className="text-2xl font-bold text-t1 truncate">{song?.title ?? setlist?.name ?? ''}</h1>
          <div className="text-[11px] font-semibold text-t3 uppercase tracking-wide mt-0.5 truncate">
            {song?.artist || (entries.length > 0 ? `Canción ${index + 1} de ${entries.length}` : '')}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 rounded-xl bg-s2 border border-br px-3 py-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-t3 uppercase tracking-wide">Tono</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustKey(-1)}
                disabled={savingKey}
                className="w-6 h-6 rounded-full bg-s1 border border-br flex items-center justify-center disabled:opacity-40"
                aria-label={isAdmin ? 'Bajar tono (para todos)' : 'Bajar tono (solo en tu teléfono)'}
              >
                <Minus size={11} />
              </button>
              <span className="text-sm font-bold text-accent-500 w-5 text-center">{displayKey}</span>
              <button
                onClick={() => adjustKey(1)}
                disabled={savingKey}
                className="w-6 h-6 rounded-full bg-s1 border border-br flex items-center justify-center disabled:opacity-40"
                aria-label={isAdmin ? 'Subir tono (para todos)' : 'Subir tono (solo en tu teléfono)'}
              >
                <Plus size={11} />
              </button>
            </div>
          </div>
          <div className="flex-1 rounded-xl bg-s2 border border-br px-3 py-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-t3 uppercase tracking-wide">Letra</span>
            <div className="flex items-center gap-2">
              <button
                onClick={decreaseText}
                disabled={textScale <= TEXT_SCALE_MIN}
                className="w-6 h-6 rounded-full bg-s1 border border-br flex items-center justify-center disabled:opacity-40"
                aria-label="Reducir letra"
              >
                <Minus size={11} />
              </button>
              <span className="text-xs font-bold text-t1">Aa</span>
              <button
                onClick={increaseText}
                disabled={textScale >= TEXT_SCALE_MAX}
                className="w-6 h-6 rounded-full bg-s1 border border-br flex items-center justify-center disabled:opacity-40"
                aria-label="Agrandar letra"
              >
                <Plus size={11} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setHideChords(false)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold border ${!hideChords ? 'bg-accent-500/15 border-accent-500 text-accent-500' : 'bg-s2 border-br text-t2'}`}
          >
            <Guitar size={14} /> Mostrar notas
          </button>
          <button
            onClick={() => setHideChords(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold border ${hideChords ? 'bg-accent-500/15 border-accent-500 text-accent-500' : 'bg-s2 border-br text-t2'}`}
          >
            <EyeOff size={14} /> Solo letra
          </button>
        </div>
      </div>

      <div className="border-t border-br2 shrink-0" />

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
