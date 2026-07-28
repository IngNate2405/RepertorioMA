import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'

const REVEAL_WIDTH = 76
const DRAG_THRESHOLD = 6

interface Props {
  onDelete: () => void
  children: ReactNode
}

/** Envuelve una fila de lista: deslizar hacia la izquierda revela un botón de eliminar. */
export default function SwipeToDelete({ onDelete, children }: Props) {
  const [dragX, setDragX] = useState(0)
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startDragX = useRef(0)
  const movedFar = useRef(false)
  // El navegador dispara un "click" natural justo después de soltar un
  // mousedown+mousemove+mouseup, aunque haya habido arrastre — sin esto, ese
  // click final se interpretaría como un segundo tap que cierra la fila que
  // el propio arrastre acaba de abrir.
  const suppressNextClick = useRef(false)

  function handlePointerDown(e: PointerEvent) {
    startX.current = e.clientX
    startDragX.current = dragX
    movedFar.current = false
    setDragging(true)
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging) return
    const delta = e.clientX - startX.current
    if (Math.abs(delta) > DRAG_THRESHOLD) movedFar.current = true
    const next = Math.max(-REVEAL_WIDTH, Math.min(0, startDragX.current + delta))
    setDragX(next)
  }

  function endDrag() {
    if (!dragging) return
    setDragging(false)
    if (movedFar.current) suppressNextClick.current = true
    const shouldOpen = dragX < -REVEAL_WIDTH / 2
    setOpen(shouldOpen)
    setDragX(shouldOpen ? -REVEAL_WIDTH : 0)
  }

  function handleContentClick(e: React.MouseEvent) {
    if (suppressNextClick.current) {
      suppressNextClick.current = false
      e.preventDefault()
      e.stopPropagation()
      return
    }
    // si la fila ya estaba abierta de un arrastre anterior, este tap la cierra en vez de navegar
    if (open) {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      setDragX(0)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <button
        onClick={onDelete}
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500 text-white"
        style={{ width: REVEAL_WIDTH }}
        aria-label="Eliminar"
      >
        <Trash2 size={18} />
      </button>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleContentClick}
        onDragStart={e => e.preventDefault()}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
          touchAction: 'pan-y',
        }}
        className="relative bg-bg [&_a]:select-none"
      >
        {children}
      </div>
    </div>
  )
}
