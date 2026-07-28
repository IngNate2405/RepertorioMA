import { useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const DISMISS_THRESHOLD = 120

interface Props {
  src: string
  alt?: string
  onClose: () => void
}

/** Vista grande de una foto: X para cerrar, tocar fuera de la imagen para cerrar,
 *  o deslizarla hacia abajo con el dedo para cerrarla (como en la app de Fotos). */
export default function ImageLightbox({ src, alt, onClose }: Props) {
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)
  const startDragY = useRef(0)

  function handlePointerDown(e: PointerEvent) {
    startY.current = e.clientY
    startDragY.current = dragY
    setDragging(true)
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging) return
    const delta = e.clientY - startY.current
    setDragY(Math.max(0, startDragY.current + delta))
  }

  function handlePointerUp() {
    if (!dragging) return
    setDragging(false)
    if (dragY > DISMISS_THRESHOLD) onClose()
    else setDragY(0)
  }

  const backdropOpacity = 0.92 * Math.max(0.25, 1 - dragY / 400)

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: `rgba(0,0,0,${backdropOpacity})` }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute z-10 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center"
        style={{ top: 'calc(1rem + env(safe-area-inset-top))', right: '1rem' }}
        aria-label="Cerrar"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt={alt ?? ''}
        draggable={false}
        onDragStart={e => e.preventDefault()}
        onClick={e => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
          touchAction: 'none',
          maxWidth: '92vw',
          maxHeight: '85vh',
          objectFit: 'contain',
          borderRadius: 12,
        }}
      />
    </div>,
    document.body
  )
}
