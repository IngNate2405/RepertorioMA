import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Check, GripVertical, Minus, Plus, Search, Star, Trash2 } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Layout from '../../components/layout/Layout'
import BackButton from '../../components/layout/BackButton'
import BottomSheet from '../../components/ui/BottomSheet'
import { listenSetlist } from '../../firebase/setlistService'
import { listenSongs } from '../../firebase/songService'
import { saveSetlist, markSetlistCurrent, markSetlistPlayed } from '../../firebase/setlistMutations'
import { transposeChord } from '../../lib/chordpro'
import { normalizeTitle } from '../../lib/text'
import { useRole } from '../../contexts/RoleContext'
import type { Setlist, SetlistSongRef, Song } from '../../types'

function SortableSongRow({
  entry, song, onRemove, onTranspose,
}: {
  entry: SetlistSongRef
  song: Song | undefined
  onRemove: () => void
  onTranspose: (delta: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.songId })
  const offset = entry.keyOverrideSemitones ?? 0
  const displayKey = song ? transposeChord(song.originalKey, offset) : '?'

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="card flex items-center gap-2 px-3 py-2.5"
    >
      <button {...attributes} {...listeners} className="text-t4 shrink-0 touch-none" aria-label="Reordenar">
        <GripVertical size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-t1 truncate">{song?.title ?? 'Canción no encontrada'}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onTranspose(-1)} className="w-6 h-6 rounded-md bg-s2 border border-br flex items-center justify-center">
          <Minus size={12} />
        </button>
        <span className="text-xs text-t2 w-8 text-center">{displayKey}</span>
        <button onClick={() => onTranspose(1)} className="w-6 h-6 rounded-md bg-s2 border border-br flex items-center justify-center">
          <Plus size={12} />
        </button>
      </div>
      <button onClick={onRemove} className="text-t4 shrink-0 ml-1" aria-label="Quitar">
        <Trash2 size={15} />
      </button>
    </div>
  )
}

export default function SetlistEditor() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { pin } = useRole()
  const navigate = useNavigate()
  const location = useLocation()
  const loadedRef = useRef(false)
  const prefill = (location.state as { name?: string; date?: string } | null) ?? null

  const [name, setName] = useState(prefill?.name ?? '')
  const [date, setDate] = useState(() => prefill?.date ?? new Date().toISOString().slice(0, 10))
  const [entries, setEntries] = useState<SetlistSongRef[]>([])
  const [status, setStatus] = useState<Setlist['status']>('draft')
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => listenSongs(setAllSongs), [])

  useEffect(() => {
    if (!id) return
    return listenSetlist(id, setlist => {
      if (setlist && !loadedRef.current) {
        loadedRef.current = true
        setName(setlist.name)
        setDate(setlist.date)
        setEntries(setlist.songs)
        setStatus(setlist.status)
      }
    })
  }, [id])

  const songMap = useMemo(() => new Map(allSongs.map(s => [s.id, s])), [allSongs])

  const pickerResults = useMemo(() => {
    const q = normalizeTitle(pickerSearch)
    const addedIds = new Set(entries.map(e => e.songId))
    return allSongs.filter(s => !addedIds.has(s.id) && (!q || normalizeTitle(s.title).includes(q)))
  }, [allSongs, pickerSearch, entries])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setEntries(prev => {
      const oldIndex = prev.findIndex(e => e.songId === active.id)
      const newIndex = prev.findIndex(e => e.songId === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  function addSong(songId: string) {
    setEntries(prev => [...prev, { songId }])
    setShowPicker(false)
    setPickerSearch('')
  }

  function removeSong(songId: string) {
    setEntries(prev => prev.filter(e => e.songId !== songId))
  }

  function transposeSong(songId: string, delta: number) {
    setEntries(prev =>
      prev.map(e => {
        if (e.songId !== songId) return e
        const next = (e.keyOverrideSemitones ?? 0) + delta
        return next === 0 ? { songId } : { songId, keyOverrideSemitones: next }
      })
    )
  }

  async function handleSave() {
    if (!pin) return
    setError('')
    setSaving(true)
    try {
      await saveSetlist(pin, { id, name: name.trim(), date, songs: entries })
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el setlist')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkCurrent() {
    if (!pin || !id) return
    setSaving(true)
    try {
      await markSetlistCurrent(pin, id)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo marcar como actual')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkPlayed() {
    if (!pin || !id) return
    setSaving(true)
    try {
      await markSetlistPlayed(pin, id)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo marcar como tocado')
    } finally {
      setSaving(false)
    }
  }

  const canSave = name.trim() && date.trim() && !saving

  return (
    <Layout title={isEditing ? 'Editar setlist' : 'Nuevo setlist'} headerLeft={<BackButton />}>
      <div className="pt-3 space-y-3 pb-6">
        <div>
          <label className="field-label mb-1">Nombre</label>
          <input className="input-base" value={name} onChange={e => setName(e.target.value)} placeholder="Domingo de servicio" />
        </div>
        <div>
          <label className="field-label mb-1">Fecha</label>
          <input type="date" className="input-base" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {isEditing && status !== 'current' && (
          <button
            onClick={handleMarkCurrent}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-s2 border border-accent-500/40 text-accent-500 font-medium py-2 text-sm"
          >
            <Star size={14} /> Marcar como el repertorio de este domingo
          </button>
        )}
        {status === 'current' && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-accent-500/15 text-accent-500 font-medium py-2 text-sm">
            <Star size={14} /> Este es el repertorio actual
          </div>
        )}

        {isEditing && status !== 'played' && entries.length > 0 && (
          <button
            onClick={handleMarkPlayed}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-s2 border border-br text-t2 font-medium py-2 text-sm"
          >
            <Check size={14} /> Marcar como tocado (suma a las estadísticas)
          </button>
        )}
        {status === 'played' && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-s2 text-t3 font-medium py-2 text-sm">
            <Check size={14} /> Ya se tocó este repertorio
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="field-label">Canciones ({entries.length})</label>
          <button onClick={() => setShowPicker(true)} className="flex items-center gap-1 text-xs text-accent-500 font-medium">
            <Plus size={14} /> Agregar
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="text-center text-t3 text-sm py-6 border-2 border-dashed border-br rounded-2xl">
            Todavía no hay canciones en este setlist.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={entries.map(e => e.songId)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {entries.map(entry => (
                  <SortableSongRow
                    key={entry.songId}
                    entry={entry}
                    song={songMap.get(entry.songId)}
                    onRemove={() => removeSong(entry.songId)}
                    onTranspose={delta => transposeSong(entry.songId, delta)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-xl bg-accent-500 text-black font-semibold py-2.5 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar setlist'}
        </button>
      </div>

      {showPicker && (
        <BottomSheet onClose={() => setShowPicker(false)}>
          <div className="p-4 space-y-3 max-h-[70dvh] flex flex-col">
            <h2 className="text-sm font-semibold text-t1">Agregar canción</h2>
            <div className="relative shrink-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" />
              <input
                autoFocus
                className="input-base pl-9"
                placeholder="Buscar canción…"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
              />
            </div>
            <div className="overflow-y-auto space-y-1.5">
              {pickerResults.length === 0 && <p className="text-xs text-t3 text-center py-4">Sin resultados</p>}
              {pickerResults.map(song => (
                <button
                  key={song.id}
                  onClick={() => addSong(song.id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-s2 text-sm text-t1"
                >
                  {song.title}
                  <span className="text-t3 text-xs ml-2">{song.originalKey}</span>
                </button>
              ))}
            </div>
          </div>
        </BottomSheet>
      )}
    </Layout>
  )
}
