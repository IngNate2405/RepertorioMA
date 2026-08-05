import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

/** Botón para el header de una pantalla de edición — sale sin guardar, vuelve a la pantalla anterior. */
export default function BackButton() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(-1)}
      className="w-9 h-9 rounded-full bg-s2 border border-br flex items-center justify-center text-t1"
      aria-label="Cancelar y volver"
    >
      <X size={18} />
    </button>
  )
}
