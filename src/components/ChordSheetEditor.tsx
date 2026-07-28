import { useEffect, useRef, useState } from 'react'
import { CopyPlus, GripVertical, Plus, Tag, Trash2 } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { parseChordSheet, serializeChordSheet, type ChordSheetItem } from '../lib/chordpro'

interface Props {
  value: string
  onChange: (text: string) => void
}

/** Item con id estable — dnd-kit lo necesita para animar el reordenamiento (los ids son solo internos del editor, no se guardan). */
type EditorRow = ChordSheetItem & { id: string }

function newId() {
  return crypto.randomUUID()
}

function SortableRow({
  row, onUpdateLine, onUpdateLabel, onRemove, onDuplicate, onEnterFromChords, onEnterFromLyric, chordsRef, lyricRef, labelRef,
}: {
  row: EditorRow
  onUpdateLine: (field: 'chords' | 'lyric', text: string) => void
  onUpdateLabel: (text: string) => void
  onRemove: () => void
  onDuplicate: () => void
  onEnterFromChords: () => void
  onEnterFromLyric: () => void
  chordsRef: (el: HTMLInputElement | null) => void
  lyricRef: (el: HTMLInputElement | null) => void
  labelRef: (el: HTMLInputElement | null) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  if (row.type === 'label') {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-1.5">
        <button {...attributes} {...listeners} className="text-t4 shrink-0 touch-none" aria-label="Reordenar">
          <GripVertical size={14} />
        </button>
        <input
          ref={labelRef}
          value={row.text}
          onChange={e => onUpdateLabel(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onEnterFromLyric()
            }
          }}
          placeholder="Coro, Estrofa 2…"
          className="w-full bg-accent-500/10 rounded-md px-2 py-1 outline-none text-accent-500 font-bold uppercase tracking-wide placeholder:text-accent-500/40 placeholder:font-normal placeholder:normal-case"
        />
        <button onClick={onDuplicate} className="text-t4 shrink-0" aria-label="Duplicar etiqueta">
          <CopyPlus size={13} />
        </button>
        <button onClick={onRemove} className="text-t4 shrink-0" aria-label="Quitar etiqueta">
          <Trash2 size={13} />
        </button>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1.5">
      <button {...attributes} {...listeners} className="text-t4 shrink-0 touch-none mt-1" aria-label="Reordenar">
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0 overflow-x-auto">
        <input
          ref={chordsRef}
          value={row.chords}
          onChange={e => onUpdateLine('chords', e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onEnterFromChords()
            }
          }}
          placeholder="acordes, ej. D#   Gm   Cm"
          className="w-full bg-transparent outline-none text-accent-500 font-bold placeholder:text-t4 placeholder:font-normal"
        />
        <input
          ref={lyricRef}
          value={row.lyric}
          onChange={e => onUpdateLine('lyric', e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onEnterFromLyric()
            }
          }}
          placeholder="letra"
          className="w-full bg-transparent outline-none text-t1 placeholder:text-t4"
        />
      </div>
      <button onClick={onDuplicate} className="text-t4 shrink-0 mt-1" aria-label="Duplicar línea">
        <CopyPlus size={13} />
      </button>
      <button onClick={onRemove} className="text-t4 shrink-0 mt-1" aria-label="Quitar línea">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

/**
 * Edición directa sobre la misma vista de "acorde arriba, letra abajo": cada
 * línea es un par de inputs alineados en columnas (fuente monoespaciada).
 * Para mover un acorde, el admin simplemente agrega o quita espacios antes
 * de escribirlo — no hay sintaxis que aprender. Cada fila (línea o etiqueta
 * de sección) se puede arrastrar hacia arriba/abajo para reordenarla, o
 * duplicar para repetir un patrón de acordes en una estrofa o puente nuevo.
 */
export default function ChordSheetEditor({ value, onChange }: Props) {
  // Solo se lee `value` en el montaje inicial — el padre debe esperar a tener
  // el valor real (ver `loaded` en SongEditor) antes de montar este componente,
  // para no perder lo que el admin ya escribió si `value` cambiara después.
  const [rows, setRows] = useState<EditorRow[]>(() => {
    const parsed = parseChordSheet(value)
    const withIds = parsed.map(item => ({ ...item, id: newId() }))
    return withIds.length > 0 ? withIds : [{ type: 'pair', chords: '', lyric: '', id: newId() }]
  })
  const pendingFocus = useRef<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (pendingFocus.current) {
      inputRefs.current[pendingFocus.current]?.focus()
      pendingFocus.current = null
    }
  }, [rows])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  function commit(next: EditorRow[]) {
    setRows(next)
    onChange(serializeChordSheet(next))
  }

  function updateLine(index: number, field: 'chords' | 'lyric', text: string) {
    commit(rows.map((r, i) => (i === index && r.type === 'pair' ? { ...r, [field]: text } : r)))
  }

  function updateLabel(index: number, text: string) {
    commit(rows.map((r, i) => (i === index && r.type === 'label' ? { ...r, text } : r)))
  }

  function addLineAfter(index: number) {
    const next = [...rows]
    const id = newId()
    next.splice(index + 1, 0, { type: 'pair', chords: '', lyric: '', id })
    pendingFocus.current = `${id}-chords`
    commit(next)
  }

  function addLabelAfter(index: number) {
    const next = [...rows]
    const id = newId()
    next.splice(index + 1, 0, { type: 'label', text: '', id })
    pendingFocus.current = `${id}-label`
    commit(next)
  }

  function duplicateRow(index: number) {
    const source = rows[index]
    const id = newId()
    const copy: EditorRow = { ...source, id }
    const next = [...rows]
    next.splice(index + 1, 0, copy)
    pendingFocus.current = copy.type === 'label' ? `${id}-label` : `${id}-chords`
    commit(next)
  }

  function removeRow(index: number) {
    const next = rows.filter((_, i) => i !== index)
    commit(next.length > 0 ? next : [{ type: 'pair', chords: '', lyric: '', id: newId() }])
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rows.findIndex(r => r.id === active.id)
    const newIndex = rows.findIndex(r => r.id === over.id)
    commit(arrayMove(rows, oldIndex, newIndex))
  }

  return (
    <div className="space-y-1.5 font-mono text-xs">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
          {rows.map((row, i) => (
            <SortableRow
              key={row.id}
              row={row}
              onUpdateLine={(field, text) => updateLine(i, field, text)}
              onUpdateLabel={text => updateLabel(i, text)}
              onRemove={() => removeRow(i)}
              onDuplicate={() => duplicateRow(i)}
              onEnterFromChords={() => inputRefs.current[`${row.id}-lyric`]?.focus()}
              onEnterFromLyric={() => addLineAfter(i)}
              chordsRef={el => { inputRefs.current[`${row.id}-chords`] = el }}
              lyricRef={el => { inputRefs.current[`${row.id}-lyric`] = el }}
              labelRef={el => { inputRefs.current[`${row.id}-label`] = el }}
            />
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => addLineAfter(rows.length - 1)}
          className="flex items-center gap-1 text-xs text-accent-500 font-medium"
        >
          <Plus size={13} /> Agregar línea
        </button>
        <button
          onClick={() => addLabelAfter(rows.length - 1)}
          className="flex items-center gap-1 text-xs text-t3 font-medium"
        >
          <Tag size={13} /> Etiqueta de sección
        </button>
      </div>
    </div>
  )
}
